import pytest
from pydantic import ValidationError

from models.creation_args.base_ugc import BaseUgcArgs, MusicSettings, VoiceoverSettings, CaptionsSettings


def test_valid_minimal():
    args = BaseUgcArgs(format_type="base-ugc", media_files=["a.mp4"])
    assert args.remove_silence is False
    assert args.add_music is False


def test_media_files_cannot_be_empty():
    with pytest.raises(ValidationError):
        BaseUgcArgs(format_type="base-ugc", media_files=[])


def test_add_music_requires_settings():
    with pytest.raises(ValidationError, match="music_settings is required"):
        BaseUgcArgs(format_type="base-ugc", media_files=["a.mp4"], add_music=True)


def test_add_music_with_settings_ok():
    args = BaseUgcArgs(
        format_type="base-ugc",
        media_files=["a.mp4"],
        add_music=True,
        music_settings=MusicSettings(music_id="track.mp3", volume=0.5),
    )
    assert args.music_settings.volume == 0.5


def test_generate_voiceover_requires_settings():
    with pytest.raises(ValidationError, match="voiceover_settings is required"):
        BaseUgcArgs(format_type="base-ugc", media_files=["a.mp4"], generate_voiceover=True)


def test_add_captions_requires_settings():
    with pytest.raises(ValidationError, match="captions_settings is required"):
        BaseUgcArgs(format_type="base-ugc", media_files=["a.mp4"], add_captions=True)


def test_all_flags_with_settings_ok():
    args = BaseUgcArgs(
        format_type="base-ugc",
        media_files=["a.mp4", "b.mp4"],
        add_music=True,
        music_settings=MusicSettings(music_id="t.mp3", volume=0.3),
        generate_voiceover=True,
        voiceover_settings=VoiceoverSettings(voice_id="voice-123"),
        add_captions=True,
        captions_settings=CaptionsSettings(font="Arial", font_size=48),
    )
    assert len(args.media_files) == 2
