from functools import cached_property

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class AuthConfig(BaseSettings):
    userservice_url: str = "http://userservice"
    jwt_audience: str = "MyAppDevelopmentUsers"

    model_config = SettingsConfigDict(frozen=True, extra="allow", env_file=".env.example")


auth_config = AuthConfig()


class Config(BaseSettings):
    # App Settings
    debug: bool = False
    title: str = "Template Service"
    description: str = "Generative AI Workflow Template Management"
    environment: str = "development"

    # Engine Settings
    engine_base_url: str = "http://localhost:8188"

    # RabbitMQ
    rabbitmq_url: str = "amqp://guest:guest@localhost:5672/"

    # Database Settings
    postgres_dsn: str
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
    @classmethod
    def postgres_dsn_asyncpg_scheme(cls, value: str) -> str:
        if "+asyncpg" not in value:
            value = value.replace("postgresql://", "postgresql+asyncpg://", 1)
        if "prepared_statement_cache_size" not in value:
            separator = "&" if "?" in value else "?"
            value = f"{value}{separator}prepared_statement_cache_size=0"
        if "sslmode" in value:
            value = value.replace("sslmode", "ssl")
        return value


# Instantiate the config to be imported elsewhere
settings = Config()
