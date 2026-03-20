import os
import folder_paths
from app.logger import setup_logger
import logging
import sys

from config import engine_config

setup_logger(log_level=engine_config.log_level)

# Main code
import asyncio
import shutil

import server
import nodes
import app.logger


async def run(server_instance, address='', port=8188, verbose=True, call_on_start=None):
    addresses = []
    for addr in address.split(","):
        addresses.append((addr, port))
    await server_instance.start_multi_address(addresses, call_on_start, verbose)
    await asyncio.Event().wait()
    # await asyncio.gather(
    #     server_instance.start_multi_address(addresses, call_on_start, verbose), server_instance.publish_loop()
    # )

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
