import json, sys
if sys.stdout.encoding != "utf-8": sys.stdout.reconfigure(encoding="utf-8")

try:
    with open("evaluation/ground_truth.json", encoding="utf-8") as f:
        data = json.load(f)
    print(f"✓ JSON valid: {len(data)} queries")
    for q in data:
        qid     = q['query_id']
        query   = q['query'][:55]
        n_rel   = len([x for x in q.get('graded_relevance', []) if x['score'] >= 2])
        print(f"  {qid}: {query}... ({n_rel} relevant)")
except json.JSONDecodeError as e:
    print(f"✗ JSON ERROR: {e}")
