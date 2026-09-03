from fastapi import APIRouter
from sqlmodel import Session, select

from app.db import engine
from app.models import Spell


router = APIRouter(prefix="/spells", tags=["spells"])


@router.get("")
def get_spells(level: int):
    with Session(engine) as session:
        statement = select(Spell).where(Spell.level == level)
        spells = session.exec(statement).all()

        return spells