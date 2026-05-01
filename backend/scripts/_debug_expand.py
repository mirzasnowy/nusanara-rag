"""Debug: trace persis embedding input untuk setiap query evaluasi"""
import asyncio, asyncpg, os, sys
if sys.stdout.encoding != "utf-8": sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.dirname(__file__) + "/..")
from dotenv import load_dotenv; load_dotenv()
from rag.search import _expand_query, _build_fts_keywords, _DOMAIN_KEYWORDS

QUERIES_TO_TEST = [
    ("q06 Bisnis", "Saya punya kemampuan project management dan komunikasi bisnis. Berpengalaman koordinasi tim lintas departemen."),
    ("q09 Teknologi", "Saya seorang backend developer dengan 1 tahun pengalaman menggunakan Node.js dan PostgreSQL."),
    ("q11 Sales", "Saya berpengalaman 2 tahun sebagai Sales Executive di perusahaan B2B. Terbiasa negosiasi dan closing deal."),
    ("q12 CS", "Saya bekerja sebagai customer service selama 3 tahun, terbiasa menangani keluhan pelanggan melalui telepon dan chat."),
    ("q15 Education", "Saya guru matematika SMA dengan pengalaman 3 tahun. Ingin beralih ke bidang pelatihan dan training korporat."),
    ("q13 Finance", "Saya lulusan S1 Akuntansi, sudah lulus ujian CPA, pengalaman audit di KAP selama 2 tahun."),
]

for label, q in QUERIES_TO_TEST:
    expanded = _expand_query(q)
    fts = _build_fts_keywords(q)
    if " | Domain: " in expanded:
        domain_part = expanded.split(" | Domain: ")[1]
        domain_terms = " | ".join(domain_part.split(" | ")[:2])
        embedding_input = f"search_query: {domain_terms}"
    else:
        embedding_input = f"search_query: {q}"
    
    matched_kws = [kw for kw in _DOMAIN_KEYWORDS if kw in q.lower()]
    
    print(f"\n{'─'*60}")
    print(f"  {label}")
    print(f"  Matched keywords : {matched_kws}")
    print(f"  Embedding input  : {embedding_input[:100]}")
    print(f"  FTS keywords     : {fts}")
