from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    Response,
    status,
)
from sqlmodel import Session, select

from app.api.items import build_item_out
from app.deps import get_current_user, get_session
from app.models import (
    Character,
    ItemInstance,
    ItemLocation,
    ItemTemplate,
    Role,
    User,
    Campaign,
    CampaignCharacter,
    utcnow,
)
from app.schemas import (
    ItemInstanceCreate,
    ItemInstanceOut,
    ItemSnapshot,
    ItemPersonalMove,
    ItemCampaignDeposit,
    ItemCampaignWithdraw,
    ItemCampaignCreate,
)

from copy import deepcopy

router = APIRouter(
    prefix="/item-instances",
    tags=["item-instances"],
)


def can_read_character_items(
    character: Character,
    current_user: User,
    session: Session,
) -> bool:
    if current_user.role == Role.admin:
        return True

    if character.owner_id == current_user.id:
        return True

    if current_user.role != Role.dm:
        return False

    statement = (
        select(Campaign)
        .join(
            CampaignCharacter,
            CampaignCharacter.campaign_id == Campaign.id,
        )
        .where(
            CampaignCharacter.character_id == character.id,
            Campaign.dm_id == current_user.id,
        )
    )

    return session.exec(statement).first() is not None


def can_read_campaign_storage(
    campaign: Campaign,
    current_user: User,
    session: Session,
) -> bool:
    if current_user.role == Role.admin:
        return True

    if current_user.role == Role.dm and campaign.dm_id == current_user.id:
        return True

    statement = (
        select(CampaignCharacter)
        .join(
            Character,
            Character.id == CampaignCharacter.character_id,
        )
        .where(
            CampaignCharacter.campaign_id == campaign.id,
            Character.owner_id == current_user.id,
        )
    )

    return session.exec(statement).first() is not None


def transfer_item_quantity(
    session: Session,
    instance: ItemInstance,
    quantity: int | None,
    target_location: ItemLocation,
    target_character_id: int | None = None,
    target_campaign_id: int | None = None,
) -> ItemInstance:
    amount = instance.quantity if quantity is None else quantity

    if amount < 1 or amount > instance.quantity:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Die angeforderte Menge ist nicht verfügbar.",
        )

    same_location = (
        instance.location == target_location
        and instance.character_id == target_character_id
        and instance.campaign_id == target_campaign_id
    )

    if same_location:
        return instance

    now = utcnow()

    if amount == instance.quantity:
        instance.location = target_location
        instance.character_id = target_character_id
        instance.campaign_id = target_campaign_id
        instance.version += 1
        instance.updated_at = now

        session.add(instance)
        return instance

    instance.quantity -= amount
    instance.version += 1
    instance.updated_at = now
    session.add(instance)

    transferred = ItemInstance(
        template_id=instance.template_id,
        snapshot=deepcopy(instance.snapshot),
        location=target_location,
        character_id=target_character_id,
        campaign_id=target_campaign_id,
        quantity=amount,
        version=1,
        created_at=now,
        updated_at=now,
    )

    session.add(transferred)
    return transferred


@router.post(
    "",
    response_model=ItemInstanceOut,
    status_code=status.HTTP_201_CREATED,
)
def create_item_instance(
    payload: ItemInstanceCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    character = session.get(Character, payload.character_id)

    if character is None or (
        current_user.role != Role.admin and character.owner_id != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Charakter nicht gefunden.",
        )

    template = session.get(ItemTemplate, payload.template_id)

    if (
        template is None
        or template.is_archived
        or (not template.is_standard and template.owner_id != current_user.id)
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verfügbare Gegenstandsvorlage nicht gefunden.",
        )

    template_out = build_item_out(template, session)

    snapshot = ItemSnapshot.model_validate(
        template_out.model_dump(
            exclude={
                "id",
                "owner_id",
                "is_standard",
                "is_archived",
                "created_at",
                "updated_at",
            },
        )
    )

    instance = ItemInstance(
        template_id=template.id,
        snapshot=snapshot.model_dump(mode="json"),
        location=ItemLocation.inventory,
        character_id=character.id,
        campaign_id=None,
        quantity=payload.quantity,
        version=1,
    )

    try:
        session.add(instance)
        session.commit()
    except Exception:
        session.rollback()
        raise

    session.refresh(instance)
    return instance


@router.get(
    "/characters/{character_id}",
    response_model=list[ItemInstanceOut],
)
def list_character_inventory(
    character_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    character = session.get(Character, character_id)
    if character is None or not can_read_character_items(
        character,
        current_user,
        session,
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Charakter nicht gefunden.",
        )

    statement = (
        select(ItemInstance)
        .where(
            ItemInstance.character_id == character_id,
            ItemInstance.location == ItemLocation.inventory,
        )
        .order_by(ItemInstance.id)
    )

    return session.exec(statement).all()


@router.get(
    "/characters/{character_id}/private-storage",
    response_model=list[ItemInstanceOut],
)
def list_character_private_storage(
    character_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    character = session.get(Character, character_id)

    if character is None or not can_read_character_items(
        character,
        current_user,
        session,
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Charakter nicht gefunden.",
        )

    statement = (
        select(ItemInstance)
        .where(
            ItemInstance.character_id == character_id,
            ItemInstance.location == ItemLocation.private_storage,
        )
        .order_by(ItemInstance.id)
    )

    return session.exec(statement).all()


@router.patch(
    "/{instance_id}/personal-location",
    response_model=ItemInstanceOut,
)
def move_personal_item(
    instance_id: int,
    payload: ItemPersonalMove,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    try:
        instance = session.exec(
            select(ItemInstance).where(ItemInstance.id == instance_id).with_for_update()
        ).first()

        if instance is None or instance.location not in (
            ItemLocation.inventory,
            ItemLocation.private_storage,
        ):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Persönlicher Gegenstand nicht gefunden.",
            )

        character = session.get(Character, instance.character_id)

        if character is None or (
            current_user.role != Role.admin and character.owner_id != current_user.id
        ):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Persönlicher Gegenstand nicht gefunden.",
            )

        if instance.version != payload.expected_version:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=("Der Gegenstand wurde inzwischen geändert. Bitte neu laden."),
            )

        transferred = transfer_item_quantity(
            session=session,
            instance=instance,
            quantity=payload.quantity,
            target_location=payload.target_location,
            target_character_id=character.id,
        )

        session.commit()
    except Exception:
        session.rollback()
        raise

    session.refresh(transferred)
    return transferred


@router.get(
    "/campaigns/{campaign_id}/storage",
    response_model=list[ItemInstanceOut],
)
def list_campaign_storage(
    campaign_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    campaign = session.get(Campaign, campaign_id)

    if campaign is None or not can_read_campaign_storage(
        campaign,
        current_user,
        session,
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kampagnentruhe nicht gefunden.",
        )

    statement = (
        select(ItemInstance)
        .where(
            ItemInstance.campaign_id == campaign_id,
            ItemInstance.location == ItemLocation.campaign_storage,
        )
        .order_by(ItemInstance.id)
    )

    return session.exec(statement).all()


@router.post(
    "/{instance_id}/deposit",
    response_model=ItemInstanceOut,
)
def deposit_campaign_item(
    instance_id: int,
    payload: ItemCampaignDeposit,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    try:
        instance = session.exec(
            select(ItemInstance).where(ItemInstance.id == instance_id).with_for_update()
        ).first()

        if instance is None or instance.location != ItemLocation.inventory:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Gegenstand im Inventar nicht gefunden.",
            )

        character = session.get(Character, instance.character_id)

        if character is None or (
            current_user.role != Role.admin and character.owner_id != current_user.id
        ):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Gegenstand im Inventar nicht gefunden.",
            )

        membership = session.exec(
            select(CampaignCharacter)
            .where(
                CampaignCharacter.character_id == character.id,
                CampaignCharacter.campaign_id == payload.campaign_id,
            )
            .with_for_update()
        ).first()

        if membership is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Kampagnentruhe für diesen Charakter nicht gefunden.",
            )

        if instance.version != payload.expected_version:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=("Der Gegenstand wurde inzwischen geändert. Bitte neu laden."),
            )

        transferred = transfer_item_quantity(
            session=session,
            instance=instance,
            quantity=payload.quantity,
            target_location=ItemLocation.campaign_storage,
            target_campaign_id=payload.campaign_id,
        )
        session.commit()
    except Exception:
        session.rollback()
        raise

    session.refresh(transferred)
    return transferred


@router.post(
    "/{instance_id}/withdraw",
    response_model=ItemInstanceOut,
)
def withdraw_campaign_item(
    instance_id: int,
    payload: ItemCampaignWithdraw,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    try:
        instance = session.exec(
            select(ItemInstance).where(ItemInstance.id == instance_id).with_for_update()
        ).first()

        if instance is None or instance.location != ItemLocation.campaign_storage:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Gegenstand in der Kampagnentruhe nicht gefunden.",
            )

        character = session.get(Character, payload.character_id)

        if character is None or (
            current_user.role != Role.admin and character.owner_id != current_user.id
        ):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Zielcharakter nicht gefunden.",
            )

        membership = session.exec(
            select(CampaignCharacter)
            .where(
                CampaignCharacter.character_id == character.id,
                CampaignCharacter.campaign_id == instance.campaign_id,
            )
            .with_for_update()
        ).first()

        if membership is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Kampagnentruhe für diesen Charakter nicht gefunden.",
            )

        if instance.version != payload.expected_version:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=("Der Gegenstand wurde inzwischen geändert. Bitte neu laden."),
            )

        transferred = transfer_item_quantity(
            session=session,
            instance=instance,
            quantity=payload.quantity,
            target_location=ItemLocation.inventory,
            target_character_id=character.id,
        )
        session.commit()
    except Exception:
        session.rollback()
        raise

    session.refresh(transferred)
    return transferred


@router.post(
    "/campaign-storage",
    response_model=ItemInstanceOut,
    status_code=status.HTTP_201_CREATED,
)
def create_campaign_item(
    payload: ItemCampaignCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    campaign = session.get(Campaign, payload.campaign_id)

    if campaign is None or not (
        current_user.role == Role.admin
        or (current_user.role == Role.dm and campaign.dm_id == current_user.id)
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verwaltbare Kampagnentruhe nicht gefunden.",
        )

    template = session.get(ItemTemplate, payload.template_id)

    if (
        template is None
        or template.is_archived
        or (not template.is_standard and template.owner_id != current_user.id)
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verfügbare Gegenstandsvorlage nicht gefunden.",
        )

    template_out = build_item_out(template, session)

    snapshot = ItemSnapshot.model_validate(
        template_out.model_dump(
            exclude={
                "id",
                "owner_id",
                "is_standard",
                "is_archived",
                "created_at",
                "updated_at",
            },
        )
    )

    instance = ItemInstance(
        template_id=template.id,
        snapshot=snapshot.model_dump(mode="json"),
        location=ItemLocation.campaign_storage,
        character_id=None,
        campaign_id=campaign.id,
        quantity=payload.quantity,
        version=1,
    )

    try:
        session.add(instance)
        session.commit()
    except Exception:
        session.rollback()
        raise

    session.refresh(instance)
    return instance


@router.delete(
    "/{instance_id}/campaign-storage",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
def delete_campaign_item(
    instance_id: int,
    expected_version: int = Query(ge=1),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    try:
        instance = session.exec(
            select(ItemInstance).where(ItemInstance.id == instance_id).with_for_update()
        ).first()

        if instance is None or instance.location != ItemLocation.campaign_storage:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Verwaltbarer Truhengegenstand nicht gefunden.",
            )

        campaign = session.get(Campaign, instance.campaign_id)

        if campaign is None or not (
            current_user.role == Role.admin
            or (current_user.role == Role.dm and campaign.dm_id == current_user.id)
        ):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Verwaltbarer Truhengegenstand nicht gefunden.",
            )

        if instance.version != expected_version:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=("Der Gegenstand wurde inzwischen geändert. Bitte neu laden."),
            )

        session.delete(instance)
        session.commit()
    except Exception:
        session.rollback()
        raise

    return Response(status_code=status.HTTP_204_NO_CONTENT)
