from __future__ import annotations

from enum import Enum
from typing import Optional, Any, Dict

from sqlmodel import SQLModel, Field
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB


class Role(str, Enum):
    player = "player"
    dm = "dm"


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    role: Role = Field(default=Role.player)


class Character(SQLModel, table=True):
    __tablename__ = "characters"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    owner_id: Optional[int] = Field(default=None, foreign_key="users.id")

    # JSONB korrekt als Postgres-Spalte
    data: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSONB))
