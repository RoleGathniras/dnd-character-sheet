from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlmodel import Session, select

from app.deps import get_current_user, get_session
from app.models import Character, CharacterKind, Role, User
from app.schemas import CharacterCreate, CharacterOut, CharacterUpdate

router = APIRouter(prefix="/characters", tags=["characters"])

MAX_PLAYER_PCS = 10
MAX_DM_PCS = 20
MAX_DM_NPCS = 50


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def can_read_character(user: User, character: Character) -> bool:
    if user.role == Role.admin:
        return True

    if user.role == Role.dm:
        if character.kind == CharacterKind.pc:
            return True
        return character.owner_id == user.id

    return character.owner_id == user.id


def can_write_character(user: User, character: Character) -> bool:
    if user.role == Role.admin:
        return True

    if user.role == Role.dm:
        return character.kind == CharacterKind.npc and character.owner_id == user.id

    return character.kind == CharacterKind.pc and character.owner_id == user.id


def build_character_out(character: Character, owner_username: str | None = None) -> CharacterOut:
    return CharacterOut(
        id=character.id,
        name=character.name,
        kind=character.kind,
        owner_id=character.owner_id,
        owner_username=owner_username,
        data=character.data,
        updated_at=character.updated_at,
    )


@router.get("", response_model=list[CharacterOut])
def list_characters(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Character, User.username).join(
        User, Character.owner_id == User.id, isouter=True
    )

    if current_user.role == Role.admin:
        rows = session.exec(stmt.order_by(Character.id)).all()

    elif current_user.role == Role.dm:
        rows = session.exec(
            stmt.where(
                (Character.kind == CharacterKind.pc)
                | (
                    (Character.kind == CharacterKind.npc)
                    & (Character.owner_id == current_user.id)
                )
            ).order_by(Character.id)
        ).all()

    else:
        rows = session.exec(
            stmt.where(Character.owner_id == current_user.id).order_by(Character.id)
        ).all()

    return [
        build_character_out(character, owner_username=username)
        for character, username in rows
    ]


@router.post("", response_model=CharacterOut, status_code=status.HTTP_201_CREATED)
def create_character(
    payload: CharacterCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == Role.player and payload.kind != CharacterKind.pc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only DM or Admin can create NPCs",
        )

    limit = None

    if payload.kind == CharacterKind.pc:
        if current_user.role == Role.player:
            limit = MAX_PLAYER_PCS
        elif current_user.role == Role.dm:
            limit = MAX_DM_PCS
    elif payload.kind == CharacterKind.npc:
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
            kind_label = "NPCs" if payload.kind == CharacterKind.npc else "Charaktere"
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Du kannst maximal {limit} {kind_label} anlegen.",
            )

    character = Character(
        name=payload.name,
        kind=payload.kind,
        owner_id=current_user.id,
        data=payload.data,
        updated_at=utcnow(),
    )

    session.add(character)
    session.commit()
    session.refresh(character)

    return build_character_out(character)


@router.get("/{character_id}", response_model=CharacterOut)
def get_character(
    character_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    character = session.get(Character, character_id)
    if character is None or not can_read_character(current_user, character):
        raise HTTPException(status_code=404, detail="Character not found")

    owner_username = None
    if character.owner_id is not None:
        owner = session.get(User, character.owner_id)
        owner_username = owner.username if owner else None

    return build_character_out(character, owner_username=owner_username)


@router.patch("/{character_id}", response_model=CharacterOut)
def update_character(
    character_id: int,
    payload: CharacterUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    character = session.get(Character, character_id)
    if character is None or not can_write_character(current_user, character):
        raise HTTPException(status_code=404, detail="Character not found")

    if payload.updated_at is not None:
        incoming = payload.updated_at
        if incoming.tzinfo is None:
            incoming = incoming.replace(tzinfo=timezone.utc)
        else:
            incoming = incoming.astimezone(timezone.utc)

        current = character.updated_at
        if current.tzinfo is None:
            current = current.replace(tzinfo=timezone.utc)
        else:
            current = current.astimezone(timezone.utc)

        if current != incoming:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
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

    owner_username = None
    if character.owner_id is not None:
        owner = session.get(User, character.owner_id)
        owner_username = owner.username if owner else None

    return build_character_out(character, owner_username=owner_username)


@router.delete("/{character_id}")
def delete_character(
    character_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    character = session.get(Character, character_id)
    if character is None or not can_write_character(current_user, character):
        raise HTTPException(status_code=404, detail="Character not found")

    session.delete(character)
    session.commit()

    return {"deleted": True}