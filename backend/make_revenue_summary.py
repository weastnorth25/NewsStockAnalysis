import sys
from database import SessionLocal
import models
from market_aggregate import market_revenue_summary, month_is_complete
from summarizer import summarize, PROMPT_VERSION
from summary_store import save_summary

THOUSAND_PER_YI = 100_000   # 1 億元 = 100,000 千元


def run(year_month: str, force: bool = False):
    y, m = year_month.split("-")
    db = SessionLocal()
    try:
        if not force and not month_is_complete(db, year_month):
            print(f"[摘要] {year_month} 資料尚未完整,不產生。")
            return

        agg = market_revenue_summary(db, year_month)
        if agg is None:
            print(f"[摘要] {year_month} 沒有可用的月營收資料,不產生。")
            return

        if not force:
            existing = (
                db.query(models.AiSummary)
                .filter_by(scope="market", summary_type="monthly_revenue", ref=year_month)
                .order_by(models.AiSummary.created_at.desc())
                .first()
            )
            if existing and existing.prompt_version == PROMPT_VERSION:
                old = (existing.input_snapshot or {}).get("source_aggregate", {})
                if old.get("revenue_total_thousand") == agg["revenue_total_thousand"]:
                    print(f"[摘要] {year_month} 已有最新摘要(id={existing.id}),略過。")
                    return

        payload = {
            "scope": "market",
            "type": "monthly_revenue",
            "ref": year_month,
            "data": {
                "period": f"{y}年{int(m)}月上市公司合計",
                "current": agg["revenue_total_thousand"] / THOUSAND_PER_YI,
                "year_ago": agg["year_ago_total_thousand"] / THOUSAND_PER_YI,
            },
            "source_aggregate": agg,
        }

        result = summarize(payload)
        if not result["ok"]:
            print(f"[摘要] 產生失敗: {result.get('error')}")
            return

        new_id = save_summary(db, result)
        print(f"[摘要] 已寫入 id={new_id}:{result['summary_text']}")
    finally:
        db.close()


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    run(args[0] if args else "2026-09", force="--force" in sys.argv)