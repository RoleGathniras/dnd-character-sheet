from datetime import date, datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models import CharacterKind


class CharacterCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    kind: CharacterKind = CharacterKind.pc
    data: Dict[str, Any] = Field(default_factory=dict)


class CharacterUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=50)
    data: Optional[Dict[str, Any]] = None
    updated_at: Optional[datetime] = None


class CharacterOut(BaseModel):
    id: int
    name: str
    kind: CharacterKind
    owner_id: Optional[int]
    owner_username: Optional[str]
    data: Dict[str, Any]
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CampaignCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    character_ids: list[int] = Field(default_factory=list)


class CampaignCharacterOut(BaseModel):
    id: int
    name: str
    owner_id: Optional[int]
    owner_username: Optional[str] = None
    data: Dict[str, Any] = Field(default_factory=dict)


class CampaignOut(BaseModel):
    id: int
    name: str
    dm_id: int

    first_session_date: Optional[date] = None
    session_number: int = 0
    ingame_days: int = 0
    book_page: Optional[int] = None
    level_min: Optional[int] = None
    level_max: Optional[int] = None

    created_at: datetime
    updated_at: datetime
    characters: list[CampaignCharacterOut] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class CampaignUpdate(BaseModel):
    first_session_date: Optional[date] = None
    session_number: Optional[int] = Field(default=None, ge=0)
    ingame_days: Optional[int] = Field(default=None, ge=0)
    book_page: Optional[int] = Field(default=None, ge=1)
    level_min: Optional[int] = Field(default=None, ge=1, le=20)
    level_max: Optional[int] = Field(default=None, ge=1, le=20)
