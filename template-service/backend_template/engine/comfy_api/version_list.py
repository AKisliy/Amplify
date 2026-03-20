from comfy_api.latest import ComfyAPI_latest
from comfy_api.internal import ComfyAPIBase

supported_versions: list[type[ComfyAPIBase]] = [
    ComfyAPI_latest,
]
