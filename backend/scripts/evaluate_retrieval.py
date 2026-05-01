"""
backend/scripts/evaluate_retrieval.py — Evaluasi RAG NusaNara
==============================================================
Menguji pipeline RAG dengan 2 konfigurasi:
  A. Tanpa Reranking   — semantic retrieval langsung
  B. Dengan Reranking  — semantic retrieval + skill-based reranker (sistem aktif)

Metrik yang digunakan:
  - Precision@k  (k=1,3,5): seberapa tepat dokumen yang diambil
  - MRR          : posisi rata-rata dokumen relevan pertama

Diposisikan sebagai VALIDASI sistem RAG, bukan benchmark IR klasik.
Metrik FTS tidak disertakan karena FTS hanya komponen fallback internal.

JALANKAN:
  python scripts/evaluate_retrieval.py

OUTPUT:
  evaluation/eval_summary_<timestamp>.csv
  evaluation/eval_detail_<timestamp>.csv
"""

import sys
import os
import json
import asyncio
import asyncpg
import csv
from datetime import datetime

if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from config import settings
from rag.search import hybrid_search
from rag.rerank import rerank

K_VALUES         = [1, 3, 5]
BINARY_THRESHOLD = 2   # relevance_score >= ini dianggap relevan

GROUND_TRUTH_PATH = os.path.join(os.path.dirname(__file__), "..", "evaluation", "ground_truth.json")
RESULTS_DIR       = os.path.join(os.path.dirname(__file__), "..", "evaluation")


# ─────────────────────────────────────────────────────
# METRIK
# ─────────────────────────────────────────────────────

def precision_at_k(retrieved: list[str], relevant: set[str], k: int) -> float:
    hits = sum(1 for t in retrieved[:k] if t in relevant)
    return hits / k if k > 0 else 0.0

def reciprocal_rank(retrieved: list[str], relevant: set[str]) -> float:
    for i, t in enumerate(retrieved, 1):
        if t in relevant:
            return 1.0 / i
    return 0.0


# ─────────────────────────────────────────────────────
# 2 KONFIGURASI RETRIEVAL
# ─────────────────────────────────────────────────────

async def retrieve_without_rerank(query: str, conn, top_k: int = 10) -> list[str]:
    """Konfigurasi A: semantic hybrid search saja, tanpa reranking."""
    docs = await hybrid_search(query, conn, top_k=top_k)
    return [d["title"] for d in docs]

async def retrieve_with_rerank(query: str, conn, top_k: int = 10) -> list[str]:
    """Konfigurasi B: semantic hybrid search + skill reranking (sistem aktif)."""
    docs    = await hybrid_search(query, conn, top_k=top_k)
    reranked = rerank(query, docs, top_n=top_k)
    return [d["title"] for d in reranked]

CONFIGS = {
    "Tanpa_Reranking": retrieve_without_rerank,
    "Dengan_Reranking": retrieve_with_rerank,
}


# ─────────────────────────────────────────────────────
# EVALUASI UTAMA
# ─────────────────────────────────────────────────────

async def evaluate_all():
    with open(GROUND_TRUTH_PATH, encoding="utf-8") as f:
        ground_truth = json.load(f)

    conn = await asyncpg.connect(settings.DATABASE_URL)

    print(f"\n{'='*60}")
    print(f"  NusaNara RAG — Evaluasi Sistem Bimbingan Karier")
    print(f"  Jumlah query uji : {len(ground_truth)}")
    print(f"  Konfigurasi      : {', '.join(CONFIGS.keys())}")
    print(f"  Metrik           : Precision@k, MRR  (k={K_VALUES})")
    print(f"{'='*60}\n")

    # Akumulasi
    results = {
        cfg: {f"P@{k}": [] for k in K_VALUES} | {"MRR": []}
        for cfg in CONFIGS
    }
    per_query_rows = []

    for qi, gt in enumerate(ground_truth, 1):
        query_id     = gt["query_id"]
        query        = gt["query"]
        grade_map    = {item["title"]: item["score"] for item in gt.get("graded_relevance", [])}
        relevant_set = {title for title, score in grade_map.items() if score >= BINARY_THRESHOLD}

        print(f"[{qi:02d}/{len(ground_truth)}] {query_id}: {query[:60]}...")

        for cfg_name, fn in CONFIGS.items():
            retrieved = await fn(query, conn, top_k=max(K_VALUES))

            for k in K_VALUES:
                results[cfg_name][f"P@{k}"].append(
                    precision_at_k(retrieved, relevant_set, k)
                )
            results[cfg_name]["MRR"].append(
                reciprocal_rank(retrieved, relevant_set)
            )

            per_query_rows.append({
                "query_id":       query_id,
                "cluster_target": ", ".join(gt.get("relevant_clusters", [])),
                "config":         cfg_name,
                "top5_retrieved": " | ".join(retrieved[:5]),
                **{f"P@{k}": precision_at_k(retrieved, relevant_set, k) for k in K_VALUES},
                "MRR":            reciprocal_rank(retrieved, relevant_set),
            })

        print()

    await conn.close()

    # ── Cetak tabel hasil ─────────────────────────────
    metric_order = [f"P@{k}" for k in K_VALUES] + ["MRR"]
    col_w = 20

    header = f"{'Metrik':<12}" + "".join(f"{c:>{col_w}}" for c in CONFIGS)
    print(f"\n{'='*60}")
    print(f"  HASIL EVALUASI (rata-rata {len(ground_truth)} query)")
    print(f"{'='*60}")
    print(header)
    print("-" * len(header))

    summary_rows = []
    for metric in metric_order:
        row_str  = f"{metric:<12}"
        row_data = {"metric": metric}
        for cfg in CONFIGS:
            vals = results[cfg][metric]
            avg  = sum(vals) / len(vals) if vals else 0.0
            row_str  += f"{avg:>{col_w}.4f}"
            row_data[cfg] = round(avg, 4)
        print(row_str)
        summary_rows.append(row_data)

    print("-" * len(header))

    # ── Analisis per cluster ──────────────────────────
    print(f"\n-- Precision@3 per Cluster Target --")
    clusters = sorted({
        cl
        for g in ground_truth
        for cl in g.get("relevant_clusters", [])
        if cl
    })
    for cl in clusters:
        ids = {g["query_id"] for g in ground_truth if cl in g.get("relevant_clusters", [])}
        print(f"  {cl:<35}", end="")
        for cfg in CONFIGS:
            idxs = [i for i, g in enumerate(ground_truth) if g["query_id"] in ids]
            vals = [results[cfg]["P@3"][i] for i in idxs]
            avg  = sum(vals) / len(vals) if vals else 0.0
            label = cfg.split("_")[0][:7]
            print(f"  {label}={avg:.3f}", end="")
        print()

    # ── Simpan CSV ────────────────────────────────────
    os.makedirs(RESULTS_DIR, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")

    summary_csv = os.path.join(RESULTS_DIR, f"eval_summary_{ts}.csv")
    detail_csv  = os.path.join(RESULTS_DIR, f"eval_detail_{ts}.csv")

    with open(summary_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["metric"] + list(CONFIGS.keys()))
        writer.writeheader()
        writer.writerows(summary_rows)

    detail_keys = ["query_id", "cluster_target", "config", "top5_retrieved",
                   "P@1", "P@3", "P@5", "MRR"]
    with open(detail_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=detail_keys)
        writer.writeheader()
        writer.writerows(per_query_rows)

    print(f"\n✓ Hasil evaluasi tersimpan:")
    print(f"  Summary : {summary_csv}")
    print(f"  Detail  : {detail_csv}")
    print(f"\n  Tabel summary siap disalin ke Bab 4 Skripsi.")


if __name__ == "__main__":
    asyncio.run(evaluate_all())
