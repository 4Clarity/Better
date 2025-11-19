"""Test script to verify PydanticAI result object structure."""
import asyncio
import os
from pydantic_ai import Agent

# Set API key
os.environ['GOOGLE_API_KEY'] = os.getenv('GEMINI_API_KEY', 'AIzaSyBf5qJTE6Fxj21Kar5Ls8JCWBn94bk1NG4')

async def test():
    agent = Agent('gemini-2.5-flash')
    result = await agent.run('Say hello in exactly 3 words')

    print(f"Result type: {type(result)}")
    print(f"\nResult attributes:")
    for attr in dir(result):
        if not attr.startswith('_'):
            print(f"  - {attr}")

    print(f"\nResult object: {result}")

    # Try to access the actual response text
    if hasattr(result, 'data'):
        print(f"\nResult.data: {result.data}")
    if hasattr(result, 'output'):
        print(f"\nResult.output: {result.output}")
    if hasattr(result, 'message'):
        print(f"\nResult.message: {result.message}")
    if hasattr(result, 'text'):
        print(f"\nResult.text: {result.text}")

    # Try string conversion
    print(f"\nString representation: {str(result)}")

asyncio.run(test())
