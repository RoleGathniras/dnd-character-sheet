import os
from sqlmodel import Session, select

from app.db import engine
from app.models import User, Role
from app.security import hash_password  # ggf. heißt es bei dir anders


DEV_USERS = [
    ("admin", "admin", Role.admin),
    ("dm", "dm", Role.dm),
    ("player1", "player1", Role.player),
    ("player2", "player2", Role.player),
    ("player3", "player3", Role.player),
]


def seed_dev_users() -> int:
    """
    Legt Dev-User an, falls sie noch nicht existieren.
    Läuft nur, wenn SEED_ENABLED=true gesetzt ist.
    Idempotent: mehrfacher Start erstellt nichts doppelt.
    """
    enabled = os.getenv("SEED_ENABLED", "false").lower() in ("1", "true", "yes", "on")
    if not enabled:
        return 0

    created = 0

    with Session(engine) as session:
        for username, password, role in DEV_USERS:
            existing = session.exec(select(User).where(User.username == username)).first()
            if existing:
                continue

            user = User(
                username=username,
                password_hash=hash_password(password),
                role=role,
                is_active=True,  # <- wichtig, sonst evtl. kein Login möglich
            )
            session.add(user)
            created += 1

        if created:
            session.commit()

    return created