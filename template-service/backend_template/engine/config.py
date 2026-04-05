from pydantic_settings import BaseSettings, SettingsConfigDict

class ConfigBase(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

class GeminiConfig(ConfigBase):
    service_account_key_file: str
    project_id: str
    location: str
    storage_uri: str

class MediaIngestConfig(ConfigBase):
    media_ingest_url: str = "http://localhost:5070/media/api"

class EngineConfig(ConfigBase):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore", env_prefix="ENGINE_")
    listen: str = "127.0.0.1"
    port: int = 8188
    verbose: bool = True              
    temp_directory: str | None = None  
    log_level: str = "INFO"            
    log_stdout: bool = False           
    # Cache strategy for the prompt executor.
    cache_type: str = "none"           

class RabbitMqConfig(ConfigBase):
    rabbitmq_url: str = "amqp://guest:guest@localhost:5672/"


gemini_config = GeminiConfig()
media_ingest_config = MediaIngestConfig()
engine_config = EngineConfig()
rabbitmq_config = RabbitMqConfig()