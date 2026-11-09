from __future__ import annotations   # 讓 `int | None` 在 Python 3.9 也能用
import os
from datetime import datetime

import requests

TWSE_URL = os.getenv(
    "TWSE_REVENUE_URL",
    "https://openapi.twse.com.tw/v1/opendata/t187ap05_L",
)


def roc_to_year_month(s: str) -> str:
    """民國年月轉成西元:'11509' -> '2026-09'"""
    s = str(s).strip()
    return f"{int(s[:-2]) + 1911}-{int(s[-2:]):02d}"


def to_int(value) -> int | None:
    """官方數字是字串,可能有逗號或空白。無法轉換就回傳 None,不亂填 0。"""
    if value is None:
        return None
    text = str(value).replace(",", "").strip()
    if text in ("", "-"):
        return None
    try:
        return int(text)
    except ValueError:
        try:
            return int(float(text))
        except ValueError:
            return None


def fetch_listed_revenue() -> list[dict]:
    """抓上市公司月營收快照,清洗成可寫入 monthly_revenue 的資料。"""
    resp = requests.get(TWSE_URL, timeout=30)
    resp.raise_for_status()

    rows = []
    for d in resp.json():
        symbol = (d.get("公司代號") or "").strip()
        ym = d.get("資料年月")
        if not symbol or not ym:
            continue
        rows.append({
            "symbol": symbol,
            "company_name": d.get("公司名稱"),
            "industry": d.get("產業別"),
            "market": "listed",
            "year_month": roc_to_year_month(ym),
            "revenue": to_int(d.get("營業收入-當月營收")),
            "revenue_prev_month": to_int(d.get("營業收入-上月營收")),
            "revenue_year_ago": to_int(d.get("營業收入-去年當月營收")),
            "remark": d.get("備註") or None,
            "report_date": d.get("出表日期"),
            "source": "twse_openapi",
        })
    return rows


def upsert_revenue(db, rows: list[dict], batch_size: int = 200) -> int:
    """
    批次寫入。(symbol, year_month) 已存在就更新,所以可以放心重複執行。
    回傳寫入或更新的筆數。
    """
    import models
    from sqlalchemy.dialects.postgresql import insert as pg_insert

    now = datetime.utcnow()
    # 同一批若有重複的 key,PostgreSQL 會報錯,所以先去重
    unique = {(r["symbol"], r["year_month"]): {**r, "fetched_at": now} for r in rows}
    rows = list(unique.values())

    update_cols = [
        "company_name", "industry", "revenue", "revenue_prev_month",
        "revenue_year_ago", "remark", "report_date", "fetched_at",
    ]
    saved = 0
    try:
        for i in range(0, len(rows), batch_size):
            chunk = rows[i : i + batch_size]
            stmt = pg_insert(models.MonthlyRevenue).values(chunk)
            stmt = stmt.on_conflict_do_update(
                index_elements=["symbol", "year_month"],
                set_={c: stmt.excluded[c] for c in update_cols},
            )
            result = db.execute(stmt)
            saved += result.rowcount or 0
        db.commit()
    except Exception:
        db.rollback()
        raise
    return saved


if __name__ == "__main__":
    from database import SessionLocal
    import models

    rows = fetch_listed_revenue()
    if not rows:
        raise SystemExit("沒有抓到任何資料,不寫入。")

    months = sorted({r["year_month"] for r in rows})
    print(f"抓到 {len(rows)} 筆,資料月份: {months}")

    db = SessionLocal()
    try:
        saved = upsert_revenue(db, rows)
        print(f"寫入或更新 {saved} 筆")

        for ym in months:
            n = db.query(models.MonthlyRevenue).filter(
                models.MonthlyRevenue.year_month == ym
            ).count()
            print(f"資料庫中 {ym} 共 {n} 筆")

        tsmc = db.query(models.MonthlyRevenue).filter_by(
            symbol="2330", year_month=months[-1]
        ).first()
        if tsmc:
            print("2330 當月 / 上月 / 去年同月(千元):",
                  tsmc.revenue, tsmc.revenue_prev_month, tsmc.revenue_year_ago)
    finally:
        db.close()