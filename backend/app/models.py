from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal
from enum import Enum
from typing import Any, Dict, Optional

from sqlalchemy import (
    CheckConstraint,
    Column,
    JSON,
    Numeric,
    UniqueConstraint,
)
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


class ItemCategory(str, Enum):
    armor = "armor"
    weapon = "weapon"
    other = "other"


class ArmorType(str, Enum):
    light = "light"
    medium = "medium"
    heavy = "heavy"
    shield = "shield"


class WeaponType(str, Enum):
    simple_melee = "simple_melee"
    simple_ranged = "simple_ranged"
    martial_melee = "martial_melee"
    martial_ranged = "martial_ranged"


class HandRequirement(str, Enum):
    one = "one"
    two = "two"
    versatile = "versatile"


class Currency(str, Enum):
    cp = "cp"
    sp = "sp"
    ep = "ep"
    gp = "gp"
    pp = "pp"


class Ability(str, Enum):
    str = "str"
    dex = "dex"
    con = "con"
    int = "int"
    wis = "wis"
    cha = "cha"


class EquipmentSlot(str, Enum):
    head = "head"
    body = "body"
    arms = "arms"
    legs = "legs"
    feet = "feet"
    back = "back"
    hand = "hand"


class ItemLocation(str, Enum):
    inventory = "inventory"
    private_storage = "private_storage"
    campaign_storage = "campaign_storage"


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
    image_data_url: Optional[str] = Field(default=None)

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
    __table_args__ = (
        UniqueConstraint(
            "character_id",
            name="uq_campaign_characters_character_id",
        ),
    )

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


class ItemTemplate(SQLModel, table=True):
    __tablename__ = "item_templates"

    __table_args__ = (
        CheckConstraint(
            "cost_amount >= 0",
            name="ck_item_templates_cost_nonnegative",
        ),
        CheckConstraint(
            "weight_lb >= 0",
            name="ck_item_templates_weight_nonnegative",
        ),
        CheckConstraint(
            "(is_standard = true AND owner_id IS NULL) OR "
            "(is_standard = false AND owner_id IS NOT NULL)",
            name="ck_item_templates_ownership",
        ),
    )

    id: Optional[int] = Field(default=None, primary_key=True)

    owner_id: Optional[int] = Field(
        default=None,
        foreign_key="users.id",
        index=True,
    )
    is_standard: bool = Field(default=False, nullable=False)
    is_archived: bool = Field(default=False, nullable=False)

    name: str = Field(max_length=100, index=True)
    category: ItemCategory = Field(index=True)
    description: str = Field(default="", max_length=5000)

    cost_amount: Decimal = Field(
        default=Decimal("0"),
        ge=0,
        sa_column=Column(Numeric(12, 2), nullable=False),
    )
    cost_currency: Currency = Field(default=Currency.gp)

    weight_lb: Decimal = Field(
        default=Decimal("0"),
        ge=0,
        sa_column=Column(Numeric(12, 3), nullable=False),
    )

    created_at: datetime = Field(default_factory=utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=utcnow, nullable=False)


class ArmorDetails(SQLModel, table=True):
    __tablename__ = "armor_details"

    __table_args__ = (
        CheckConstraint(
            "ac_value >= 0",
            name="ck_armor_details_ac_nonnegative",
        ),
        CheckConstraint(
            "modifier_cap IS NULL OR modifier_cap >= 0",
            name="ck_armor_details_modifier_cap",
        ),
        CheckConstraint(
            "strength_required IS NULL OR strength_required >= 0",
            name="ck_armor_details_strength",
        ),
        CheckConstraint(
            "modifier_cap IS NULL OR ac_modifier IS NOT NULL",
            name="ck_armor_details_cap_requires_modifier",
        ),
    )

    template_id: int = Field(
        foreign_key="item_templates.id",
        primary_key=True,
    )

    armor_type: ArmorType
    ac_value: int = Field(ge=0)
    ac_modifier: Optional[Ability] = Field(default=None)
    modifier_cap: Optional[int] = Field(default=None, ge=0)

    strength_required: Optional[int] = Field(default=None, ge=0)
    stealth_disadvantage: bool = Field(default=False)
    slot: EquipmentSlot = Field(default=EquipmentSlot.body)


class WeaponDetails(SQLModel, table=True):
    __tablename__ = "weapon_details"

    __table_args__ = (
        CheckConstraint(
            "range_normal IS NULL OR range_normal > 0",
            name="ck_weapon_details_range_normal",
        ),
        CheckConstraint(
            "range_long IS NULL OR "
            "(range_normal IS NOT NULL AND range_long >= range_normal)",
            name="ck_weapon_details_range_long",
        ),
    )

    template_id: int = Field(
        foreign_key="item_templates.id",
        primary_key=True,
    )

    weapon_type: WeaponType
    damage_dice: str = Field(max_length=30)
    damage_type: str = Field(max_length=50)

    hand_requirement: HandRequirement = Field(
        default=HandRequirement.one,
    )

    versatile_damage: Optional[str] = Field(
        default=None,
        max_length=30,
    )

    range_normal: Optional[Decimal] = Field(
        default=None,
        gt=0,
        sa_column=Column(Numeric(8, 1), nullable=True),
    )
    range_long: Optional[Decimal] = Field(
        default=None,
        gt=0,
        sa_column=Column(Numeric(8, 1), nullable=True),
    )

    properties: list[str] = Field(
        default_factory=list,
        sa_column=Column(JSON, nullable=False),
    )


class ItemInstance(SQLModel, table=True):
    __tablename__ = "item_instances"

    __table_args__ = (
        CheckConstraint(
            "quantity > 0",
            name="ck_item_instances_quantity_positive",
        ),
        CheckConstraint(
            "version > 0",
            name="ck_item_instances_version_positive",
        ),
        CheckConstraint(
            "("
            "location IN ('inventory', 'private_storage') "
            "AND character_id IS NOT NULL "
            "AND campaign_id IS NULL"
            ") OR ("
            "location = 'campaign_storage' "
            "AND character_id IS NULL "
            "AND campaign_id IS NOT NULL"
            ")",
            name="ck_item_instances_location",
        ),
        CheckConstraint(
            "equipped_hands IS NULL OR equipped_hands IN (1, 2)",
            name="ck_item_instances_equipped_hands",
        ),
        CheckConstraint(
            "equipped_hands IS NULL OR location = 'inventory'",
            name="ck_item_instances_equipped_inventory",
        ),
        CheckConstraint(
            "attack_slot IS NULL OR attack_slot BETWEEN 1 AND 5",
            name="ck_item_instances_attack_slot",
        ),
        CheckConstraint(
            "attack_slot IS NULL OR equipped_hands IS NOT NULL",
            name="ck_item_instances_attack_slot_equipped",
        ),
        UniqueConstraint(
            "character_id",
            "attack_slot",
            name="uq_item_instances_character_attack_slot",
        ),
    )

    id: Optional[int] = Field(default=None, primary_key=True)

    template_id: int = Field(
        foreign_key="item_templates.id",
        index=True,
    )

    snapshot: Dict[str, Any] = Field(
        sa_column=Column(JSON, nullable=False),
    )

    location: ItemLocation = Field(index=True)

    character_id: Optional[int] = Field(
        default=None,
        foreign_key="characters.id",
        index=True,
    )
    campaign_id: Optional[int] = Field(
        default=None,
        foreign_key="campaigns.id",
        index=True,
    )

    quantity: int = Field(default=1, ge=1)
    equipped_hands: Optional[int] = Field(default=None)
    attack_slot: Optional[int] = Field(default=None)
    version: int = Field(default=1, ge=1)

    created_at: datetime = Field(default_factory=utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=utcnow, nullable=False)
