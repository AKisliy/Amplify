import pytest

from editors.base_ugc.editor import BaseUgcEditor
from editors.classic_ai_ugc import ClassicAiUgcEditor
from editors.luxury_edit_ffmpeg import LuxuryEditFfmpeg
from factory.editor_factory import EditorFactory
from models.creation_args.ai_ugc import AiUgcArgs
from models.creation_args.base_ugc import BaseUgcArgs
from models.creation_args.luxury_edit import LuxuryEditArgs


@pytest.fixture
def factory():
    return EditorFactory()


def test_dispatches_base_ugc(factory):
    args = BaseUgcArgs(format_type="base-ugc", media_files=["f.mp4"])
    assert isinstance(factory.get_editor(args), BaseUgcEditor)


def test_dispatches_ai_ugc(factory):
    args = AiUgcArgs(
        format_type="ai-ugc",
        hook_path="h", broll_path="b", voiceover_path="v",
        hook_srt_path="hs", voiceover_srt_path="vs", output_path="o",
    )
    assert isinstance(factory.get_editor(args), ClassicAiUgcEditor)


def test_dispatches_luxury_edit(factory):
    args = LuxuryEditArgs(
        format_type="luxury-edit",
        fragments_path=["f"], audio_path="a",
        scene_changes=[1.0], caption="c",
        original_duration=5.0, output_path="o",
    )
    assert isinstance(factory.get_editor(args), LuxuryEditFfmpeg)
