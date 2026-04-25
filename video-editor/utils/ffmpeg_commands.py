from typing import Dict, List, Optional

TARGET_WIDTH = 1080
TARGET_HEIGHT = 1920
TARGET_FPS = 30

_SCALE_PAD = (
    f"scale={TARGET_WIDTH}:{TARGET_HEIGHT}:force_original_aspect_ratio=decrease,"
    f"pad={TARGET_WIDTH}:{TARGET_HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=black,"
    f"setsar=1,fps={TARGET_FPS}"
)


def build_normalize_concat_command(
    input_paths: List[str],
    output_path: str,
    trim_decisions: Optional[Dict[str, "TrimDecision"]] = None,  # keyed by media_id
    media_ids: Optional[List[str]] = None,
) -> List[str]:
    """Normalize, optionally trim, and concatenate clips in a single ffmpeg pass.

    Each clip is scaled/padded to TARGET resolution and fps.  If trim_decisions
    contains an entry for a clip's media_id the video and audio streams are
    trimmed before the scale filter.  All clips are then concatenated with the
    concat filter and encoded once to H.264/AAC.
    """
    n = len(input_paths)
    trim_decisions = trim_decisions or {}
    media_ids = media_ids or [None] * n  # type: ignore[list-item]

    cmd = ["ffmpeg", "-y"]
    for path in input_paths:
        cmd += ["-i", path]

    filter_parts: List[str] = []
    for i, media_id in enumerate(media_ids):
        decision = trim_decisions.get(media_id) if media_id else None

        if decision is not None:
            ts = decision.trim_start
            te = decision.trim_end
            filter_parts.append(
                f"[{i}:v]trim=start={ts}:end={te},setpts=PTS-STARTPTS,{_SCALE_PAD}[v{i}];"
                f"[{i}:a]atrim=start={ts}:end={te},asetpts=PTS-STARTPTS[a{i}]"
            )
        else:
            filter_parts.append(
                f"[{i}:v]{_SCALE_PAD}[v{i}];"
                f"[{i}:a]anull[a{i}]"
            )

    concat_inputs = "".join(f"[v{i}][a{i}]" for i in range(n))
    filter_parts.append(f"{concat_inputs}concat=n={n}:v=1:a=1[v][a]")

    cmd += ["-filter_complex", ";".join(filter_parts)]
    cmd += ["-map", "[v]", "-map", "[a]"]
    cmd += ["-c:v", "libx264", "-c:a", "aac", "-r", str(TARGET_FPS)]
    cmd += [output_path]
    return cmd
