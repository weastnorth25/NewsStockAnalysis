import sys
from database import SessionLocal
from market_aggregate import market_revenue_summary
from summarizer import summarize
from summary_store import save_summary

THOUSAND_PER_YI = 100_000   # 1 億元 = 100,000 千元


def run(year_month: str):
    y, m = year_month.split("-")
    db = SessionLocal()
    try:
        agg = market_revenue_summary(db, year_month)
        if agg is None:
            print(f"{year_month} 沒有可用的月營收資料,不產生摘要。")
            return

        payload = {
            "scope": "market",
            "type": "monthly_revenue",
            "ref": year_month,
            "data": {
                "period": f"{y}年{int(m)}月上市公司合計",
                # 資料庫存千元,摘要用億元
                "current": agg["revenue_total_thousand"] / THOUSAND_PER_YI,
                "year_ago": agg["year_ago_total_thousand"] / THOUSAND_PER_YI,
            },
            # 保留原始彙總(含家數、千元),之後追查數字來源用
            "source_aggregate": agg,
        }

        result = summarize(payload)
        print("summarize ok:", result["ok"], "| error:", result.get("error"))
        if not result["ok"]:
            return

        print("摘要:", result["summary_text"])
        new_id = save_summary(db, result)
        print("寫入 ai_summaries id:", new_id)
    finally:
        db.close()


if __name__ == "__main__":
    run(sys.argv[1] if len(sys.argv) > 1 else "2026-09")