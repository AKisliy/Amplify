import os
import pytest
from moviepy import VideoFileClip

from editors.base_ugc.steps.remove_silence import RemoveSilenceStep, _detect_silence, _invert_intervals
from models.creation_args.base_ugc import BaseUgcArgs


# --- Unit-style tests for helper functions ---

def test_invert_intervals_basic():
    silences = [(1.0, 2.0), (4.0, 5.0)]
    result = _invert_intervals(silences, duration=6.0)
    assert result == [(0.0, 1.0), (2.0, 4.0), (5.0, 6.0)]


def test_invert_intervals_no_silence():
    result = _invert_intervals([], duration=5.0)
    assert result == [(0.0, 5.0)]


def test_invert_intervals_silence_at_start():
    result = _invert_intervals([(0.0, 1.5)], duration=5.0)
    assert result == [(1.5, 5.0)]


def test_invert_intervals_silence_at_end():
    result = _invert_intervals([(4.0, 5.0)], duration=5.0)
    assert result == [(0.0, 4.0)]


# --- Integration tests ---

@pytest.mark.integration
def test_remove_silence_passes_through_video_without_silence(make_context, sample_video_with_audio):
    """Video with continuous audio should pass through unchanged."""
    args = BaseUgcArgs(format_type="base-ugc", media_files=["f.mp4"], remove_silence=True)
    ctx = make_context(args)
    ctx.current_video_path = sample_video_with_audio

    RemoveSilenceStep().execute(ctx)

    assert os.path.exists(ctx.current_video_path)
    result = VideoFileClip(ctx.current_video_path)
    assert result.duration > 0
    result.close()
