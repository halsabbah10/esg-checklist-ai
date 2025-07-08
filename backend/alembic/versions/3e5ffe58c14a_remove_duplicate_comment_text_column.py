"""Remove duplicate comment_text column

Revision ID: 3e5ffe58c14a
Revises: a22a6b91fb8b
Create Date: 2025-07-08 10:50:05.920582

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3e5ffe58c14a'
down_revision: Union[str, None] = 'a22a6b91fb8b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Remove duplicate comment_text column, keep only text column
    with op.batch_alter_table('comment', schema=None) as batch_op:
        batch_op.drop_column('comment_text')


def downgrade() -> None:
    # Re-add comment_text column if needed for rollback
    with op.batch_alter_table('comment', schema=None) as batch_op:
        batch_op.add_column(sa.Column('comment_text', sa.TEXT(), nullable=False))
