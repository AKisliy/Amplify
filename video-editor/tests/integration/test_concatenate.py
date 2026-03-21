import os
import pytest
from moviepy import VideoFileClip

from editors.base_ugc.steps.concatenate import ConcatenateStep
from models.creation_args.base_ugc import BaseUgcArgs


@pytest.mark.integration
def test_concatenate_two_clips(make_context, sample_video):
    args = BaseUgcArgs(format_type="base-ugc", media_files=["f1.mp4", "f2.mp4"])
    ctx = make_context(args)
    ctx.media_urls = [sample_video, sample_video]

    ConcatenateStep().execute(ctx)

    assert ctx.current_video_path is not None
    assert os.path.exists(ctx.current_video_path)

    result = VideoFileClip(ctx.current_video_path)
    assert result.duration == pytest.approx(6.0, abs=0.5)  # 2x 3s clips
    assert result.size == [1080, 1920]
    result.close()


@pytest.mark.integration
def test_concatenate_single_clip(make_context, sample_video):
    args = BaseUgcArgs(format_type="base-ugc", media_files=["f.mp4"])
    ctx = make_context(args)
    ctx.media_urls = [sample_video]

    ConcatenateStep().execute(ctx)

    result = VideoFileClip(ctx.current_video_path)
    assert result.duration == pytest.approx(3.0, abs=0.3)
    result.close()
