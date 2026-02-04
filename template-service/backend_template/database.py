import uuid
from typing import AsyncGenerator

from sqlalchemy import MetaData
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
    
)
from sqlalchemy.orm import DeclarativeBase
from asyncpg import Connection as AsyncPGConnection

# We will create this config file next
from backend_template.config import settings 

# 1. Naming Convention (Crucial for Alembic Migrations)
# This ensures that all constraints (PK, FK, Index) have a predictable name.
POSTGRES_NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}

# 2. The Bug Fix (AsyncConnection Wrapper)
# Solves a known issue where asyncpg prepared statements might collide.
class FixedAsyncConnection(AsyncPGConnection):
    def _get_unique_id(self, prefix: str) -> str:
        return f"__asyncpg_{prefix}_{uuid.uuid4()}__"

# 3. Modern Declarative Base
class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=POSTGRES_NAMING_CONVENTION)

# 4. The Engine
engine = create_async_engine(
    url=str(settings.postgres_dsn),
    echo=settings.postgres_echo, # Log SQL queries in Dev
    
    # Connection Arguments
    connect_args={
        "connection_class": FixedAsyncConnection, # Apply the fix
    },
    
    # Pool Settings (Optimized for Docker/Production)
    # pool_pre_ping: Checks if connection is alive before using it (prevents "server closed connection" errors)
    pool_pre_ping=True, 
    pool_size=10,
    max_overflow=20,
)

# 5. The Session Maker
# This is the factory that creates sessions for each request.
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False, # Standard for async: prevents lazy loading errors after commit
)

# 6. Dependency Injection Helper
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session
        