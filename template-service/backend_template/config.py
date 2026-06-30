from functools import cached_property

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class AuthConfig(BaseSettings):
    userservice_url: str = "http://userservice"
    jwt_audience: str = "MyAppDevelopmentUsers"

    model_config = SettingsConfigDict(frozen=True, extra="allow", env_file=".env.example")


auth_config = AuthConfig()


class ActivityConfig(BaseSettings):
    """Config for Temporal activities (API credentials, service URLs)."""

    # LiteLLM proxy
    litellm_base_url: str = "http://litellm:4000"
    litellm_api_key: str = ""

    # Gemini / Vertex AI
    gemini_project_id: str = ""
    gemini_location: str = "us-central1"
    gemini_storage_uri: str = ""
    rai_fallback_video_uuid: str = ""

    # Media Ingest service
    media_ingest_url: str = "http://media-ingest"

    # Video Editor service
    video_editor_url: str = "http://video-editor"

    # Langfuse
    langfuse_secret_key: str = ""
    langfuse_public_key: str = ""
    langfuse_host: str = "https://cloud.langfuse.com"

    model_config = SettingsConfigDict(frozen=True, extra="allow", env_file=".env.example")


activity_config = ActivityConfig()


class Config(BaseSettings):
    # App Settings
    debug: bool = False
    title: str = "Template Service"
    description: str = "Generative AI Workflow Template Management"
    environment: str = "development"

    # Engine Settings (legacy ComfyUI — kept for reference during migration)
    engine_base_url: str = "http://localhost:8188"

    # Temporal
    temporal_host: str = "localhost:7233"
    temporal_task_queue: str = "template-execution"

    # Node result cache
    cache_enabled: bool = True

    # Frontend
    frontend_base_url: str = "https://app.alexeykiselev.tech"

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
