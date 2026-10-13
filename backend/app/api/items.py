from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from sqlalchemy import or_

from app.deps import get_current_user, get_session
from app.models import (
    ArmorDetails,
    ItemTemplate,
    User,
    WeaponDetails,
    utcnow,
)
from app.schemas import (
    ArmorDetailsInput,
    ItemTemplateCreate,
    ItemTemplateOut,
    WeaponDetailsInput,
    ItemArchiveUpdate,
)

router = APIRouter(prefix="/items", tags=["items"])


def build_item_out(
    template: ItemTemplate,
    session: Session,
) -> ItemTemplateOut:
    armor = session.get(ArmorDetails, template.id)
    weapon = session.get(WeaponDetails, template.id)

    return ItemTemplateOut(
        id=template.id,
        owner_id=template.owner_id,
        is_standard=template.is_standard,
        is_archived=template.is_archived,
        name=template.name,
        category=template.category,
        description=template.description,
        cost_amount=template.cost_amount,
        cost_currency=template.cost_currency,
        weight_lb=template.weight_lb,
        created_at=template.created_at,
        updated_at=template.updated_at,
        armor=(
            ArmorDetailsInput.model_validate(
                armor,
                from_attributes=True,
            )
            if armor is not None
            else None
        ),
        weapon=(
            WeaponDetailsInput.model_validate(
                weapon,
                from_attributes=True,
            )
            if weapon is not None
            else None
        ),
    )


@router.post(
    "",
    response_model=ItemTemplateOut,
    status_code=status.HTTP_201_CREATED,
)
def create_item(
    payload: ItemTemplateCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    template = ItemTemplate(
        **payload.model_dump(exclude={"armor", "weapon"}),
        owner_id=current_user.id,
        is_standard=False,
    )

    try:
        session.add(template)
        session.flush()

        if payload.armor is not None:
            session.add(
                ArmorDetails(
                    template_id=template.id,
                    **payload.armor.model_dump(),
                )
            )

        if payload.weapon is not None:
            session.add(
                WeaponDetails(
                    template_id=template.id,
                    **payload.weapon.model_dump(),
                )
            )

        session.commit()
    except Exception:
        session.rollback()
        raise

    session.refresh(template)
    return build_item_out(template, session)


@router.get("", response_model=list[ItemTemplateOut])
def list_items(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    statement = (
        select(ItemTemplate)
        .where(
            ItemTemplate.is_archived.is_(False),
            or_(
                ItemTemplate.is_standard.is_(True),
                ItemTemplate.owner_id == current_user.id,
            ),
        )
        .order_by(ItemTemplate.name, ItemTemplate.id)
    )

    templates = session.exec(statement).all()

    return [build_item_out(template, session) for template in templates]


@router.get("/{item_id}", response_model=ItemTemplateOut)
def get_item(
    item_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    template = session.get(ItemTemplate, item_id)

    if template is None or (
        not template.is_standard and template.owner_id != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gegenstandsvorlage nicht gefunden.",
        )

    return build_item_out(template, session)


@router.patch("/{item_id}/archive", response_model=ItemTemplateOut)
def update_item_archive(
    item_id: int,
    payload: ItemArchiveUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    template = session.get(ItemTemplate, item_id)

    if template is None or template.is_standard or template.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Eigene Gegenstandsvorlage nicht gefunden.",
        )

    template.is_archived = payload.is_archived
    template.updated_at = utcnow()

    try:
        session.add(template)
        session.commit()
    except Exception:
        session.rollback()
        raise

    session.refresh(template)
    return build_item_out(template, session)


@router.put("/{item_id}", response_model=ItemTemplateOut)
def update_item(
    item_id: int,
    payload: ItemTemplateCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    template = session.get(ItemTemplate, item_id)

    if template is None or template.is_standard or template.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Eigene Gegenstandsvorlage nicht gefunden.",
        )

    try:
        old_armor = session.get(ArmorDetails, item_id)
        old_weapon = session.get(WeaponDetails, item_id)

        if old_armor is not None:
            session.delete(old_armor)

        if old_weapon is not None:
            session.delete(old_weapon)

        session.flush()

        for field, value in payload.model_dump(
            exclude={"armor", "weapon"},
        ).items():
            setattr(template, field, value)

        template.updated_at = utcnow()
        session.add(template)

        if payload.armor is not None:
            session.add(
                ArmorDetails(
                    template_id=item_id,
                    **payload.armor.model_dump(),
                )
            )

        if payload.weapon is not None:
            session.add(
                WeaponDetails(
                    template_id=item_id,
                    **payload.weapon.model_dump(),
                )
            )

        session.commit()
    except Exception:
        session.rollback()
        raise

    session.refresh(template)
    return build_item_out(template, session)
