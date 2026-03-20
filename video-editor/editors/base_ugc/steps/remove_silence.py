import re
import subprocess

from moviepy import VideoFileClip, concatenate_videoclips

from editors.base_ugc.context import EditingContext
from editors.base_ugc.steps.base_step import PipelineStep

SILENCE_NOISE_DB = -35
SILENCE_MIN_DURATION = 0.5


class RemoveSilenceStep(PipelineStep):
    name = "Removing silence"

    def execute(self, ctx: EditingContext) -> None:
        input_path = ctx.current_video_path
        silence_intervals = _detect_silence(input_path)

        if not silence_intervals:
            return

        clip = VideoFileClip(input_path)
        non_silent = _invert_intervals(silence_intervals, clip.duration)

        if not non_silent:
            clip.close()
            return

        subclips = [clip.subclipped(start, end) for start, end in non_silent]
        output_path = ctx.workspace.get_temp_path("mp4")
        final = concatenate_videoclips(subclips)
        final.write_videofile(output_path, codec="libx264", audio_codec="aac", logger=None)

        clip.close()
        final.close()

        ctx.current_video_path = output_path


def _detect_silence(input_path: str) -> list[tuple[float, float]]:
    result = subprocess.run(
        [
            "ffmpeg", "-i", input_path,
            "-af", f"silencedetect=noise={SILENCE_NOISE_DB}dB:d={SILENCE_MIN_DURATION}",
            "-f", "null", "-",
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    output = result.stderr.decode()

    starts = [float(m) for m in re.findall(r"silence_start: ([\d.]+)", output)]
    ends = [float(m) for m in re.findall(r"silence_end: ([\d.]+)", output)]

    # If last silence has no end (silence extends to end of file)
    pairs = list(zip(starts, ends)) if len(ends) >= len(starts) else list(zip(starts, ends)) + [(starts[-1], float("inf"))]
    return pairs


def _invert_intervals(silences: list[tuple[float, float]], duration: float) -> list[tuple[float, float]]:
    non_silent = []
    cursor = 0.0
    for start, end in silences:
        if start > cursor + 0.01:
            non_silent.append((cursor, start))
        cursor = min(end, duration)
    if cursor < duration - 0.01:
        non_silent.append((cursor, duration))
    return non_silent
