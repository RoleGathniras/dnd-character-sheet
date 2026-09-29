from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, Optional
from datetime import date, datetime, timezone
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

class Campaign(SQLModel, table=True):
    __tablename__ = "campaigns"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=100)
    dm_id: int = Field(foreign_key="users.id")

    first_session_date: Optional[date] = Field(default=None)
    session_number: int = Field(default=0)
    ingame_days: int = Field(default=0)
    book_page: Optional[int] = Field(default=None)
    level_min: Optional[int] = Field(default=None)
    level_max: Optional[int] = Field(default=None)

    created_at: datetime = Field(default_factory=utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=utcnow, nullable=False)

class CampaignCharacter(SQLModel, table=True):
    __tablename__ = "campaign_characters"

    campaign_id: int = Field(
        foreign_key="campaigns.id",
        primary_key=True,
    )

    character_id: int = Field(
        foreign_key="characters.id",
        primary_key=True,
    )

class Spell(SQLModel, table=True):
    __tablename__ = "spells"

    id: Optional[int] = Field(default=None, primary_key=True)

    name: str = Field(index=True, max_length=80)
    level: int = Field(index=True, ge=0, le=9)
    school: str = Field(max_length=50)

    time: str = Field(max_length=200)
    range: str = Field(max_length=500)

    components: str = Field(max_length=50)
    material: str = Field(default="", max_length=2000)
    duration: str = Field(max_length=100)

    concentration: bool = Field(default=False)
    ritual: bool = Field(default=False)

    hit: str = Field(default="", max_length=150)
    kind: str = Field(default="", max_length=50)
    effect: str = Field(default="", max_length=750)

    desc: str = Field(default="", max_length=10000)
