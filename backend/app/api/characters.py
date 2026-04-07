from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlmodel import Session, select

from app.deps import get_current_user, get_session
from app.models import Character, Role, User
from app.schemas import CharacterCreate, CharacterOut, CharacterUpdate

router = APIRouter(prefix="/characters", tags=["characters"])

MAX_PLAYER_PCS = 10

MAX_DM_PCS = 20
MAX_DM_NPCS = 50


def can_read_character(user: User, character: Character) -> bool:
    if user.role == Role.admin:
        return True
    if user.role == Role.dm:
        # DM: alle PCs sehen + eigene NPCs
        if character.kind == "pc":
            return True
        return character.owner_id is None or character.owner_id == user.id
    # player
    return character.owner_id == user.id


def can_write_character(user: User, character: Character) -> bool:
    if user.role == Role.admin:
        return True
    if user.role == Role.dm:
        # DM darf nur eigene NPCs ändern/löschen
        return character.kind != "pc" and character.owner_id == user.id
    # player
    return character.owner_id == user.id


@router.get("", response_model=list[CharacterOut])
def list_characters(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Character, User.username).join(
        User, Character.owner_id == User.id, isouter=True
    )

    if current_user.role == Role.admin:
        rows = session.exec(stmt).all()

    elif current_user.role == Role.dm:
        rows = session.exec(
            stmt.where(
                (Character.kind == "pc")
                | ((Character.kind != "pc") & (Character.owner_id == current_user.id))
            )
        ).all()

    else:
        rows = session.exec(stmt.where(Character.owner_id == current_user.id)).all()

    # rows: List[tuple[Character, Optional[str]]]
    return [
        CharacterOut(
            id=c.id,
            name=c.name,
            kind=c.kind,
            owner_id=c.owner_id,
            owner_username=username,
            data=c.data,
            updated_at=c.updated_at,
        )
        for (c, username) in rows
    ]


@router.post("")
def create_character(
    payload: CharacterCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    is_dm_or_admin = current_user.role in (Role.dm, Role.admin)

    # Nur DM/Admin dürfen NPCs anlegen
    if (not is_dm_or_admin) and payload.kind != "pc":
        raise HTTPException(status_code=403, detail="Only DM/Admin can create NPCs")

    limit = None

    if payload.kind == "pc":
        if current_user.role == Role.player:
            limit = MAX_PLAYER_PCS
        elif current_user.role == Role.dm:
            limit = MAX_DM_PCS

    elif payload.kind == "npc":
        if current_user.role == Role.dm:
            limit = MAX_DM_NPCS

    if limit is not None:
        existing_count = session.exec(
            select(func.count())
            .select_from(Character)
            .where(
                Character.owner_id == current_user.id,
                Character.kind == payload.kind,
            )
        ).one()

        if existing_count >= limit:
            kind_label = "NPCs" if payload.kind == "npc" else "Charaktere"
            raise HTTPException(
                status_code=400,
                detail=f"Du kannst maximal {limit} {kind_label} anlegen.",
            )

    character = Character(
        name=payload.name,
        kind=payload.kind,
        owner_id=current_user.id,
        data=payload.data,
    )
    session.add(character)
    session.commit()
    session.refresh(character)
    return character


@router.get("/{character_id}")
def get_character(
    character_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    character = session.get(Character, character_id)
    if not character or not can_read_character(current_user, character):
        # 404 auch bei "nicht erlaubt"
        raise HTTPException(status_code=404, detail="Character not found")

    return character


def utcnow():
    return datetime.now(timezone.utc)


@router.patch("/{character_id}")
def update_character(
    character_id: int,
    payload: CharacterUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    character = session.get(Character, character_id)
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")

    if not can_write_character(current_user, character):
        # 404 statt 403, damit keine IDs geleakt werden
        raise HTTPException(status_code=404, detail="Character not found")

    if payload.updated_at is not None:
        incoming = payload.updated_at
        if incoming.tzinfo is None:
            incoming = incoming.replace(tzinfo=timezone.utc)
        incoming = incoming.astimezone(timezone.utc)

        current = character.updated_at
        if current.tzinfo is None:
            current = current.replace(tzinfo=timezone.utc)
        current = current.astimezone(timezone.utc)

        # compare instants with tiny tolerance (1 microsecond)
        if abs((current - incoming).total_seconds()) > 1e-6:
            raise HTTPException(
                status_code=409,
                detail={
                    "message": "Character has been modified since you loaded it.",
                    "current_updated_at": current.isoformat(),
                    "incoming_updated_at": incoming.isoformat(),
                },
            )

    if payload.name is not None:
        character.name = payload.name
    if payload.data is not None:
        character.data = payload.data

    character.updated_at = utcnow()

    session.add(character)
    session.commit()
    session.refresh(character)
    return character


@router.delete("/{character_id}")
def delete_character(
    character_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    character = session.get(Character, character_id)
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")

    if not can_write_character(current_user, character):
        raise HTTPException(status_code=404, detail="Character not found")

    session.delete(character)
    session.commit()
    return {"deleted": True}
