from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select

from app.deps import get_current_user, get_session
from app.models import Role, User, Character

router = APIRouter(prefix="/users", tags=["users"])


class UserRoleUpdate(BaseModel):
    role: Role


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "role": current_user.role,
        "is_active": current_user.is_active,
    }


@router.get("")
def list_users(
        session: Session = Depends(get_session),
        current_user: User = Depends(get_current_user),
):
    # Admin-Check (minimal, noch kein eigener Guard)
    if current_user.role != Role.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin only",
        )

    users = session.exec(select(User).order_by(User.id)).all()

    return [
        {
            "id": u.id,
            "username": u.username,
            "role": u.role,
            "is_active": u.is_active,
        }
        for u in users
    ]


@router.patch("/{user_id}")
def update_user_role(
        user_id: int,
        payload: UserRoleUpdate,
        session: Session = Depends(get_session),
        current_user: User = Depends(get_current_user),
):
    if current_user.role != Role.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")

    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Sicherheitsgurt: Admin kann sich nicht selbst ent-adminen
    if user.id == current_user.id and payload.role != "admin":
        raise HTTPException(status_code=400, detail="You cannot change your own admin role")

    user.role = payload.role
    session.add(user)
    session.commit()
    session.refresh(user)

    return {"id": user.id, "username": user.username, "role": user.role}


@router.patch("/{user_id}/activate")
def activate_user(
        user_id: int,
        session: Session = Depends(get_session),
        current_user: User = Depends(get_current_user),
):
    if current_user.role != Role.admin:
        raise HTTPException(status_code=403, detail="Admin only")

    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = True
    session.add(user)
    session.commit()
    session.refresh(user)

    return {"id": user.id, "username": user.username, "role": user.role, "is_active": user.is_active}


@router.delete("/{user_id}")
def delete_user(
        user_id: int,
        session: Session = Depends(get_session),
        current_user: User = Depends(get_current_user),
):
    # Nur Admin darf löschen
    if current_user.role != Role.admin:
        raise HTTPException(status_code=403, detail="Admin only")

    # User laden
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Admin darf sich nicht selbst löschen
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Admin cannot delete itself")

    # Prüfen ob Characters existieren
    stmt = select(Character).where(Character.owner_id == user.id)
    has_characters = session.exec(stmt).first()

    if has_characters:
        raise HTTPException(
            status_code=400,
            detail="User still owns characters"
        )

    session.delete(user)
    session.commit()

    return {"ok": True}
