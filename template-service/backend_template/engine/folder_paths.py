from __future__ import annotations

import os

base_path = os.path.dirname(os.path.realpath(__file__))

temp_directory = os.path.join(base_path, "temp")

def get_temp_directory() -> str:
    global temp_directory
    return temp_directory
