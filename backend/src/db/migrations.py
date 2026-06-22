"""Lightweight, idempotent schema migrations run at startup.

SQLAlchemy's ``Base.metadata.create_all`` only creates *missing tables* — it
never ALTERs an existing one. So when we add a column to an existing model we
add it here too, additively and idempotently (``ADD COLUMN IF NOT EXISTS``), so
existing databases self-heal on the next restart without manual SQL.
"""

from sqlalchemy import text
from sqlalchemy.engine import Engine


# column name -> column DDL (type/constraints). All nullable so they're safe to
# add to a table that already has rows.
_USER_PROFILE_COLUMNS = {
    "department": "VARCHAR(255)",
    "city": "VARCHAR(255)",
    "state": "VARCHAR(255)",
    "country": "VARCHAR(255)",
}


def ensure_user_profile_columns(engine: Engine) -> None:
    """Add the onboarding profile columns to ``users`` if they're missing."""
    with engine.begin() as conn:
        for name, ddl in _USER_PROFILE_COLUMNS.items():
            conn.execute(
                text(f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {name} {ddl}")
            )
