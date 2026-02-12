from typing import Any, Dict, Optional
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Any


class CharacterCreate(BaseModel):
    name: str
    kind: str = "pc"
    data: Dict[str, Any] = {}


class CharacterUpdate(BaseModel):
    name: Optional[str] = None
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

