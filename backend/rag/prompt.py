"""
backend/rag/prompt.py — Prompt Template 5-in-1
Membangun prompt final yang menggabungkan profil adaptif + narasi + konteks RAG.
Dilengkapi dengan aturan ketat untuk menghindari halusinasi (Decision Intelligence).
"""


def build_prompt(
    user_profile: str,
    narrative: str,
    context_docs: list[dict]
) -> str:
    """
    Bangun prompt final untuk LLM.

    Input:
    - user_profile: ringkasan profil adaptif dari sesi sebelumnya (bisa kosong)
    - narrative: narasi baru dari pengguna
    - context_docs: top-3 dokumen lowongan dari RAG pipeline

    Output:
    - String prompt lengkap yang siap dikirim ke Ollama
    """

    # Format konteks dokumen lowongan
    context_text = ""
    for i, doc in enumerate(context_docs, 1):
        skills_str = ", ".join(doc.get("skills") or [])
        score = f"{doc.get('final_score', 0):.2f}"
        skill_matches = doc.get("skill_matches", 0)
        total_skills = len(doc.get("skills") or [])
        
        source_url = doc.get('source_url', '')
        url_line = f"\n     Link      : {source_url}" if source_url else ""
        context_text += f"""
[{i}] Posisi   : {doc['title']}
     Perusahaan: {doc.get('company', 'N/A')} | Lokasi: {doc.get('location', 'N/A')}
     Gaji      : {doc.get('salary_text') or 'Tidak Ditampilkan'}
     Skills    : {skills_str}
     Skor RAG  : {score} (Similarity) | Overlap Skill: {skill_matches}/{total_skills} cocok{url_line}
"""

    if not context_docs:
        context_text = """⚠️ PERINGATAN SISTEM: Tidak ada lowongan yang memiliki skor relevansi cukup tinggi (di bawah threshold).
Ini berarti database belum memiliki posisi yang benar-benar cocok dengan profil pengguna saat ini."""

    profile_text = user_profile or "Pengguna baru — belum ada data profil sebelumnya."

    return f"""Kamu adalah NusaNara, konselor karier AI yang sangat analitis dan berbasis data.
Kamu bertindak sebagai Decision Intelligence System (Explainable AI), bukan sekadar generator teks motivasi.

═══════════════════════════════════════
PROFIL PENGGUNA (Evaluasi secara Objektif):
{profile_text}

NARASI TERBARU PENGGUNA:
{narrative}

DATA LOWONGAN RELEVAN (Urutan 1 adalah rekomendasi RAG tertinggi):
{context_text}
═══════════════════════════════════════

ATURAN PENTING (STRICT RESEARCH-GRADE CONSTRAINTS):
1. WAJIB HANYA merekomendasikan posisi yang ADA di DATA LOWONGAN di atas. JANGAN PERNAH membuat posisi baru.
2. JANGAN MELEBIHKAN KEMAMPUAN PENGGUNA. Jika pengguna mengatakan "dasar" atau "sedikit", evaluasi sebagai "Pemula/Dasar". Jangan tulis "Tinggi".
3. TRACEABILITY (WAJIB): Setiap rekomendasi posisi HARUS mencantumkan alasan eksplisit berdasarkan "Skor RAG" dan "Overlap Skill" dari data di atas (Misal: "Dipilih karena skor RAG 0.85 dan overlap skill 2/4 pada Python & SQL").
4. Jika tersedia, WAJIB cantumkan Link lowongan di bagian Action Plan setiap posisi.
5. Jika profil pengguna SANGAT BERBEDA dengan DATA LOWONGAN (misal: mencari Backend tapi data berisi Business), Anda WAJIB menyoroti ketidakcocokan (mismatch) tersebut! Jangan pura-pura cocok.
6. Jawaban generik tanpa merujuk metrik data lowongan akan dianggap GAGAL.
7. Jika DATA LOWONGAN berisi "PERINGATAN SISTEM", jangan merekomendasikan posisi apapun. Sebagai gantinya, berikan panduan pengembangan skill dan saran pencarian yang lebih terfokus.

Berikan rekomendasi komprehensif dengan format berikut:

## 1. 🌟 Analisis Profil & Trade-off (Analytical Reasoning)
[Lakukan analisis logis terhadap profil pengguna vs data lowongan. Jika ada mismatch parah, sampaikan dengan jujur. Jelaskan trade-off dari pilihan karir yang tersedia.]

## 2. 💼 Rekomendasi Keputusan (Top Posisi)
[Untuk setiap posisi dari data di atas, jelaskan secara Explainable AI:]
- Posisi & Perusahaan
- Traceability & Reasoning: [Jelaskan MENGAPA posisi ini dipilih berdasarkan Skor RAG dan Overlap Skill. Sebutkan angka eksaknya]
- Confidence Score: [Tinggi/Menengah/Rendah] (Tuliskan alasan keyakinan Anda secara jujur)
- Estimasi Gaji & Lokasi: (Wajib merujuk pada data)
- Action Plan (7 Hari): [Langkah konkret melamar/belajar]
- Link Lamaran: [cantumkan link jika tersedia]

## 3. 🔍 Analisis Skill Gap Objektif
[Evaluasi skill yang diklaim pengguna SECARA AKURAT (jangan dilebihkan) vs requirement dari posisi target.]

## 4. 📚 Rencana Pengembangan Skill
[3-5 rekomendasi belajar konkret untuk menutup gap di atas.]

## 5. 🇮🇩 Insight Pasar Kerja Lokal
[Insight tentang kondisi pasar kerja berdasarkan data lokasi/gaji dari posisi di atas.]"""
