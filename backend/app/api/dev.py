from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from app.deps import get_session
from app.models import User, Role
from app.security import hash_password

router = APIRouter(prefix="/dev", tags=["dev"])


class CreateUserRequest(BaseModel):
    username: str
    password: str
    role: Role = Role.player


@router.post("/users")
def create_user(payload: CreateUserRequest, session: Session = Depends(get_session)):
    existing = session.exec(select(User).where(User.username == payload.username)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")

    user = User(
        username=payload.username,
        password_hash=hash_password(payload.password),
        role=payload.role,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return {"id": user.id, "username": user.username, "role": user.role}
