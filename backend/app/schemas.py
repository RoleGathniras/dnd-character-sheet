from datetime import datetime
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