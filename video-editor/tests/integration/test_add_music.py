import os
from unittest.mock import patch, MagicMock

import pytest
from moviepy import VideoFileClip

from editors.base_ugc.steps.add_music import AddMusicStep
from models.creation_args.base_ugc import BaseUgcArgs, MusicSettings


def _make_args(volume: float = 0.5) -> BaseUgcArgs:
    return BaseUgcArgs(
        format_type="base-ugc",
        media_files=["f.mp4"],
        add_music=True,
        music_settings=MusicSettings(music_id="track.mp3", volume=volume),
    )


@pytest.mark.integration
def test_add_music_produces_output(make_context, sample_video_with_audio, sample_audio):
    args = _make_args(volume=0.4)
    ctx = make_context(args)
    ctx.current_video_path = sample_video_with_audio

    # Mock S3 download to copy sample_audio instead
    def fake_download(bucket, key, local_path):
        import shutil
        shutil.copy(sample_audio, local_path)

    mock_client = MagicMock()
    mock_client.download_file.side_effect = fake_download

    with patch("editors.base_ugc.steps.add_music.get_s3_client", return_value=mock_client):
        AddMusicStep().execute(ctx)

    assert ctx.current_video_path is not None
    assert os.path.exists(ctx.current_video_path)

    result = VideoFileClip(ctx.current_video_path)
    assert result.audio is not None
    assert result.duration == pytest.approx(3.0, abs=0.5)
    result.close()


@pytest.mark.integration
def test_add_music_to_video_without_audio(make_context, sample_video, sample_audio):
    """Video without audio track should get music overlaid."""
    args = _make_args(volume=1.0)
    ctx = make_context(args)
    ctx.current_video_path = sample_video

    def fake_download(bucket, key, local_path):
        import shutil
        shutil.copy(sample_audio, local_path)

    mock_client = MagicMock()
    mock_client.download_file.side_effect = fake_download

    with patch("editors.base_ugc.steps.add_music.get_s3_client", return_value=mock_client):
        AddMusicStep().execute(ctx)

    result = VideoFileClip(ctx.current_video_path)
    assert result.audio is not None
    result.close()
