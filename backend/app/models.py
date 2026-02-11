from __future__ import annotations
from typing import Literal
from enum import Enum
from typing import Optional, Any, Dict
from sqlmodel import SQLModel, Field
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime, timezone


class Role(str, Enum):
    player = "player"
    dm = "dm"


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    password_hash: str
    role: Role = Field(default=Role.player)


def utcnow():
    return datetime.now(timezone.utc)

class Character(SQLModel, table=True):
    __tablename__ = "characters"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    owner_id: Optional[int] = Field(default=None, foreign_key="users.id")
    kind: str = Field(default="pc")
    data: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSONB))

    updated_at: datetime = Field(default_factory=utcnow, nullable=False)
