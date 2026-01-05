"""
Test LM Studio Connection
"""
import requests
import json

def test():
    base_url = "http://localhost:1234/v1"
    print("\n🔌 Testing LM Studio Connection...\n")
    
    # Test 1: Server running
    print("1. Checking server...")
    try:
        r = requests.get(f"{base_url}/models", timeout=5)
        print(f"   ✓ Server running on {base_url}")
        models = r.json()
        print(f"   ✓ Models: {models}")
    except Exception as e:
        print(f"   ✗ Server not reachable: {e}")
        print("\n   Make sure:")
        print("   1. LM Studio is open")
        print("   2. A model is loaded")
        print("   3. Server is started (port 1234)")
        return False
    
    # Test 2: Chat completion
    print("\n2. Testing chat completion...")
    try:
        r = requests.post(
            f"{base_url}/chat/completions",
            json={
                "model": "local-model",
                "messages": [{"role": "user", "content": "Say hello in JSON: {\"greeting\": \"...\"}"}],
                "temperature": 0.3,
                "max_tokens": 50
            },
            timeout=30
        )
        result = r.json()
        content = result["choices"][0]["message"]["content"]
        print(f"   ✓ Completion works")
        print(f"   Response: {content}")
    except Exception as e:
        print(f"   ✗ Completion failed: {e}")
        return False
    
    print("\n✅ LM Studio is ready!\n")
    return True

if __name__ == "__main__":
    test()
