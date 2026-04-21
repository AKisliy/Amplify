import logging
import re
from datetime import datetime, timezone
from typing import Any

from comfy_api.latest import IO, ComfyExtension
from typing_extensions import override

logger = logging.getLogger(__name__)

class TextSplitNode(IO.ComfyNode):
    """
    Splits a string by a delimiter into a list for downstream auto-batching.
    Used for splitting generated scenes into individual segments.

    Outputs:
      segments — the split text items (auto-batched downstream)
      indices  — parallel list [0, 1, 2, …] in lockstep with segments;
                 wire to ShotIDNode.shot_index so each batch iteration
                 receives the correct shot number automatically.
      count    — scalar total number of segments
    """

    @classmethod
    def define_schema(cls):
        return IO.Schema(
            node_id="TextSplitNode",
            display_name="Text Split",
            category="util",
            description=(
                "Split text by a delimiter. Outputs segments list for auto-batching, "
                "a parallel indices list (0, 1, 2, …) for shot numbering, "
                "and a scalar count."
            ),
            inputs=[
                IO.String.Input(
                    "text",
                    force_input=True,
                    tooltip="Text to split",
                ),
                IO.String.Input(
                    "delimiter",
                    default="*",
                    tooltip="Split delimiter",
                ),
            ],
            outputs=[
                IO.String.Output(
                    display_name="segments",
                    is_output_list=True,
                    tooltip="Split text segments — auto-batched downstream.",
                ),
                IO.Int.Output(
                    display_name="indices",
                    is_output_list=True,
                    tooltip="Zero-based index for each segment [0, 1, 2, …]. "
                            "Wire to ShotIDNode.shot_index for automatic shot numbering.",
                ),
                IO.Int.Output(
                    display_name="count",
                    tooltip="Total number of segments produced.",
                ),
            ],
        )

    @classmethod
    async def execute(cls, text: str, delimiter: str = "*") -> IO.NodeOutput:
        logger.info("[TextSplitNode] Splitting text by %r", delimiter)
        if not text:
            segments = []
        else:
            segments = [s.strip() for s in text.split(delimiter) if s.strip()]

        count = len(segments)
        indices = list(range(count))
        logger.info("[TextSplitNode] %d segments produced", count)

        return IO.NodeOutput(segments, indices, count)

class TextJoinNode(IO.ComfyNode):
    """
    Joins a list of strings or integers into a single string for previewing list outputs.
    Both inputs are optional — connect whichever list you want to inspect.
    If both are connected, integers are appended after texts.
    """

    @classmethod
    def define_schema(cls):
        return IO.Schema(
            node_id="TextJoinNode",
            display_name="Text Join",
            category="util",
            description=(
                "Join a list of strings or integers into a single string for previewing. "
                "Connect a string list, an integer list, or both."
            ),
            is_input_list=True,
            inputs=[
                IO.String.Input(
                    "texts",
                    force_input=True,
                    optional=True,
                    tooltip="Optional list of strings to join (e.g. segments from GeminiNode)",
                ),
                IO.Int.Input(
                    "integers",
                    force_input=True,
                    optional=True,
                    tooltip="Optional list of integers to join (e.g. duration_seconds from GeminiNode)",
                ),
                IO.String.Input(
                    "separator",
                    default="\\n---\\n",
                    tooltip="String used to separate the joined items",
                ),
            ],
            outputs=[
                IO.String.Output(
                    display_name="joined_text"
                ),
            ],
        )

    @classmethod
    async def execute(
        cls,
        separator: list[str],
        texts: list[str] | None = None,
        integers: list[int] | None = None,
    ) -> IO.NodeOutput:
        sep = separator[0] if separator else "\n---\n"
        sep_str = sep.replace("\\n", "\n")

        items: list[str] = []
        if texts:
            items.extend(str(t) for t in texts)
        if integers:
            items.extend(str(i) for i in integers)

        joined = sep_str.join(items) if items else "(no input connected)"
        return IO.NodeOutput(joined, ui={"text": [joined]})


class DummyListNode(IO.ComfyNode):
    """Outputs a hardcoded list of sample segments for testing ListSelectorNode."""

    @classmethod
    def define_schema(cls):
        return IO.Schema(
            node_id="DummyListNode",
            display_name="Dummy List (Test)",
            category="util",
            description="Outputs a hardcoded list of 4 sample scene segments for testing.",
            is_output_node=True,
            inputs=[],
            outputs=[
                IO.String.Output(
                    display_name="segments",
                    is_output_list=True,
                ),
            ],
        )

    @classmethod
    async def execute(cls) -> IO.NodeOutput:
        segments = [
            "Hook: The new Model X redefines what a sports car can be. Bold. Fast. Uncompromising.",
            "Problem: Most EVs sacrifice performance for range. You're stuck choosing between thrill and practicality.",
            "Solution: Model X delivers 600 horsepower AND 400 miles of range. No compromise.",
            "CTA: Visit your nearest dealer today. Test drive the future.",
        ]
        preview = "\n".join(f"[{i}] {s[:60]}..." for i, s in enumerate(segments))
        logger.info("[DummyListNode] Emitting %d segments", len(segments))
        return IO.NodeOutput(segments, ui={"text": [preview]})


class ListSelectorNode(IO.ComfyNode):
    """Pick one item from a list by index.

    Receives the full segments list (is_input_list=True), extracts the
    item at ``index``, and outputs it as a scalar string.  The canvas
    preview shows the selected segment with its position, e.g. "[2/5]".

    Wire one ListSelectorNode per scene branch, each set to a
    different index, to route individual segments from a single
    GeminiNode output into parallel generation branches.
    """

    @classmethod
    def define_schema(cls):
        return IO.Schema(
            node_id="ListSelectorNode",
            display_name="List Selector",
            category="util",
            description=(
                "Pick one item from a list by index. "
                "Preview shows the selected segment with its position."
            ),
            is_input_list=True,
            is_output_node=True,
            inputs=[
                IO.String.Input(
                    "items",
                    force_input=True,
                    tooltip="List of items (e.g. segments from GeminiNode)",
                ),
                IO.Int.Input(
                    "index",
                    default=0,
                    min=0,
                    max=99,
                    tooltip="Zero-based index of the item to select",
                ),
            ],
            outputs=[
                IO.String.Output(display_name="selected"),
            ],
        )

    @classmethod
    async def execute(cls, items: list[str], index: list[int]) -> IO.NodeOutput:
        idx = index[0] if index else 0
        total = len(items)

        if total == 0:
            logger.warning("[ListSelectorNode] Empty list, returning empty string")
            return IO.NodeOutput("", ui={"text": ["[0/0] (empty list)"]})

        # Clamp to valid range
        idx = max(0, min(idx, total - 1))
        selected = items[idx]

        preview = f"[{idx + 1}/{total}] {selected}"
        logger.info("[ListSelectorNode] Selected index %d/%d", idx, total)

        return IO.NodeOutput(selected, ui={"text": [preview]})


class TextConcatNode(IO.ComfyNode):
    """Concatenate multiple individually-wired strings into one.

    Unlike TextJoinNode (which takes a list via is_input_list),
    this node uses Autogrow inputs so you can wire outputs from
    multiple ListSelectorNode instances into it — e.g. to merge
    all base scene segments into a single context string for the
    hook variation prompt.
    """

    @classmethod
    def define_schema(cls):
        autogrow_template = IO.Autogrow.TemplatePrefix(
            input=IO.String.Input(
                "text",
                optional=True,
                tooltip="A string to include in the concatenation",
            ),
            prefix="text",
            min=1,
            max=20,
        )

        return IO.Schema(
            node_id="TextConcatNode",
            display_name="Text Concat",
            category="util",
            description=(
                "Concatenate multiple string inputs into one. "
                "Wire base scene segments here to build context "
                "for the hook variation prompt."
            ),
            is_output_node=True,
            inputs=[
                IO.Autogrow.Input(
                    "texts",
                    template=autogrow_template,
                    optional=True,
                    tooltip="Strings to concatenate (order matches slot order)",
                ),
                IO.String.Input(
                    "separator",
                    default="\\n\\n",
                    tooltip="Separator between concatenated texts",
                ),
            ],
            outputs=[
                IO.String.Output(display_name="merged_text"),
            ],
        )

    @classmethod
    async def execute(
        cls,
        texts: IO.Autogrow.Type | None = None,
        separator: str = "\\n\\n",
    ) -> IO.NodeOutput:
        sep = separator.replace("\\n", "\n")

        if not texts:
            return IO.NodeOutput("", ui={"text": ["(no inputs)"]})

        values = [v for v in texts.values() if v and v.strip()]
        merged = sep.join(values)

        preview = f"[{len(values)} parts merged]\n{merged[:500]}"
        logger.info(
            "[TextConcatNode] Merged %d inputs (%d chars)",
            len(values),
            len(merged),
        )

        return IO.NodeOutput(merged, ui={"text": [preview]})


class ShotFilenameNode(IO.ComfyNode):
    """Generate a structured filename prefix for SaveVideo.

    Produces:  {template_code}_{scene:02d}_{shot:02d}_{run_id}
    Example:   ugc-001_01_00_r20260415-1423

    Wire TextSplitNode.indices (auto-batched) to shot_index so each
    batch iteration receives the correct shot number automatically.
    """

    @classmethod
    def define_schema(cls):
        return IO.Schema(
            node_id="ShotFilenameNode",
            display_name="Shot Filename",
            category="util",
            description=(
                "Generate a structured filename prefix: "
                "{template_code}_{scene:02d}_{shot:02d}_{run_id}. "
                "Wire TextSplitNode.indices to shot_index for automatic shot numbering."
            ),
            inputs=[
                IO.String.Input(
                    "template_code",
                    default="tpl-00000000",
                    tooltip="Template slug+UUID8, e.g. 'ugc-001' or 'stk-a3f2c1d8'.",
                ),
                IO.Int.Input(
                    "scene_index",
                    default=1,
                    min=1,
                    max=99,
                    tooltip="Scene number (1-based).",
                ),
                IO.Int.Input(
                    "shot_index",
                    default=0,
                    min=0,
                    max=99,
                    force_input=True,
                    tooltip="Shot index — wire from TextSplitNode.indices for auto-batching.",
                ),
            ],
            outputs=[
                IO.String.Output(
                    display_name="filename",
                    tooltip="Filename prefix ready for SaveVideo.",
                ),
            ],
        )

    @classmethod
    async def execute(
        cls,
        template_code: str,
        scene_index: int = 1,
        shot_index: int = 0,
    ) -> IO.NodeOutput:
        slug = re.sub(r"[^\w\-]", "-", template_code.strip()).strip("-") or "tpl"
        run_id = datetime.now(timezone.utc).strftime("r%Y%m%d-%H%M")
        filename = f"{slug}_{scene_index:02d}_{shot_index:02d}_{run_id}"
        logger.info("[ShotFilenameNode] %s", filename)
        return IO.NodeOutput(filename, ui={"text": [filename]})


class TextUtilsExtension(ComfyExtension):
    @override
    async def get_node_list(self) -> list[type[IO.ComfyNode]]:
        return [TextSplitNode, TextJoinNode, DummyListNode, ListSelectorNode, TextConcatNode, ShotFilenameNode]

async def comfy_entrypoint() -> TextUtilsExtension:
    return TextUtilsExtension()

