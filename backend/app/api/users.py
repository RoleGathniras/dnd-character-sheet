from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from app.deps import get_current_user, get_session, require_admin
from app.models import Character, Role, User
from app.security import hash_password

router = APIRouter(prefix="/users", tags=["users"])


class UserCreateRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=30)
    password: str = Field(..., min_length=8, max_length=128)
    role: Role = Role.player
    is_active: bool = True


class UserUpdateRequest(BaseModel):
    role: Role | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)
    is_active: bool | None = None


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
    _: User = Depends(require_admin),
):
    users = session.exec(select(User).order_by(User.id)).all()

    return [
        {
            "id": user.id,
            "username": user.username,
            "role": user.role,
            "is_active": user.is_active,
        }
        for user in users
    ]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreateRequest,
    session: Session = Depends(get_session),
    _: User = Depends(require_admin),
):
    existing = session.exec(
        select(User).where(User.username == payload.username)
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Username already exists")

    user = User(
        username=payload.username,
        password_hash=hash_password(payload.password),
        role=payload.role,
        is_active=payload.is_active,
    )

    session.add(user)
    session.commit()
    session.refresh(user)

    return {
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "is_active": user.is_active,
    }


@router.patch("/{user_id}")
def update_user(
    user_id: int,
    payload: UserUpdateRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin),
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == current_user.id:
        if payload.role is not None and payload.role != Role.admin:
            raise HTTPException(
                status_code=400,
                detail="You cannot remove your own admin role",
            )
        if payload.is_active is False:
            raise HTTPException(
                status_code=400,
                detail="You cannot deactivate your own account",
            )

    if payload.role is not None:
        user.role = payload.role

    if payload.password is not None:
        user.password_hash = hash_password(payload.password)

    if payload.is_active is not None:
        user.is_active = payload.is_active

    session.add(user)
    session.commit()
    session.refresh(user)

    return {
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "is_active": user.is_active,
    }


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin),
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")

    has_characters = session.exec(
        select(Character).where(Character.owner_id == user.id)
    ).first()

    if has_characters:
        raise HTTPException(
            status_code=400,
            detail="User still owns characters",
        )

    session.delete(user)
    session.commit()

    return {"ok": True}