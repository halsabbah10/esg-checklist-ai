import os
import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from dotenv import load_dotenv
from sqlalchemy import engine_from_config, pool

# Load environment variables
load_dotenv()

# Add the parent directory to the path so we can import our app
sys.path.append(str(Path(__file__).parent.parent))

# Import our models to ensure they're registered with SQLModel
# These imports must come after path setup, hence we suppress the linting warning
# The imports are required for Alembic auto-generation even if they appear unused
# ruff: noqa: E402
from sqlmodel import SQLModel

from app.models import (  # noqa: F401
    AIResult,
    AnalyticsSnapshot,
    AuditLog,
    Checklist,
    ChecklistItem,
    Comment,
    ComplianceTracking,
    FileUpload,
    Notification,
    RealtimeEvent,
    Submission,
    SubmissionAnswer,
    SystemConfig,
    SystemMetrics,
    User,
    UserActivity,
)

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Set the database URL from environment variable if available
database_url = os.getenv("DATABASE_URL")
if database_url:
    config.set_main_option("sqlalchemy.url", database_url)

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
target_metadata = SQLModel.metadata


def include_name(name, type_, parent_names):
    """
    Filter function to include/exclude database objects from auto-generation.

    Args:
        name: The name of the object
        type_: The type of object (e.g., 'table', 'column', 'index')
        parent_names: The names of parent objects

    Returns:
        True if the object should be included, False otherwise
    """
    # Exclude SQLite-specific tables
    return not (type_ == "table" and name in ["sqlite_sequence"])


def include_object(object, name, type_, reflected, compare_to):
    """
    Filter function to include/exclude objects from auto-generation.
    Used for more advanced filtering than include_name.
    """
    # For SQLite, ignore server default changes on existing columns
    return not (type_ == "column" and hasattr(object, "default") and reflected)


# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    if not url:
        raise ValueError(
            "No database URL configured. Set DATABASE_URL environment variable "
            "or configure in alembic.ini"
        )

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,  # Enable type comparison for better detection
        compare_server_default=False,  # Disable server default comparison for SQLite compatibility
        include_name=include_name,  # Use custom filter function
        include_object=include_object,  # Use custom object filter function
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,  # Enable type comparison for better detection
            # Disable server default comparison for SQLite compatibility
            compare_server_default=False,
            include_name=include_name,  # Use custom filter function
            include_object=include_object,  # Use custom object filter function
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
