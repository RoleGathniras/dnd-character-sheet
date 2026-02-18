from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select

from app.deps import get_session
from app.models import User, Role
from app.security import verify_password, create_access_token, hash_password
from app.schemas import RegisterRequest

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/token")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session),
):
    user = session.exec(
        select(User).where(User.username == form_data.username)
    ).first()

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account pending admin approval",
        )

    token = create_access_token(subject=user.username)
    return {"access_token": token, "token_type": "bearer"}

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, session: Session = Depends(get_session)):
    existing = session.exec(select(User).where(User.username == payload.username)).first()
    if existing:
        raise HTTPException(status_code=409, detail="Username already exists")

    user = User(
        username=payload.username,
        password_hash=hash_password(payload.password),
        role=Role.player,
        is_active=False,
    )
    session.add(user)
    session.commit()
    return {"ok": True, "message": "Account created. Awaiting admin approval."}
