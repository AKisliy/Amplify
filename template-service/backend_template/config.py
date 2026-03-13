from functools import cached_property

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Config(BaseSettings):
    # App Settings
    debug: bool = False
    title: str = "Template Service"
    description: str = "Generative AI Workflow Template Management"
    environment: str = "development"

    # Database Settings
    postgres_dsn: str
    postgres_echo: bool = False

    # Routing
    root_path: str = ""

    # Sentry (Optional Error Tracking)
    sentry_dsn: str | None = None

    # Pydantic Configuration
    # extra="allow" lets you have other things in .env without crashing
    model_config = SettingsConfigDict(frozen=True, extra="allow", env_file=".env.example")

    @cached_property
    def log_level(self) -> str:
        """
        Calculates log level based on debug flag.
        Returns 'DEBUG' if debug=True, else 'INFO'.
        """
        return "DEBUG" if self.debug else "INFO"

    @field_validator("postgres_dsn")
    @classmethod
    def postgres_dsn_asyncpg_scheme(cls, value: str) -> str:
        if "+asyncpg" not in value:
            value = value.replace("postgresql://", "postgresql+asyncpg://", 1)
        if "prepared_statement_cache_size" not in value:
            separator = "&" if "?" in value else "?"
            value = f"{value}{separator}prepared_statement_cache_size=0"
        return value


# Instantiate the config to be imported elsewhere
settings = Config()
