import os
import folder_paths
import time
from app.logger import setup_logger
import logging
import sys
from comfy_execution.progress import get_progress_state
from comfy_execution.utils import get_executing_context

from config import engine_config

setup_logger(log_level=engine_config.log_level)

# Main code
import asyncio
import shutil
import threading
import gc

import execution
import server
import nodes
import comfy.utils
import comfy.model_management

def prompt_worker(q, server_instance, cache_type=execution.CacheType.NONE):
    current_time: float = 0.0
    
    e = execution.PromptExecutor(server_instance, cache_type=cache_type)
    last_gc_collect = 0
    need_gc = False
    gc_collect_interval = 10.0

    while True:
        timeout = 1000.0
        if need_gc:
            timeout = max(gc_collect_interval - (current_time - last_gc_collect), 0.0)

        queue_item = q.get(timeout=timeout)
        if queue_item is not None:
            item, item_id = queue_item
            execution_start_time = time.perf_counter()
            prompt_id = item[1]
            server_instance.last_prompt_id = prompt_id

            sensitive = item[5]
            extra_data = item[3].copy()
            for k in sensitive:
                extra_data[k] = sensitive[k]

            e.execute(item[2], prompt_id, extra_data, item[4])
            need_gc = True

            remove_sensitive = lambda prompt: prompt[:5] + prompt[6:]
            q.task_done(item_id,
                        e.history_result,
                        status=execution.PromptQueue.ExecutionStatus(
                            status_str='success' if e.success else 'error',
                            completed=e.success,
                            messages=e.status_messages), process_item=remove_sensitive)
            if server_instance.client_id is not None:
                server_instance.send_sync("executing", {"node": None, "prompt_id": prompt_id}, server_instance.client_id)

            current_time = time.perf_counter()
            execution_time = current_time - execution_start_time

            # Log Time in a more readable way after 10 minutes
            if execution_time > 600:
                execution_time = time.strftime("%H:%M:%S", time.gmtime(execution_time))
                logging.info(f"Prompt executed in {execution_time}")
            else:
                logging.info("Prompt executed in {:.2f} seconds".format(execution_time))

        flags = q.get_flags()
        free_memory = flags.get("free_memory", False)

        if free_memory:
            e.reset()
            need_gc = True
            last_gc_collect = 0

        if need_gc:
            current_time = time.perf_counter()
            if (current_time - last_gc_collect) > gc_collect_interval:
                gc.collect()
                last_gc_collect = current_time
                need_gc = False

async def run(server_instance, address='', port=8188, verbose=True, call_on_start=None):
    addresses = []
    for addr in address.split(","):
        addresses.append((addr, port))
    # await server_instance.start_multi_address(addresses, call_on_start, verbose)
    # await asyncio.Event().wait()
    await asyncio.gather(
        server_instance.start_multi_address(addresses, call_on_start, verbose), server_instance.publish_loop()
    )

def hijack_progress(server_instance):
    def hook(value, total, preview_image, prompt_id=None, node_id=None):
        executing_context = get_executing_context()
        if prompt_id is None and executing_context is not None:
            prompt_id = executing_context.prompt_id
        if node_id is None and executing_context is not None:
            node_id = executing_context.node_id
        comfy.model_management.throw_exception_if_processing_interrupted()
        if prompt_id is None:
            prompt_id = server_instance.last_prompt_id
        if node_id is None:
            node_id = server_instance.last_node_id
        progress = {"value": value, "max": total, "prompt_id": prompt_id, "node": node_id}
        get_progress_state().update_progress(node_id, value, total, preview_image)

        server_instance.send_sync("progress", progress, server_instance.client_id)

    comfy.utils.set_progress_bar_global_hook(hook)

def cleanup_temp():
    temp_dir = folder_paths.get_temp_directory()
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir, ignore_errors=True)

def start_comfyui(asyncio_loop=None):
    """
    Starts the ComfyUI server using the provided asyncio event loop or creates a new one.
    Returns the event loop, server instance, and a function to start the server asynchronously.
    """
    if engine_config.temp_directory:
        temp_dir = os.path.join(os.path.abspath(engine_config.temp_directory), "temp")
        logging.info(f"Setting temp directory to: {temp_dir}")
        folder_paths.set_temp_directory(temp_dir)
    cleanup_temp()

    if not asyncio_loop:
        asyncio_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(asyncio_loop)
    prompt_server = server.PromptServer(asyncio_loop)

    asyncio_loop.run_until_complete(nodes.init_extra_nodes())

    prompt_server.add_routes()
    hijack_progress(prompt_server)

    _cache_map = {
        "none":    execution.CacheType.NONE,
        "classic": execution.CacheType.CLASSIC,
        "lru":     execution.CacheType.LRU,
    }
    cache_type = _cache_map.get(engine_config.cache_type.lower(), execution.CacheType.NONE)
    logging.info(f"Prompt executor cache type: {cache_type} (ENGINE_CACHE_TYPE='{engine_config.cache_type}')")

    threading.Thread(target=prompt_worker, daemon=True, args=(prompt_server.prompt_queue, prompt_server, cache_type)).start()

    os.makedirs(folder_paths.get_temp_directory(), exist_ok=True)

    async def start_all():
        await prompt_server.setup()
        await run(prompt_server, address=engine_config.listen, port=engine_config.port, verbose=engine_config.verbose, call_on_start=None)
 
    # Returning these so that other code can integrate with the ComfyUI loop and server
    return asyncio_loop, prompt_server, start_all


if __name__ == "__main__":
    # Running directly, just start ComfyUI.
    logging.info("Python version: {}".format(sys.version))

    if sys.version_info.major == 3 and sys.version_info.minor < 10:
        logging.warning("WARNING: You are using a python version older than 3.10, please upgrade to a newer one. 3.12 and above is recommended.")

    event_loop, _, start_all_func = start_comfyui()
    try:
        x = start_all_func()
        event_loop.run_until_complete(x)
    except KeyboardInterrupt:
        logging.info("\nStopped server")

    cleanup_temp()
