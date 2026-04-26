"""add_missing_indexes

Revision ID: a1b2c3d4e5f6
Revises: 40d126059597
Create Date: 2026-04-26 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '40d126059597'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index('ix_resumes_owner_id', 'resumes', ['owner_id'])
    op.create_index('ix_resumes_created_at', 'resumes', ['created_at'])
    op.create_index('ix_resume_analyses_resume_id', 'resume_analyses', ['resume_id'])


def downgrade() -> None:
    op.drop_index('ix_resume_analyses_resume_id', table_name='resume_analyses')
    op.drop_index('ix_resumes_created_at', table_name='resumes')
    op.drop_index('ix_resumes_owner_id', table_name='resumes')
