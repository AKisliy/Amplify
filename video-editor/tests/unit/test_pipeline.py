from unittest.mock import MagicMock, call, patch

import pytest

from editors.base_ugc.context import EditingContext
from editors.base_ugc.pipeline import EditingPipeline
from editors.base_ugc.steps.base_step import PipelineStep
from models.creation_args.base_ugc import BaseUgcArgs
from utils.editing_workspace import EditingWorkspace


def _make_step(name: str) -> PipelineStep:
    step = MagicMock(spec=PipelineStep)
    step.name = name
    return step


def _make_context(tmp_path) -> EditingContext:
    args = BaseUgcArgs(format_type="base-ugc", media_files=["f.mp4"])
    workspace = EditingWorkspace(str(tmp_path))
    ctx = EditingContext(video_id="vid-1", args=args, workspace=workspace)
    ctx.output_path = "s3://result.mp4"
    return ctx


def test_pipeline_runs_steps_in_order(tmp_path):
    order = []
    step_a = _make_step("StepA")
    step_b = _make_step("StepB")
    step_a.execute.side_effect = lambda ctx: order.append("A")
    step_b.execute.side_effect = lambda ctx: order.append("B")

    on_step = MagicMock()
    pipeline = EditingPipeline([step_a, step_b], on_step)
    pipeline.run(_make_context(tmp_path))

    assert order == ["A", "B"]


def test_pipeline_emits_in_progress_then_completed(tmp_path):
    step = _make_step("Merging")
    on_step = MagicMock()

    pipeline = EditingPipeline([step], on_step)
    pipeline.run(_make_context(tmp_path))

    assert on_step.call_args_list == [
        call("Merging", "in_progress", None),
        call("Merging", "completed", None),
    ]


def test_pipeline_emits_failed_and_reraises(tmp_path):
    step = _make_step("Merging")
    step.execute.side_effect = RuntimeError("ffmpeg crashed")
    on_step = MagicMock()

    pipeline = EditingPipeline([step], on_step)

    with pytest.raises(RuntimeError, match="ffmpeg crashed"):
        pipeline.run(_make_context(tmp_path))

    on_step.assert_any_call("Merging", "failed", "ffmpeg crashed")


def test_pipeline_stops_on_first_failure(tmp_path):
    step_a = _make_step("StepA")
    step_b = _make_step("StepB")
    step_a.execute.side_effect = RuntimeError("boom")
    on_step = MagicMock()

    pipeline = EditingPipeline([step_a, step_b], on_step)

    with pytest.raises(RuntimeError):
        pipeline.run(_make_context(tmp_path))

    step_b.execute.assert_not_called()


def test_pipeline_raises_if_output_path_not_set(tmp_path):
    step = _make_step("Noop")
    args = BaseUgcArgs(format_type="base-ugc", media_files=["f.mp4"])
    workspace = EditingWorkspace(str(tmp_path))
    ctx = EditingContext(video_id="vid-1", args=args, workspace=workspace)
    # output_path intentionally left None

    pipeline = EditingPipeline([step], MagicMock())

    with pytest.raises(RuntimeError, match="output_path was not set"):
        pipeline.run(ctx)
