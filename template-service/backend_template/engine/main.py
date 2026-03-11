import asyncio
from comfy_api_nodes.nodes_gemini import GeminiImageNode, GeminiImage2Node, GeminiNode
from comfy_api_nodes.nodes_veo2 import VeoVideoGenerationNode, Veo3FirstLastFrameNode
from comfy_api_nodes.util.client import sync_op
from comfy_api_nodes.util import ApiEndpoint
from comfy_api_nodes.apis.gemini import GeminiPart, GeminiInlineData, GeminiImageGenerateContentRequest, GeminiContent
from comfy_api.latest import IO
from config import gemini_config, media_ingest_config
import base64
import uuid
import io

async def main():
    response = await Veo3FirstLastFrameNode.execute(
        prompt="generate a video of a lambo urus", 
        model="veo-3.1-fast-generate",
        resolution="1080p",
        first_frame_uuid="019cdcf2-7327-7577-9061-2074fb03797b",
        last_frame_uuid="019cdcf2-f636-7275-aee2-8037ac70b564",
        negative_prompt="",
        aspect_ratio="9:16",
        duration=4,
        seed=0,
        generate_audio=True,
    )
    # The output format depends on NodeOutput, typically indexable or with dictionary keys.
    print(response.result)
    print(response[0])

if __name__ == "__main__":
    asyncio.run(main())
