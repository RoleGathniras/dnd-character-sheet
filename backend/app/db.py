import os

from sqlmodel import SQLModel, create_engine

from app import models  # noqa: F401

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set")

DB_ECHO = os.getenv("DB_ECHO", "false").lower() in ("1", "true", "yes", "on")

engine = create_engine(
    DATABASE_URL,
    echo=DB_ECHO,
    pool_pre_ping=True,
)


def init_db() -> None:
    SQLModel.metadata.create_all(engine)