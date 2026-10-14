"""assign equipped weapons to attack cards

Revision ID: 96256e57a92f
Revises: 28c0c78361c4
Create Date: 2026-10-14 13:45:39.283912

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "96256e57a92f"
down_revision: Union[str, Sequence[str], None] = "28c0c78361c4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "item_instances",
        sa.Column("attack_slot", sa.Integer(), nullable=True),
    )

    op.create_check_constraint(
        "ck_item_instances_attack_slot",
        "item_instances",
        "attack_slot IS NULL OR attack_slot BETWEEN 1 AND 5",
    )

    op.create_check_constraint(
        "ck_item_instances_attack_slot_equipped",
        "item_instances",
        "attack_slot IS NULL OR equipped_hands IS NOT NULL",
    )

    op.create_unique_constraint(
        "uq_item_instances_character_attack_slot",
        "item_instances",
        ["character_id", "attack_slot"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_item_instances_character_attack_slot",
        "item_instances",
        type_="unique",
    )

    op.drop_constraint(
        "ck_item_instances_attack_slot_equipped",
        "item_instances",
        type_="check",
    )

    op.drop_constraint(
        "ck_item_instances_attack_slot",
        "item_instances",
        type_="check",
    )

    op.drop_column("item_instances", "attack_slot")
