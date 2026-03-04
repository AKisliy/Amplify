from pydantic_settings import BaseSettings, SettingsConfigDict

class ConfigBase(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

class GeminiConfig(ConfigBase):
    gemini_api_key: str        

gemini_config = GeminiConfig()
