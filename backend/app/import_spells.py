import json
from pathlib import Path

from sqlmodel import Session, select

from app.db import engine
from app.models import Spell

SPELLS_FILE = Path(__file__).parent / "data" / "spells.json"

def import_spells():
    with SPELLS_FILE.open("r", encoding="utf-8") as file:
        spells_data = json.load(file)

    with Session(engine) as session:
        for spell_data in spells_data:
            statement = select(Spell).where(
                Spell.name == spell_data["name"],
                Spell.level == spell_data["level"],
            )

            existing_spell = session.exec(statement).first()

            if existing_spell:
                existing_spell.school = spell_data["school"]
                existing_spell.time = spell_data["time"]
                existing_spell.range = spell_data["range"]
                existing_spell.components = spell_data["components"]
                existing_spell.material = spell_data["material"]
                existing_spell.duration = spell_data["duration"]
                existing_spell.concentration = spell_data["concentration"]
                existing_spell.ritual = spell_data["ritual"]
                existing_spell.hit = spell_data["hit"]
                existing_spell.kind = spell_data["kind"]
                existing_spell.effect = spell_data["effect"]
                existing_spell.desc = spell_data["desc"]

                session.add(existing_spell)
                print(f"Aktualisiert: {existing_spell.name}")
                continue

            spell = Spell(**spell_data)
            session.add(spell)
            print(f"Importiert: {spell.name}")

        session.commit()


if __name__ == "__main__":
    import_spells()