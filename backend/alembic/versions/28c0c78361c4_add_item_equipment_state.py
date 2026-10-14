"""add item equipment state

Revision ID: 28c0c78361c4
Revises: da07349cd474
Create Date: 2026-10-14 12:52:33.025697

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "28c0c78361c4"
down_revision: Union[str, Sequence[str], None] = "da07349cd474"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "item_instances",
        sa.Column("equipped_hands", sa.Integer(), nullable=True),
    )

    op.create_check_constraint(
        "ck_item_instances_equipped_hands",
        "item_instances",
        "equipped_hands IS NULL OR equipped_hands IN (1, 2)",
    )

    op.create_check_constraint(
        "ck_item_instances_equipped_inventory",
        "item_instances",
        "equipped_hands IS NULL OR location = 'inventory'",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_item_instances_equipped_inventory",
        "item_instances",
        type_="check",
    )

    op.drop_constraint(
        "ck_item_instances_equipped_hands",
        "item_instances",
        type_="check",
    )

    op.drop_column("item_instances", "equipped_hands")
