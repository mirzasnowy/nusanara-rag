import httpx, json, sys
if sys.stdout.encoding != "utf-8": sys.stdout.reconfigure(encoding="utf-8")

# Test langsung ke Ollama generate (tanpa FastAPI)
print("Testing Ollama generate directly...")
try:
    with httpx.stream(
        "POST",
        "http://localhost:11434/api/generate",
        json={
            "model": "llama3.1",
            "prompt": "Jawab singkat: Apa ibu kota Indonesia?",
            "stream": True,
            "options": {"temperature": 0.3, "num_ctx": 512}
        },
        timeout=60
    ) as resp:
        print(f"Status: {resp.status_code}")
        for line in resp.iter_lines():
            if not line: continue
            chunk = json.loads(line)
            print(chunk.get("response", ""), end="", flush=True)
            if chunk.get("done"): break
    print("\n\n[OK] Ollama generate works!")
except Exception as e:
    print(f"\n[ERR] {e}")
