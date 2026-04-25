import os
from unittest.mock import patch

import pytest
from moviepy import VideoFileClip

from editors.base_ugc.steps.add_captions import AddCaptionsStep
from editors.base_ugc.context import EditingContext
from models.creation_args.base_ugc import BaseUgcArgs, CaptionsSettings
from utils.editing_workspace import EditingWorkspace

OUTPUT_DIR = "/tmp/test_add_captions"

_SRT = (
    "1\n00:00:00,000 --> 00:00:01,500\nThis is the first caption.\n\n"
    "2\n00:00:01,500 --> 00:00:02,800\nThis is the last caption.\n"
)


@pytest.mark.integration
@patch("editors.base_ugc.steps.add_captions.transcribe", return_value=_SRT)
def test_add_captions_produces_video_with_same_duration(mock_transcribe, sample_video_with_audio):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    args = BaseUgcArgs(
        format_type="base-ugc",
        media_files=["f.mp4"],
        add_captions=True,
        captions_settings=CaptionsSettings(style_code="default"),
    )
    ctx = EditingContext(video_id="test", args=args, workspace=EditingWorkspace(OUTPUT_DIR))
    ctx.current_video_path = sample_video_with_audio
    ctx.intermediate_presigned_url = "https://example.com/presigned"

    AddCaptionsStep().execute(ctx)

    assert ctx.current_video_path != sample_video_with_audio
    assert os.path.exists(ctx.current_video_path)

    result = VideoFileClip(ctx.current_video_path)
    assert result.duration == pytest.approx(3.0, abs=0.3)
    assert result.size == [1080, 1920]
    result.close()


@pytest.mark.integration
@patch("editors.base_ugc.steps.add_captions.transcribe", return_value=_SRT)
def test_add_captions_writes_srt(mock_transcribe, make_context, sample_video_with_audio):
    args = BaseUgcArgs(
        format_type="base-ugc",
        media_files=["f.mp4"],
        add_captions=True,
        captions_settings=CaptionsSettings(style_code="bold"),
    )
    ctx = make_context(args)
    ctx.current_video_path = sample_video_with_audio
    ctx.intermediate_presigned_url = "https://example.com/presigned"

    AddCaptionsStep().execute(ctx)

    assert ctx.srt_path is not None
    assert os.path.exists(ctx.srt_path)
    content = open(ctx.srt_path).read()
    assert "last caption" in content
    assert content.endswith("\n")
