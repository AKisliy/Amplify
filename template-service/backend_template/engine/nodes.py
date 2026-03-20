from __future__ import annotations

import os
import sys
import glob
import inspect

import traceback
import logging

import comfy.utils
from comfy_api.internal import register_versions, ComfyAPIWithVersion
from comfy_api.version_list import supported_versions
from comfy_api.latest import io, ComfyExtension

import comfy.model_management

import importlib

def before_node_execution():
    comfy.model_management.throw_exception_if_processing_interrupted()

def interrupt_processing(value=True):
    comfy.model_management.interrupt_current_processing(value)

NODE_CLASS_MAPPINGS = {
}

NODE_DISPLAY_NAME_MAPPINGS = {
}

EXTENSION_WEB_DIRS = {}

# Dictionary of successfully loaded module names and associated directories.
LOADED_MODULE_DIRS = {}


def get_module_name(module_path: str) -> str:
    """
    Returns the module name based on the given module path.
    Examples:
        get_module_name("C:/Users/username/ComfyUI/custom_nodes/my_custom_node.py") -> "my_custom_node"
        get_module_name("C:/Users/username/ComfyUI/custom_nodes/my_custom_node") -> "my_custom_node"
        get_module_name("C:/Users/username/ComfyUI/custom_nodes/my_custom_node/") -> "my_custom_node"
        get_module_name("C:/Users/username/ComfyUI/custom_nodes/my_custom_node/__init__.py") -> "my_custom_node"
        get_module_name("C:/Users/username/ComfyUI/custom_nodes/my_custom_node/__init__") -> "my_custom_node"
        get_module_name("C:/Users/username/ComfyUI/custom_nodes/my_custom_node/__init__/") -> "my_custom_node"
        get_module_name("C:/Users/username/ComfyUI/custom_nodes/my_custom_node.disabled") -> "custom_nodes
    Args:
        module_path (str): The path of the module.
    Returns:
        str: The module name.
    """
    base_path = os.path.basename(module_path)
    if os.path.isfile(module_path):
        base_path = os.path.splitext(base_path)[0]
    return base_path


async def load_custom_node(module_path: str, ignore=set(), module_parent="custom_nodes") -> bool:
    module_name = get_module_name(module_path)
    if os.path.isfile(module_path):
        sp = os.path.splitext(module_path)
        module_name = sp[0]
        sys_module_name = module_name
    elif os.path.isdir(module_path):
        sys_module_name = module_path.replace(".", "_x_")

    try:
        logging.debug("Trying to load custom node {}".format(module_path))
        if os.path.isfile(module_path):
            module_spec = importlib.util.spec_from_file_location(sys_module_name, module_path)
            module_dir = os.path.split(module_path)[0]
        else:
            module_spec = importlib.util.spec_from_file_location(sys_module_name, os.path.join(module_path, "__init__.py"))
            module_dir = module_path

        module = importlib.util.module_from_spec(module_spec)
        sys.modules[sys_module_name] = module
        module_spec.loader.exec_module(module)

        LOADED_MODULE_DIRS[module_name] = os.path.abspath(module_dir)

        # V3 Extension Definition
        if hasattr(module, "comfy_entrypoint"):
            entrypoint = getattr(module, "comfy_entrypoint")
            if not callable(entrypoint):
                logging.warning(f"comfy_entrypoint in {module_path} is not callable, skipping.")
                return False
            try:
                if inspect.iscoroutinefunction(entrypoint):
                    extension = await entrypoint()
                else:
                    extension = entrypoint()
                if not isinstance(extension, ComfyExtension):
                    logging.warning(f"comfy_entrypoint in {module_path} did not return a ComfyExtension, skipping.")
                    return False
                await extension.on_load()
                node_list = await extension.get_node_list()
                if not isinstance(node_list, list):
                    logging.warning(f"comfy_entrypoint in {module_path} did not return a list of nodes, skipping.")
                    return False
                for node_cls in node_list:
                    node_cls: io.ComfyNode
                    schema = node_cls.GET_SCHEMA()
                    if schema.node_id not in ignore:
                        NODE_CLASS_MAPPINGS[schema.node_id] = node_cls
                        node_cls.RELATIVE_PYTHON_MODULE = "{}.{}".format(module_parent, get_module_name(module_path))
                    if schema.display_name is not None:
                        NODE_DISPLAY_NAME_MAPPINGS[schema.node_id] = schema.display_name
                return True
            except Exception as e:
                logging.warning(f"Error while calling comfy_entrypoint in {module_path}: {e}")
                return False
        else:
            logging.warning(f"Skip {module_path} module for custom nodes due to the lack of NODE_CLASS_MAPPINGS or NODES_LIST (need one).")
            return False
    except Exception as e:
        logging.warning(traceback.format_exc())
        logging.warning(f"Cannot import {module_path} module for custom nodes: {e}")
        return False

async def init_builtin_api_nodes():
    api_nodes_dir = os.path.join(os.path.dirname(os.path.realpath(__file__)), "comfy_api_nodes")
    api_nodes_files = sorted(glob.glob(os.path.join(api_nodes_dir, "nodes_*.py")))

    import_failed = []
    for node_file in api_nodes_files:
        if not await load_custom_node(node_file, module_parent="comfy_api_nodes"):
            import_failed.append(os.path.basename(node_file))

    return import_failed

async def init_public_apis():
    register_versions([
        ComfyAPIWithVersion(
            version=getattr(v, "VERSION"),
            api_class=v
        ) for v in supported_versions
    ])

async def init_extra_nodes(init_api_nodes=True):
    await init_public_apis()

    if init_api_nodes:
        import_failed_api = await init_builtin_api_nodes()

        if len(import_failed_api) > 0:
            logging.warning("WARNING: some comfy_api_nodes/ nodes did not import correctly. This may be because they are missing some dependencies.\n")
            for node in import_failed_api:
                logging.warning("IMPORT FAILED: {}".format(node))
            logging.warning("")
