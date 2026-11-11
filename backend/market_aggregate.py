#大盤合計
from __future__ import annotations
from datetime import date, datetime, timedelta
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

#篩選條件跟整體合計完全相同,所以各產業的「貢獻」加起來會等於整體年增率
def _prev_month(ym: str) -> str:
    y, m = map(int, ym.split("-"))
    return f"{y - 1}-12" if m == 1 else f"{y}-{m - 1:02d}"


def _deadline(ym: str) -> date:
    """法定申報期限:次月 10 日。"""
    y, m = map(int, ym.split("-"))
    ny, nm = (y + 1, 1) if m == 12 else (y, m + 1)
    return date(ny, nm, 10)


def _today_tw() -> date:
    return (datetime.utcnow() + timedelta(hours=8)).date()


def month_is_complete(db, year_month: str, threshold: float = 0.95) -> bool:
    """該月份的月營收資料是否已經完整,可以當成正式數字使用。"""
    import models
    M = models.MonthlyRevenue

    def reported(ym):
        return db.query(func.count(M.id)).filter(
            M.year_month == ym, M.revenue.isnot(None)
        ).scalar() or 0

    cur = reported(year_month)
    if cur == 0:
        return False
    if _today_tw() <= _deadline(year_month):
        return False                      # 還沒過申報期限,一定還有公司沒報
    prev = reported(_prev_month(year_month))
    return prev == 0 or cur >= prev * threshold


def latest_revenue_month(db, only_complete: bool = True):
    """最新的資料月份。預設只看「完整」的月份,不完整的月份存在資料庫裡但不會被採用。"""
    import models
    months = [r[0] for r in db.query(models.MonthlyRevenue.year_month)
              .distinct().order_by(models.MonthlyRevenue.year_month.desc())]
    for ym in months:
        if not only_complete or month_is_complete(db, ym):
            return ym
    return None

def revenue_by_industry(db, year_month: str) -> list[dict]:
    """各產業的家數、占比、年增率,以及對整體年增率的貢獻(百分點)。"""
    import models
    M = models.MonthlyRevenue

    rows = (
        db.query(M.industry, func.count(M.id), func.sum(M.revenue), func.sum(M.revenue_year_ago))
        .filter(M.year_month == year_month, M.revenue.isnot(None), M.revenue_year_ago > 0)
        .group_by(M.industry)
        .all()
    )
    total_cur = sum(int(r[2]) for r in rows)
    total_ago = sum(int(r[3]) for r in rows)
    if not total_cur or not total_ago:
        return []

    result = []
    for industry, n, cur, ago in rows:
        cur, ago = int(cur), int(ago)
        result.append({
            "industry": industry or "未分類",
            "companies": n,
            "revenue_thousand": cur,
            "share_pct": round(cur / total_cur * 100, 1),
            "yoy_pct": round((cur / ago - 1) * 100, 1),
            "contribution_pts": round((cur - ago) / total_ago * 100, 1),
        })
    result.sort(key=lambda x: x["contribution_pts"], reverse=True)
    return result

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