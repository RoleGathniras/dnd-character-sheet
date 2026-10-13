from datetime import date, datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models import (
    Ability,
    ArmorType,
    CharacterKind,
    EquipmentSlot,
    HandRequirement,
    WeaponType,
    Currency,
    ItemCategory,
    ItemLocation,
)
from decimal import Decimal


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
    image_data_url: Optional[str] = None


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
    image_data_url: Optional[str] = None

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
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    image_data_url: Optional[str] = None

    first_session_date: Optional[date] = None
    session_number: Optional[int] = Field(default=None, ge=0)
    ingame_days: Optional[int] = Field(default=None, ge=0)
    book_page: Optional[int] = Field(default=None, ge=1)
    level_min: Optional[int] = Field(default=None, ge=1, le=20)
    level_max: Optional[int] = Field(default=None, ge=1, le=20)


class ArmorDetailsInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    armor_type: ArmorType
    ac_value: int = Field(ge=0)
    ac_modifier: Optional[Ability] = None
    modifier_cap: Optional[int] = Field(default=None, ge=0)

    strength_required: Optional[int] = Field(default=None, ge=0)
    stealth_disadvantage: bool = False
    slot: EquipmentSlot = EquipmentSlot.body

    @model_validator(mode="after")
    def validate_modifier_cap(self):
        if self.modifier_cap is not None and self.ac_modifier is None:
            raise ValueError(
                "Eine Modifikator-Obergrenze benötigt einen Attributmodifikator."
            )

        return self


class WeaponDetailsInput(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
    )

    weapon_type: WeaponType

    damage_dice: str = Field(
        min_length=1,
        max_length=30,
        pattern=r"^[1-9]\d*d[1-9]\d*$",
    )
    damage_type: str = Field(min_length=1, max_length=50)

    hand_requirement: HandRequirement = HandRequirement.one

    versatile_damage: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=30,
        pattern=r"^[1-9]\d*d[1-9]\d*$",
    )

    range_normal: Optional[int] = Field(default=None, gt=0)
    range_long: Optional[int] = Field(default=None, gt=0)

    properties: list[str] = Field(default_factory=list, max_length=30)

    @model_validator(mode="after")
    def validate_weapon_details(self):
        if self.range_long is not None:
            if self.range_normal is None:
                raise ValueError(
                    "Eine lange Reichweite benötigt eine normale Reichweite."
                )

            if self.range_long < self.range_normal:
                raise ValueError(
                    "Die lange Reichweite darf nicht kleiner "
                    "als die normale Reichweite sein."
                )

        if self.hand_requirement == HandRequirement.versatile:
            if self.versatile_damage is None:
                raise ValueError(
                    "Eine vielseitige Waffe benötigt einen "
                    "Schadenswert für beidhändige Nutzung."
                )
        elif self.versatile_damage is not None:
            raise ValueError(
                "Beidhändiger Zusatzschaden ist nur für vielseitige Waffen vorgesehen."
            )

        cleaned_properties = []

        for property_name in self.properties:
            property_name = property_name.strip()

            if not property_name or len(property_name) > 50:
                raise ValueError(
                    "Waffeneigenschaften müssen zwischen 1 und 50 Zeichen lang sein."
                )

            if property_name not in cleaned_properties:
                cleaned_properties.append(property_name)

        self.properties = cleaned_properties
        return self


class ItemTemplateCreate(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
    )

    name: str = Field(min_length=1, max_length=100)
    category: ItemCategory
    description: str = Field(default="", max_length=5000)

    cost_amount: Decimal = Field(
        default=Decimal("0"),
        ge=0,
        max_digits=12,
        decimal_places=2,
    )
    cost_currency: Currency = Currency.gp

    weight_lb: Decimal = Field(
        default=Decimal("0"),
        ge=0,
        max_digits=12,
        decimal_places=3,
    )

    armor: Optional[ArmorDetailsInput] = None
    weapon: Optional[WeaponDetailsInput] = None

    @model_validator(mode="after")
    def validate_category_details(self):
        if self.category == ItemCategory.armor:
            if self.armor is None or self.weapon is not None:
                raise ValueError(
                    "Rüstungen benötigen Rüstungsdetails "
                    "und dürfen keine Waffendetails enthalten."
                )

        elif self.category == ItemCategory.weapon:
            if self.weapon is None or self.armor is not None:
                raise ValueError(
                    "Waffen benötigen Waffendetails "
                    "und dürfen keine Rüstungsdetails enthalten."
                )

        elif self.armor is not None or self.weapon is not None:
            raise ValueError(
                "Sonstige Gegenstände dürfen keine "
                "Rüstungs- oder Waffendetails enthalten."
            )

        return self


class ItemTemplateOut(ItemTemplateCreate):
    id: int
    owner_id: Optional[int]
    is_standard: bool
    is_archived: bool
    created_at: datetime
    updated_at: datetime


class ItemArchiveUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    is_archived: bool = Field(strict=True)


class ItemInstanceCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    template_id: int = Field(gt=0)
    character_id: int = Field(gt=0)
    quantity: int = Field(default=1, ge=1, le=9999)


class ItemSnapshot(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    category: ItemCategory
    description: str = ""

    cost_amount: Decimal
    cost_currency: Currency
    weight_lb: Decimal

    armor: Optional[ArmorDetailsInput] = None
    weapon: Optional[WeaponDetailsInput] = None


class ItemInstanceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    template_id: int
    snapshot: ItemSnapshot

    location: ItemLocation
    character_id: Optional[int]
    campaign_id: Optional[int]

    quantity: int
    version: int

    created_at: datetime
    updated_at: datetime


class ItemPersonalMove(BaseModel):
    model_config = ConfigDict(extra="forbid")

    target_location: ItemLocation
    expected_version: int = Field(ge=1)
    quantity: Optional[int] = Field(default=None, ge=1, le=9999)

    @model_validator(mode="after")
    def validate_target_location(self):
        if self.target_location not in (
            ItemLocation.inventory,
            ItemLocation.private_storage,
        ):
            raise ValueError("Als Ziel sind nur Inventar und private Truhe erlaubt.")

        return self


class ItemCampaignDeposit(BaseModel):
    model_config = ConfigDict(extra="forbid")

    campaign_id: int = Field(gt=0)
    expected_version: int = Field(ge=1)
    quantity: Optional[int] = Field(default=None, ge=1, le=9999)


class ItemCampaignWithdraw(BaseModel):
    model_config = ConfigDict(extra="forbid")

    character_id: int = Field(gt=0)
    expected_version: int = Field(ge=1)
    quantity: Optional[int] = Field(default=None, ge=1, le=9999)


class ItemCampaignCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    template_id: int = Field(gt=0)
    campaign_id: int = Field(gt=0)
    quantity: int = Field(default=1, ge=1, le=9999)
