from pydantic_settings import BaseSettings, SettingsConfigDict

class ConfigBase(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

class GeminiConfig(ConfigBase):
    service_account_key_file: str
    project_id: str
    location: str

class MediaIngestConfig(ConfigBase):
    media_ingest_url: str = "https://staging.alexeykiselev.tech/media/api"

gemini_config = GeminiConfig()
media_ingest_config = MediaIngestConfig()
