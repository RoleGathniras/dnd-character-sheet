from datetime import datetime
from typing import Any, Dict, Optional, Literal

from pydantic import BaseModel, Field, ConfigDict


class CharacterCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    kind: Literal["pc", "npc"] = "pc"
    data: Dict[str, Any] = Field(default_factory=dict)


class CharacterUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=50)
    data: Optional[Dict[str, Any]] = None
    updated_at: Optional[datetime] = None


class CharacterOut(BaseModel):
    id: int
    name: str
    kind: str
    owner_id: Optional[int]
    owner_username: Optional[str]
    data: Dict[str, Any]
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=30)
    password: str = Field(..., min_length=8, max_length=128)