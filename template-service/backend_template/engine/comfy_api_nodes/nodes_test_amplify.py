"""
Simple test nodes for validating the POST /api/prompt → execution pipeline.

These nodes are intentionally minimal — no external API calls, no dependencies.
They perform basic string/number transformations to verify the execution engine
works end-to-end.

Workflow: TextInput → ReverseText → ConcatText → TestOutput
"""

import time
import logging

from comfy_api.latest import IO, ComfyExtension
from typing_extensions import override

logger = logging.getLogger(__name__)


class TextInputNode(IO.ComfyNode):
    """Produces a static text string — acts as a source/input node."""

    @classmethod
    def define_schema(cls):
        return IO.Schema(
            node_id="TestTextInputNode",
            display_name="Test Text Input",
            category="test/amplify",
            description="Produces a text string. Starting point for test workflows.",
            inputs=[
                IO.String.Input(
                    "text",
                    default="Hello from Amplify!",
                    multiline=True,
                    tooltip="The text to output.",
                ),
            ],
            outputs=[
                IO.String.Output(display_name="text"),
            ],
        )

    @classmethod
    async def execute(cls, text: str) -> IO.NodeOutput:
        logger.info(f"[TestTextInputNode] Producing text: {text!r}")
        return IO.NodeOutput(text)


class ReverseTextNode(IO.ComfyNode):
    """Reverses the input string — simple transformation node."""

    @classmethod
    def define_schema(cls):
        return IO.Schema(
            node_id="TestReverseTextNode",
            display_name="Test Reverse Text",
            category="test/amplify",
            description="Reverses the input text string.",
            inputs=[
                IO.String.Input(
                    "text",
                    force_input=True,
                    tooltip="Text to reverse.",
                ),
            ],
            outputs=[
                IO.String.Output(display_name="reversed"),
            ],
        )

    @classmethod
    async def execute(cls, text: str) -> IO.NodeOutput:
        result = text[::-1]
        logger.info(f"[TestReverseTextNode] {text!r} → {result!r}")
        return IO.NodeOutput(result)


class ConcatTextNode(IO.ComfyNode):
    """Concatenates two strings with a separator — fan-in node."""

    @classmethod
    def define_schema(cls):
        return IO.Schema(
            node_id="TestConcatTextNode",
            display_name="Test Concat Text",
            category="test/amplify",
            description="Concatenates text_a and text_b with a separator.",
            inputs=[
                IO.String.Input(
                    "text_a",
                    force_input=True,
                    tooltip="First text.",
                ),
                IO.String.Input(
                    "text_b",
                    force_input=True,
                    tooltip="Second text.",
                ),
                IO.String.Input(
                    "separator",
                    default=" | ",
                    tooltip="Separator between the two texts.",
                ),
            ],
            outputs=[
                IO.String.Output(display_name="combined"),
            ],
        )

    @classmethod
    async def execute(cls, text_a: str, text_b: str, separator: str = " | ") -> IO.NodeOutput:
        result = f"{text_a}{separator}{text_b}"
        logger.info(f"[TestConcatTextNode] {text_a!r} + {text_b!r} → {result!r}")
        return IO.NodeOutput(result)


class TestOutputNode(IO.ComfyNode):
    """
    Terminal output node — marks the end of the workflow.
    
    OUTPUT_NODE = True means the execution engine will use this as a root
    for backward traversal and will actually execute the upstream chain.
    Without this, nothing would run.
    """

    RETURN_TYPES = ()
    OUTPUT_NODE = True

    @classmethod
    def define_schema(cls):
        return IO.Schema(
            node_id="TestOutputNode",
            display_name="Test Output",
            category="test/amplify",
            description="Terminal node that logs the final result. Marks the workflow as having output.",
            is_output_node=True,
            inputs=[
                IO.String.Input(
                    "result",
                    force_input=True,
                    tooltip="The final result to log.",
                ),
            ],
            outputs=[],
        )

    @classmethod
    async def execute(cls, result: str) -> IO.NodeOutput:
        logger.info("=" * 60)
        logger.info(f"[TestOutputNode] FINAL RESULT: {result}")
        logger.info("=" * 60)
        return IO.NodeOutput(ui={"text": [result]})


class TestExtension(ComfyExtension):
    @override
    async def get_node_list(self) -> list[type[IO.ComfyNode]]:
        return [
            TextInputNode,
            ReverseTextNode,
            ConcatTextNode,
            TestOutputNode,
        ]


async def comfy_entrypoint() -> TestExtension:
    return TestExtension()
