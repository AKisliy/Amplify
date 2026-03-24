from typing import List, Literal, Optional
from pydantic import Field, model_validator

from models.broker_model import BrokerModel


class CaptionsSettings(BrokerModel):
    font: str
    font_size: int


class VoiceoverSettings(BrokerModel):
    voice_id: str


class MusicSettings(BrokerModel):
    music_id: str
    volume: float


class BaseUgcArgs(BrokerModel):
    format_type: Literal["base-ugc"]
    media_files: List[str] = Field(min_length=1)
    remove_silence: bool = False
    generate_voiceover: bool = False
    voiceover_settings: Optional[VoiceoverSettings] = None
    add_captions: bool = False
    captions_settings: Optional[CaptionsSettings] = None
    add_music: bool = False
    music_settings: Optional[MusicSettings] = None

    @model_validator(mode="after")
    def validate_optional_settings(self) -> "BaseUgcArgs":
        if self.generate_voiceover and self.voiceover_settings is None:
            raise ValueError("voiceover_settings is required when generate_voiceover=True")
        if self.add_captions and self.captions_settings is None:
            raise ValueError("captions_settings is required when add_captions=True")
        if self.add_music and self.music_settings is None:
            raise ValueError("music_settings is required when add_music=True")
        return self
