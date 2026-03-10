import asyncio
from comfy_api_nodes.nodes_gemini import GeminiImageNode, GeminiImage2Node
from comfy_api_nodes.util.client import sync_op
from comfy_api_nodes.util import ApiEndpoint
from comfy_api_nodes.apis.gemini import GeminiPart, GeminiInlineData, GeminiImageGenerateContentRequest, GeminiContent
from comfy_api.latest import IO
from config import gemini_config, media_ingest_config
import base64
import uuid
import io

async def main():
    response = await GeminiImage2Node.execute(
        prompt="make a image of a cat", 
        model="gemini-2.5-flash-image",
        aspect_ratio="16:9",
        resolution="1K",
        response_modalities="IMAGE",
        # images={"image_uuid0": "019cc840-0d81-7689-a3cf-f836d09231d9"}
    )
    # The output format depends on NodeOutput, typically indexable or with dictionary keys.
    print(response.result)
    print(response[0])

if __name__ == "__main__":
    asyncio.run(main())
