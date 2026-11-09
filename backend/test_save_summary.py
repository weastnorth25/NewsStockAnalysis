import json
from database import SessionLocal
import models
from summarizer import summarize
from summary_store import save_summary

payload = {
    "scope": "market",
    "type": "monthly_revenue",
    "data": {"period": "2026年9月", "current": 2850, "year_ago": 2500},
}

result = summarize(payload)
print("summarize ok:", result["ok"], "| error:", result.get("error"))

db = SessionLocal()
try:
    new_id = save_summary(db, result)
    print("寫入 id:", new_id)

    if new_id is not None:
        row = db.query(models.AiSummary).filter(models.AiSummary.id == new_id).first()
        print("查回來的摘要:", row.summary_text)
        print("scope / type / ref:", row.scope, row.summary_type, row.ref)
        print("模型 / prompt:", row.model_name, row.prompt_version)
        print("快照:", json.dumps(row.input_snapshot, ensure_ascii=False))
        print("建立時間:", row.created_at)
finally:
    db.close()