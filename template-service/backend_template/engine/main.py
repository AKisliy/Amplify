import asyncio
from comfy_api_nodes.nodes_gemini import GeminiNodeAmplify

async def main():
    response = await GeminiNodeAmplify.execute(
        prompt="Hello, how are you?", 
        model="gemini-2.5-flash", 
        system_prompt="You are a helpful assistant.",
        images={"image1": "019cc840-0d81-7689-a3cf-f836d09231d9", "image2": "019cc840-9720-768f-9af8-5ba15054b19d"}
    )
    # The output format depends on NodeOutput, typically indexable or with dictionary keys.
    print(response.result)
    print(response[0])

if __name__ == "__main__":
    asyncio.run(main())
