import os
from sqlmodel import SQLModel, create_engine

# sorgt dafür, dass SQLModel die Tabellen "kennt"
from app import models  # noqa: F401

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL, echo=True)


def init_db() -> None:
    SQLModel.metadata.create_all(engine)
