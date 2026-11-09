 
 
from __future__ import annotations   # 讓 `int | None` 在 Python 3.9 也能用


def save_summary(db, result: dict) -> int | None:
    """
    把 summarize() 的結果存進 ai_summaries。
    只存成功的結果(ok=True);失敗的回傳 None,不寫入。
    成功時回傳新資料的 id。
    """
    import models   # 延遲載入,跟 news_store.py 一樣

    if not result.get("ok"):
        return None

    snapshot = result["input_snapshot"]
    row = models.AiSummary(
        scope=snapshot.get("scope"),
        summary_type=snapshot.get("type"),
        ref=snapshot["data"].get("period"),
        summary_text=result["summary_text"],
        model_name=result["model_name"],
        prompt_version=result["prompt_version"],
        input_snapshot=snapshot,
    )
    db.add(row)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(row)
    return row.id