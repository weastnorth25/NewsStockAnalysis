#大盤合計

from __future__ import annotations
from sqlalchemy import func


def market_revenue_summary(db, year_month: str) -> dict | None:
    """
    算某個月份「上市公司合計」的月營收與年增率。金額單位:千元。
    沒有該月資料時回傳 None。
    """
    import models
    M = models.MonthlyRevenue

    # 已公布家數:當月營收有數字的公司
    reported = db.query(func.count(M.id)).filter(
        M.year_month == year_month, M.revenue.isnot(None)
    ).scalar()
    if not reported:
        return None

    # 年增率只用「當月和去年同月都有數字」的公司,
    # 這樣分子分母是同一批公司,新上市(沒有去年資料)的公司不會讓年增率虛高
    cur_sum, ago_sum, comparable = (
        db.query(
            func.sum(M.revenue),
            func.sum(M.revenue_year_ago),
            func.count(M.id),
        )
        .filter(
            M.year_month == year_month,
            M.revenue.isnot(None),
            M.revenue_year_ago.isnot(None),
            M.revenue_year_ago > 0,
        )
        .one()
    )
    if not comparable or not ago_sum:
        return None

    cur_sum, ago_sum = int(cur_sum), int(ago_sum)
    return {
        "year_month": year_month,
        "reported_companies": reported,       # 已公布家數
        "comparable_companies": comparable,   # 納入年增率計算的家數
        "revenue_total_thousand": cur_sum,    # 當月合計,千元
        "year_ago_total_thousand": ago_sum,   # 去年同月合計,千元
        "yoy_pct": round((cur_sum / ago_sum - 1) * 100, 2),
    }


if __name__ == "__main__":
    from database import SessionLocal
    from revenue_fetcher import fetch_listed_revenue

    ym = "2026-09"
    db = SessionLocal()
    try:
        result = market_revenue_summary(db, ym)
        print("資料庫算出:", result)
    finally:
        db.close()

    # 用官方原始資料在 Python 裡獨立再算一次,交叉驗證
    rows = [r for r in fetch_listed_revenue()
            if r["year_month"] == ym and r["revenue"] is not None
            and r["revenue_year_ago"] and r["revenue_year_ago"] > 0]
    cur = sum(r["revenue"] for r in rows)
    ago = sum(r["revenue_year_ago"] for r in rows)
    print("Python 獨立驗算:", len(rows), cur, ago, round((cur / ago - 1) * 100, 2))