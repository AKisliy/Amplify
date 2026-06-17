"""
Temporal node registry.

NODE_CLASS_MAPPINGS and OUTPUT_FIELDS are populated at worker startup by
init_registry(), which mirrors ComfyUI's init_builtin_api_nodes() from nodes.py:

  1. Glob comfy_api_nodes/nodes_*.py
  2. Call comfy_entrypoint() on each → ComfyExtension
  3. Call extension.get_node_list() → list of IO.ComfyNode subclasses
  4. Build NODE_CLASS_MAPPINGS[schema.node_id] = node_cls
  5. Derive OUTPUT_FIELDS from schema outputs

Adding a new node = drop a new nodes_*.py file in comfy_api_nodes/.
No changes needed here.
"""
from __future__ import annotations

import glob
import importlib
import inspect
import logging
import os
import sys
import types
from types import SimpleNamespace

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# 1. Add engine/ to sys.path so bare imports work (comfy, comfy_api,
#    comfy_api_nodes, config).  Must happen before any engine import.
# ---------------------------------------------------------------------------
_ENGINE_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "engine")
)
if _ENGINE_DIR not in sys.path:
    sys.path.insert(0, _ENGINE_DIR)

# ---------------------------------------------------------------------------
# 2. Inject a synthetic `config` module backed by activity_config so node
#    files that do `from config import gemini_config, litellm_config` get our
#    values instead of reading the engine's .env file.
# ---------------------------------------------------------------------------
if "config" not in sys.modules:
    from backend_template.config import activity_config as _ac, settings as _settings

    _shim = types.ModuleType("config")
    _shim.gemini_config = SimpleNamespace(
        project_id=_ac.gemini_project_id,
        location=_ac.gemini_location,
        storage_uri=_ac.gemini_storage_uri,
        rai_fallback_video_uuid=_ac.rai_fallback_video_uuid,
        service_account_key_file="",
    )
    _shim.litellm_config = SimpleNamespace(
        litellm_base_url=_ac.litellm_base_url,
        litellm_api_key=_ac.litellm_api_key,
    )
    _shim.media_ingest_config = SimpleNamespace(
        media_ingest_url=_ac.media_ingest_url,
    )
    _shim.rabbitmq_config = SimpleNamespace(
        rabbitmq_url=_settings.rabbitmq_url,
    )
    _shim.video_editor_config = SimpleNamespace(
        video_editor_url=_ac.video_editor_url,
    )
    sys.modules["config"] = _shim

# ---------------------------------------------------------------------------
# 3. Registries — populated lazily by init_registry() at worker startup.
# ---------------------------------------------------------------------------
NODE_CLASS_MAPPINGS: dict[str, type] = {}
OUTPUT_FIELDS: dict[str, list[str]] = {}


def _output_fields(node_cls: type) -> list[str]:
    try:
        return [out.display_name for out in node_cls.GET_SCHEMA().outputs]
    except Exception:
        return []


async def init_registry() -> None:
    """
    Discover all IO.ComfyNode subclasses from comfy_api_nodes/nodes_*.py.

    Mirrors ComfyUI's init_builtin_api_nodes() / load_custom_node() from nodes.py.
    Must be called once at Temporal worker startup before processing any tasks.
    """
    from comfy_api.latest import ComfyExtension  # bare import — engine on sys.path

    api_nodes_dir = os.path.join(_ENGINE_DIR, "comfy_api_nodes")
    node_files = sorted(glob.glob(os.path.join(api_nodes_dir, "nodes_*.py")))

    for filepath in node_files:
        module_name = "comfy_api_nodes." + os.path.basename(filepath)[:-3]
        try:
            module = importlib.import_module(module_name)
        except Exception as exc:
            logger.warning("Skipping %s (import error): %s", module_name, exc)
            continue

        entrypoint = getattr(module, "comfy_entrypoint", None)
        if entrypoint is None:
            continue

        try:
            ext = await entrypoint() if inspect.iscoroutinefunction(entrypoint) else entrypoint()
            if not isinstance(ext, ComfyExtension):
                continue
            for node_cls in await ext.get_node_list():
                schema = node_cls.GET_SCHEMA()
                NODE_CLASS_MAPPINGS[schema.node_id] = node_cls
                OUTPUT_FIELDS[schema.node_id] = _output_fields(node_cls)
        except Exception as exc:
            logger.warning("Error loading nodes from %s: %s", module_name, exc)

    logger.info(
        "Temporal registry: %d node types loaded: %s",
        len(NODE_CLASS_MAPPINGS),
        sorted(NODE_CLASS_MAPPINGS),
    )
