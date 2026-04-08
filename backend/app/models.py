from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, Optional

from sqlalchemy import Column, JSON
from sqlmodel import Field, SQLModel


class Role(str, Enum):
    player = "player"
    dm = "dm"
    admin = "admin"


class CharacterKind(str, Enum):
    pc = "pc"
    npc = "npc"


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True, max_length=30)
    password_hash: str
    role: Role = Field(default=Role.player)
    is_active: bool = Field(default=True)


class Character(SQLModel, table=True):
    __tablename__ = "characters"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=50)
    owner_id: Optional[int] = Field(default=None, foreign_key="users.id")
    kind: CharacterKind = Field(default=CharacterKind.pc)
    data: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    updated_at: datetime = Field(default_factory=utcnow, nullable=False)