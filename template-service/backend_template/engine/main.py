import asyncio
from comfy_api_nodes.nodes_gemini import GeminiNode

async def main():
    response = await GeminiNode.execute(
        prompt="Hello, how are you?", 
        model="gemini-2.5-flash", 
        system_prompt="You are a helpful assistant."
    )
    # The output format depends on NodeOutput, typically indexable or with dictionary keys.
    print(response.result)
    print(response[0])
    
if __name__ == "__main__":
    asyncio.run(main())
