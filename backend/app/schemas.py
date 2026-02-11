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