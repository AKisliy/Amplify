from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

from backend_template.config import settings
from backend_template.database import Base
from backend_template.models import * # 2. Alembic Config Object

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.

def update_configs():
    # не охота было ради одних миграций в конфиг добавлять другой тип подключения
    url = str(settings.postgres_dsn).replace("+asyncpg", "").replace("?prepared_statement_cache_size=0", "")
    if not url:
        raise RuntimeError("Invalid POSTGRES DSN in migrations")
    config.set_main_option("sqlalchemy.url", url)


def run_migrations_online():
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            version_table_schema=target_metadata.schema,
            compare_server_default=True,
            compare_type=True,
            include_schemas=True,
        )

        with context.begin_transaction():
            if target_metadata.schema:
                context.execute(f'SET search_path TO "{target_metadata.schema}"')
            context.run_migrations()


update_configs()

run_migrations_online()
