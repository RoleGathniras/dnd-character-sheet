from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.deps import get_current_user, get_session
from app.models import (
    Campaign,
    CampaignCharacter,
    Character,
    CharacterKind,
    Role,
    User,
)
from app.schemas import (
    CampaignCharacterOut,
    CampaignCreate,
    CampaignOut,
    CampaignUpdate,
)

router = APIRouter(prefix="/campaigns", tags=["campaigns"])


def build_campaign_out(
    campaign: Campaign,
    session: Session,
) -> CampaignOut:
    statement = (
        select(Character, User.username)
        .join(
            CampaignCharacter,
            CampaignCharacter.character_id == Character.id,
        )
        .join(
            User,
            Character.owner_id == User.id,
            isouter=True,
        )
        .where(CampaignCharacter.campaign_id == campaign.id)
        .order_by(Character.name)
    )

    rows = session.exec(statement).all()

    characters = [
        CampaignCharacterOut(
            id=character.id,
            name=character.name,
            owner_id=character.owner_id,
            owner_username=owner_username,
            data=character.data,
        )
        for character, owner_username in rows
    ]

    return CampaignOut(
        id=campaign.id,
        name=campaign.name,
        dm_id=campaign.dm_id,
        image_data_url=campaign.image_data_url,
        first_session_date=campaign.first_session_date,
        session_number=campaign.session_number,
        ingame_days=campaign.ingame_days,
        book_page=campaign.book_page,
        level_min=campaign.level_min,
        level_max=campaign.level_max,
        created_at=campaign.created_at,
        updated_at=campaign.updated_at,
        characters=characters,
    )


@router.post("", response_model=CampaignOut, status_code=status.HTTP_201_CREATED)
def create_campaign(
    payload: CampaignCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in (Role.dm, Role.admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only DM or Admin can create campaigns",
        )

    characters = []

    for character_id in payload.character_ids:
        character = session.get(Character, character_id)

        if character is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Character {character_id} not found",
            )

        if character.kind != CharacterKind.pc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Character {character_id} is not a player character",
            )

        characters.append(character)

    campaign = Campaign(
        name=payload.name,
        dm_id=current_user.id,
        image_data_url=payload.image_data_url,
    )

    session.add(campaign)
    session.commit()
    session.refresh(campaign)

    for character in characters:
        link = CampaignCharacter(
            campaign_id=campaign.id,
            character_id=character.id,
        )
        session.add(link)

    session.commit()

    return build_campaign_out(campaign, session)


@router.get("", response_model=list[CampaignOut])
def list_campaigns(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == Role.player:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only DM or Admin can access campaigns",
        )

    statement = select(Campaign)

    if current_user.role == Role.dm:
        statement = statement.where(Campaign.dm_id == current_user.id)

    statement = statement.order_by(Campaign.name)

    campaigns = session.exec(statement).all()

    return [build_campaign_out(campaign, session) for campaign in campaigns]


@router.get("/{campaign_id}", response_model=CampaignOut)
def get_campaign(
    campaign_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    campaign = session.get(Campaign, campaign_id)

    if campaign is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    if current_user.role != Role.admin and campaign.dm_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot access this campaign",
        )

    return build_campaign_out(campaign, session)


@router.patch("/{campaign_id}", response_model=CampaignOut)
def update_campaign(
    campaign_id: int,
    payload: CampaignUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    campaign = session.get(Campaign, campaign_id)

    if campaign is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    if current_user.role != Role.admin and campaign.dm_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot modify this campaign",
        )

    update_data = payload.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(campaign, field, value)

    session.add(campaign)
    session.commit()
    session.refresh(campaign)

    return build_campaign_out(campaign, session)


@router.post(
    "/{campaign_id}/characters/{character_id}",
    response_model=CampaignOut,
)
def add_character_to_campaign(
    campaign_id: int,
    character_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    campaign = session.get(Campaign, campaign_id)

    if campaign is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    if current_user.role != Role.admin and campaign.dm_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot modify this campaign",
        )

    character = session.get(Character, character_id)

    if character is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Character not found",
        )

    if character.kind != CharacterKind.pc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only player characters can be added to campaigns",
        )

    existing_link = session.get(
        CampaignCharacter,
        (campaign_id, character_id),
    )

    if existing_link is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Character is already part of this campaign",
        )

    link = CampaignCharacter(
        campaign_id=campaign_id,
        character_id=character_id,
    )

    session.add(link)
    session.commit()

    return build_campaign_out(campaign, session)


@router.delete(
    "/{campaign_id}/characters/{character_id}",
    response_model=CampaignOut,
)
def remove_character_from_campaign(
    campaign_id: int,
    character_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    campaign = session.get(Campaign, campaign_id)

    if campaign is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    if current_user.role != Role.admin and campaign.dm_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot modify this campaign",
        )

    link = session.get(
        CampaignCharacter,
        (campaign_id, character_id),
    )

    if link is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Character is not part of this campaign",
        )

    session.delete(link)
    session.commit()

    return build_campaign_out(campaign, session)
