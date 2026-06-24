# Schema Registry

## Problem

`GET /v1/engine/nodes` currently proxies ComfyUI's `GET /object_info`, which introspects
loaded Python classes at runtime. Removing ComfyUI means losing this source.

## Contract to preserve

The frontend (`useNodeRegistry.ts` → `schemaMapper.ts`) consumes a JSON object:

```json
{
  "GeminiNode": {
    "input": {
      "required": { "prompt": ["STRING", {}], "model": ["STRING", {}] },
      "optional": { "temperature": ["FLOAT", { "default": 0.7 }] }
    },
    "output": ["STRING"],
    "output_name": ["text"],
    "display_name": "Gemini AI",
    "category": "api node/AI",
    "output_node": false
  }
}
```

This format is defined by ComfyUI but owned by us — we can serve it from any source.

## Proposed: static registry in code

Node schemas are defined as Python dataclasses or dicts, co-located with the activity
implementation. A registry builder collects them and serves the JSON on demand.

```python
# activities/gemini.py
SCHEMA = NodeSchema(
    node_id="GeminiNode",
    display_name="Gemini AI",
    category="api node/AI",
    inputs={
        "required": {"prompt": ("STRING", {}), "model": ("STRING", {})},
        "optional": {"temperature": ("FLOAT", {"default": 0.7, "min": 0.0, "max": 2.0})},
    },
    outputs=[("STRING", "text")],
)

@activity.defn
async def execute_gemini(input: GeminiActivityInput) -> GeminiActivityOutput:
    ...
```

The `GET /v1/engine/nodes` endpoint collects all registered `SCHEMA` objects and
serializes them in the ComfyUI `object_info` format. No ComfyUI code needed.

## Schema evolution

Schemas are checked into the repo alongside activity code. Changes are versioned with the
code, reviewed in PRs, and deployed atomically. This is strictly better than the current
situation where schema changes require modifying Python class definitions and restarting
the embedded ComfyUI process.

## Compatibility with existing graph JSON

Existing `template_versions` records reference `class_type` strings like `"GeminiNode"`.
As long as the registry uses the same keys, existing graphs load correctly. No migration.

If a node is renamed or removed, the executor must handle unknown `class_type` gracefully
(skip with a warning, or fail the job with a clear error message).

## Future: editable node library

If node types need to be created/edited via UI (without code deploys), the registry can
be moved to a DB table. The `GET /v1/engine/nodes` endpoint would query the DB instead
of the in-code registry. This is out of scope for AMPLIFY-419 but the static registry
design does not preclude it.
