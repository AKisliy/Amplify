from functools import cached_property

from pydantic import PostgresDsn, field_validator, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Config(BaseSettings):
    # App Settings
    debug: bool = False
    title: str = "Template Service"
    description: str = "Generative AI Workflow Template Management"
    environment: str = "development"

    # Database Settings
    # validation_alias reads "DATABASE_URL" from your .env file
    postgres_dsn: PostgresDsn = None
    postgres_echo: bool = False

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
    def postgres_dsn_asyncpg_scheme(cls, value: PostgresDsn) -> PostgresDsn:
        query = value.query
        if query is None:
            query = "prepared_statement_cache_size=0"
        return PostgresDsn.build(
            scheme="postgresql+asyncpg",
            hosts=value.hosts(),
            path=value.path.replace("/", ""),
            query=query,
            fragment=value.fragment,
        )


# Instantiate the config to be imported elsewhere
settings = Config()