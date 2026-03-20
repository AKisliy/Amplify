import numpy as np
import pytest
from moviepy import AudioArrayClip, ColorClip

from editors.base_ugc.context import EditingContext
from models.creation_args.base_ugc import BaseUgcArgs
from utils.editing_workspace import EditingWorkspace


# --- Synthetic media fixtures (generated once per session) ---

@pytest.fixture(scope="session")
def sample_video(tmp_path_factory) -> str:
    """3-second solid-color 1080x1920 video, no audio."""
    path = str(tmp_path_factory.mktemp("fixtures") / "sample.mp4")
    clip = ColorClip(size=(1080, 1920), color=(30, 144, 255), duration=3)
    clip.write_videofile(path, fps=30, codec="libx264", audio=False, logger=None)
    clip.close()
    return path


@pytest.fixture(scope="session")
def sample_video_with_audio(tmp_path_factory) -> str:
    """3-second video with 440 Hz sine wave audio."""
    path = str(tmp_path_factory.mktemp("fixtures") / "sample_audio.mp4")
    sample_rate = 44100
    duration = 3
    t = np.linspace(0, duration, duration * sample_rate)
    samples = (np.sin(2 * np.pi * 440 * t)).reshape(-1, 1)
    audio = AudioArrayClip(np.hstack([samples, samples]), fps=sample_rate).with_duration(duration)
    clip = ColorClip(size=(1080, 1920), color=(255, 100, 50), duration=duration).with_audio(audio)
    clip.write_videofile(path, fps=30, codec="libx264", audio_codec="aac", logger=None)
    clip.close()
    return path


@pytest.fixture(scope="session")
def sample_audio(tmp_path_factory) -> str:
    """10-second 440 Hz sine wave mp3 (longer than test videos to avoid duration edge cases)."""
    path = str(tmp_path_factory.mktemp("fixtures") / "sample.mp3")
    sample_rate = 44100
    duration = 10
    t = np.linspace(0, duration, duration * sample_rate)
    samples = (np.sin(2 * np.pi * 440 * t)).reshape(-1, 1)
    audio = AudioArrayClip(np.hstack([samples, samples]), fps=sample_rate).with_duration(duration)
    audio.write_audiofile(path, logger=None)
    audio.close()
    return path


# --- EditingContext factory ---

@pytest.fixture
def make_context(tmp_path):
    """Returns a factory that builds an EditingContext with a real temp workspace."""
    def _make(args: BaseUgcArgs, video_id: str = "test-video-id") -> EditingContext:
        workspace = EditingWorkspace(str(tmp_path))
        return EditingContext(video_id=video_id, args=args, workspace=workspace)
    return _make


@pytest.fixture
def base_ugc_args() -> BaseUgcArgs:
    return BaseUgcArgs(format_type="base-ugc", media_files=["file1.mp4"])
