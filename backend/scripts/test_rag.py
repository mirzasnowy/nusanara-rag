import httpx
import json
import asyncio
import sys

# Memaksa terminal Windows menggunakan UTF-8 agar bisa mem-print emoji
sys.stdout.reconfigure(encoding='utf-8')

async def test_recommend():
    url = "http://localhost:8000/api/recommend"
    headers = {
        "Authorization": "Bearer TEST_TOKEN",  # Menggunakan Development Bypass Token
        "Content-Type": "application/json"
    }
    
    # Narasi ujian:
    payload = {
        "narrative": "Saya baru lulus D3 Teknik Informatika. Saya bisa Python dan SQL dasar. Saya sangat tertarik bekerja di bidang data atau backend, tapi bingung harus mulai dari mana dan skill apa yang kurang."
    }
    
    print(f"🚀 Menembak endpoint {url} dengan narasi:")
    print(f"\"{payload['narrative']}\"\\n")
    print("-" * 50)
    print("Menerima respons streaming dari RAG + Ollama:\\n")

    try:
        async with httpx.AsyncClient() as client:
            async with client.stream("POST", url, headers=headers, json=payload, timeout=120.0) as response:
                response.raise_for_status()
                
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:]  # Hapus prefix "data: "
                        
                        if data_str == "[DONE]":
                            print("\n\\n✅ [STREAM SELESAI]")
                            break
                        
                        try:
                            # Parse JSON dan print isinya ke terminal tanpa newline baru
                            data_json = json.loads(data_str)
                            print(data_json.get("content", ""), end="", flush=True)
                        except json.JSONDecodeError:
                            pass
                            
    except Exception as e:
        print(f"\\n❌ Error saat menembak API: {e}")

if __name__ == "__main__":
    asyncio.run(test_recommend())
