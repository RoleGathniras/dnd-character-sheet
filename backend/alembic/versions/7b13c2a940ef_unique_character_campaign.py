"""Allow each character to belong to only one campaign."""

from alembic import op

revision = "7b13c2a940ef"
down_revision = "192f043aefe6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_unique_constraint(
        "uq_campaign_characters_character_id",
        "campaign_characters",
        ["character_id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_campaign_characters_character_id",
        "campaign_characters",
        type_="unique",
    )
