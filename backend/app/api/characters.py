from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.models import Character, User
from app.deps import get_current_user, get_session
from app.models import Character, User, Role
from app.schemas import CharacterCreate, CharacterUpdate
from datetime import datetime, timezone

router = APIRouter(prefix="/characters", tags=["characters"])


def ensure_owner_or_dm(character: Character, user: User):
    if user.role == Role.dm:
        return
    if character.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not allowed")


@router.get("")
def list_characters(
        session: Session = Depends(get_session),
        current_user: User = Depends(get_current_user),
):
    if current_user.role == Role.dm:
        return session.exec(select(Character)).all()

    return session.exec(
        select(Character).where(Character.owner_id == current_user.id)
    ).all()


@router.post("")
def create_character(
        payload: CharacterCreate,
        session: Session = Depends(get_session),
        current_user: User = Depends(get_current_user),
):
    # Player darf nur PC für sich selbst anlegen
    if current_user.role != Role.dm and payload.kind != "pc":
        raise HTTPException(status_code=403, detail="Only DM can create NPCs")

    owner_id = current_user.id if payload.kind == "pc" else None

    character = Character(
        name=payload.name,
        kind=payload.kind,
        owner_id=owner_id,
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
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")

    ensure_owner_or_dm(character, current_user)
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

    ensure_owner_or_dm(character, current_user)

    # --- Optimistic locking (soft) ---
    if payload.updated_at is not None:
        # normalize both to aware UTC if needed
        current = character.updated_at
        incoming = payload.updated_at
        # If incoming is naive, treat it as UTC (frontend will send ISO; usually with Z)
        if incoming.tzinfo is None:
            incoming = incoming.replace(tzinfo=timezone.utc)

        if current != incoming:
            raise HTTPException(
                status_code=409,
                detail={
                    "message": "Character has been modified since you loaded it.",
                    "current_updated_at": character.updated_at.isoformat(),
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

    ensure_owner_or_dm(character, current_user)

    session.delete(character)
    session.commit()
    return {"deleted": True}
