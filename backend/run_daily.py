import sys
from database import SessionLocal
from revenue_fetcher import fetch_listed_revenue, upsert_revenue
from market_aggregate import latest_revenue_month
import make_revenue_summary


def main(skip_summary: bool = False):
    # 1. 抓取並寫入。失敗不中斷,沿用資料庫既有資料。
    try:
        rows = fetch_listed_revenue()
        if rows:
            db = SessionLocal()
            try:
                saved = upsert_revenue(db, rows)
            finally:
                db.close()
            months = sorted({r["year_month"] for r in rows})
            print(f"[抓取] {len(rows)} 筆,月份 {months},寫入或更新 {saved} 筆")
        else:
            print("[抓取] 官方沒有回傳資料")
    except Exception as e:
        print(f"[抓取] 失敗:{e}(沿用資料庫既有資料)")

    # 2. 找最新的「完整」月份
    db = SessionLocal()
    try:
        ym = latest_revenue_month(db)
    finally:
        db.close()
    if not ym:
        print("[月份] 資料庫裡沒有完整的月份。")
        return
    print(f"[月份] 最新完整月份:{ym}")

    # 3. 產生摘要(需要 Ollama 開著)
    if skip_summary:
        print("[摘要] 已指定 --no-summary,略過。")
        return
    make_revenue_summary.run(ym)


if __name__ == "__main__":
    main(skip_summary="--no-summary" in sys.argv)