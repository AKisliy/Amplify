"""
Langfuse Prompt Management Nodes

Nodes for fetching prompts from Langfuse, compiling template variables,
and outputting the compiled text for downstream consumption.

Also includes a generic StringInputNode for wiring literal string values
(like prompt names and labels) into graph connections.
"""

import asyncio
import json
import logging
import re

from comfy_api.latest import IO, ComfyExtension
from typing_extensions import override

logger = logging.getLogger(__name__)


# ── Utility Node ──────────────────────────────────────────────────────


class StringInputNode(IO.ComfyNode):
    """Outputs a literal string value. Use this to wire prompt names,
    labels, or any static text into downstream node inputs."""

    @classmethod
    def define_schema(cls):
        return IO.Schema(
            node_id="StringInputNode",
            display_name="String Input",
            category="util",
            description="Type a string and pass it to connected nodes.",
            inputs=[
                IO.String.Input(
                    "value",
                    multiline=False,
                    default="",
                    tooltip="The string value to output.",
                ),
            ],
            outputs=[
                IO.String.Output(display_name="value"),
            ],
        )

    @classmethod
    async def execute(cls, value: str) -> IO.NodeOutput:
        logger.info("[StringInputNode] value=%r", value)
        return IO.NodeOutput(value)


# ── Langfuse Prompt Node ──────────────────────────────────────────────

# Regex to extract {{variable_name}} placeholders from Langfuse text prompts
_VAR_PATTERN = re.compile(r"\{\{(\w+)\}\}")


def _get_langfuse_client():
    """Lazy-initialize a Langfuse client from engine config."""
    from langfuse import get_client

    return get_client()


class LangfusePromptNode(IO.ComfyNode):
    """Fetches a text prompt from Langfuse by name and label, compiles
    template variables from dynamic Autogrow inputs, and outputs the
    compiled text.

    Variable mapping is positional: Autogrow slot ``var0`` maps to the
    first ``{{placeholder}}`` found in the template, ``var1`` to the
    second, and so on.  Unused slots are silently ignored.
    """

    @classmethod
    def define_schema(cls):
        autogrow_template = IO.Autogrow.TemplatePrefix(
            input=IO.String.Input(
                "var",
                optional=True,
                tooltip="Value for a template variable (positional mapping)",
            ),
            prefix="var",
            min=1,
            max=20,
        )

        return IO.Schema(
            node_id="LangfusePromptNode",
            display_name="Langfuse Prompt",
            category="api node/prompt/Langfuse",
            description=(
                "Fetch a text prompt from Langfuse and compile its "
                "{{template}} variables with values provided via "
                "dynamic Autogrow inputs."
            ),
            is_output_node=False,
            inputs=[
                IO.String.Input(
                    "name",
                    force_input=True,
                    tooltip="Name of the Langfuse prompt to fetch.",
                ),
                IO.String.Input(
                    "label",
                    default="production",
                    optional=True,
                    tooltip=(
                        "Label identifying the prompt version to fetch "
                        "(e.g. production, staging). Defaults to 'production'."
                    ),
                ),
                IO.Autogrow.Input(
                    "variables",
                    template=autogrow_template,
                    optional=True,
                    tooltip=(
                        "Template variable values. Mapped to prompt "
                        "{{variables}} in the order they appear in the template."
                    ),
                ),
            ],
            outputs=[
                IO.String.Output(display_name="compiled_prompt"),
                IO.String.Output(
                    display_name="schema",
                    tooltip="JSON schema extracted from the Langfuse prompt config, "
                    "if present. Wire to GeminiNode response_schema for structured output.",
                ),
            ],
        )

    @classmethod
    async def execute(
        cls,
        name: str,
        label: str = "production",
        variables: IO.Autogrow.Type | None = None,
    ) -> IO.NodeOutput:
        name = name.strip()
        if not name:
            raise ValueError("Prompt name must not be empty.")

        label = (label or "production").strip()

        logger.info(
            "[LangfusePromptNode] Fetching prompt name=%r label=%r",
            name,
            label,
        )

        # Langfuse SDK is synchronous — run in a thread to keep the
        # event loop free.
        client = _get_langfuse_client()

        def _fetch():
            return client.get_prompt(name, label=label, type="text")

        prompt = await asyncio.to_thread(_fetch)

        # Extract ordered variable names from the template
        template_text: str = prompt.prompt
        var_names: list[str] = _VAR_PATTERN.findall(template_text)
        # Deduplicate while preserving first-occurrence order
        seen: set[str] = set()
        unique_var_names: list[str] = []
        for v in var_names:
            if v not in seen:
                seen.add(v)
                unique_var_names.append(v)

        # Map positional Autogrow values → named template variables
        compile_kwargs: dict[str, str] = {}
        if variables and unique_var_names:
            values = list(variables.values())
            for i, var_name in enumerate(unique_var_names):
                if i < len(values) and values[i]:
                    compile_kwargs[var_name] = values[i]

        logger.info(
            "[LangfusePromptNode] Template has %d unique variable(s): %s — "
            "received %d value(s)",
            len(unique_var_names),
            unique_var_names,
            len(compile_kwargs),
        )

        compiled = prompt.compile(**compile_kwargs)

        # Extract structured output schema from prompt config if present.
        # Supports a flat "schema" key or OpenAI-style "response_format.json_schema.schema".
        schema_str = ""
        config = getattr(prompt, "config", None) or {}
        if isinstance(config, dict):
            schema_obj = config.get("schema")
            if schema_obj is None:
                # Try OpenAI-style nested path
                rf = config.get("response_format", {})
                if isinstance(rf, dict):
                    js = rf.get("json_schema", {})
                    if isinstance(js, dict):
                        schema_obj = js.get("schema")
            if schema_obj is not None:
                schema_str = json.dumps(schema_obj)

        logger.info(
            "[LangfusePromptNode] Compiled prompt (%d chars), schema=%s",
            len(compiled),
            "present" if schema_str else "absent",
        )

        return IO.NodeOutput(compiled, schema_str)


# ── Extension & Entry Point ───────────────────────────────────────────


class LangfuseExtension(ComfyExtension):
    @override
    async def get_node_list(self) -> list[type[IO.ComfyNode]]:
        return [
            StringInputNode,
            LangfusePromptNode,
        ]


async def comfy_entrypoint() -> LangfuseExtension:
    return LangfuseExtension()
