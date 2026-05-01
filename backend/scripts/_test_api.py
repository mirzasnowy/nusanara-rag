"""
Test end-to-end RAG: kirim narrative ke /api/recommend, tampilkan streaming output.
Gunakan TEST_TOKEN (bypass Clerk auth — hanya untuk development).
"""
import httpx, json, sys, time
if sys.stdout.encoding != "utf-8": sys.stdout.reconfigure(encoding="utf-8")

BASE_URL = "http://localhost:8001"
HEADERS  = {
    "Content-Type": "application/json",
    "Authorization": "Bearer TEST_TOKEN"
}

# Query representatif — mirip dengan query evaluasi
TEST_CASES = [
    {
        "id": "T1",
        "label": "Data Analyst (Analisis Data cluster)",
        "narrative": "Saya fresh graduate S1 Sistem Informasi, mahir Excel dan SQL, pernah buat dashboard Power BI. Ingin berkarier sebagai data analyst."
    },
    {
        "id": "T2",
        "label": "Guru → Trainer (Education cluster)",
        "narrative": "Saya guru matematika SMA dengan pengalaman 3 tahun. Ingin beralih ke bidang pelatihan dan training korporat."
    },
]

def test_recommend(case: dict):
    print(f"\n{'='*60}")
    print(f"[{case['id']}] {case['label']}")
    print(f"Query: {case['narrative'][:80]}...")
    print(f"{'='*60}")

    start = time.time()
    first_token_time = None
    full_response    = ""

    try:
        with httpx.stream(
            "POST",
            f"{BASE_URL}/api/recommend",
            headers=HEADERS,
            json={"narrative": case["narrative"]},
            timeout=180
        ) as resp:
            resp.raise_for_status()

            for line in resp.iter_lines():
                if not line or not line.startswith("data: "):
                    continue
                payload = line[6:]  # strip "data: "
                if payload == "[DONE]":
                    break
                try:
                    chunk = json.loads(payload)
                    text  = chunk.get("content", "")
                    if text:
                        if first_token_time is None:
                            first_token_time = time.time() - start
                        full_response += text
                        print(text, end="", flush=True)
                except json.JSONDecodeError:
                    pass

        elapsed = time.time() - start
        print(f"\n\n{'─'*60}")
        print(f"[TTFB] Token pertama: {first_token_time:.1f}s")
        print(f"[Total] Durasi total: {elapsed:.1f}s")
        print(f"[Panjang] {len(full_response)} karakter")

        # Validasi kriteria output
        print(f"\n{'─'*60}")
        print("VALIDASI KRITERIA OUTPUT:")
        checks = [
            ("Struktur: Analisis Profil",    "Analisis Profil" in full_response or "analisis profil" in full_response.lower()),
            ("Struktur: Rekomendasi",         "Rekomendasi" in full_response or "rekomendasi" in full_response.lower()),
            ("Traceability: Skor RAG",        "Skor RAG" in full_response or "skor rag" in full_response.lower()),
            ("Traceability: Overlap Skill",   "Overlap Skill" in full_response or "overlap skill" in full_response.lower()),
            ("Faithfulness: ada judul posisi","di " in full_response),
            ("Streaming: TTFB < 10s",         first_token_time is not None and first_token_time < 10),
            ("Bahasa Indonesia",              any(w in full_response for w in ["yang", "dengan", "untuk", "adalah", "pada"])),
        ]
        all_pass = True
        for label, result in checks:
            icon = "[PASS]" if result else "[FAIL]"
            print(f"  {icon} {label}")
            if not result: all_pass = False
        print(f"\n  {'>>> SEMUA KRITERIA TERPENUHI <<<' if all_pass else '!!! ADA KRITERIA YANG GAGAL'}")

    except Exception as e:
        print(f"\nERROR: {e}")

if __name__ == "__main__":
    # Cek server dulu
    try:
        r = httpx.get(f"{BASE_URL}/health", timeout=5)
        print(f"Health check: {r.json()}")
    except Exception as e:
        print(f"Server tidak bisa dijangkau: {e}")
        sys.exit(1)

    # Jalankan satu test case dulu (T1) agar tidak terlalu lama
    test_recommend(TEST_CASES[0])
    print("\n\nMau test T2? Jalankan: python scripts/_test_api.py full")

    if len(sys.argv) > 1 and sys.argv[1] == "full":
        test_recommend(TEST_CASES[1])
