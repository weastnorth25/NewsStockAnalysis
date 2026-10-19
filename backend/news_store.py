"""
把新聞寫進 Supabase 的 news 表。

注意：models / sqlalchemy 在函式裡才 import（延遲載入），
這樣 --dry-run 不需要資料庫連線設定也能跑。
"""
from __future__ import annotations

from datetime import datetime


def make_row(
    *,
    title: str,
    content: str,
    url: str,
    published_at: datetime | None,
    source: str,
    category: str | None = None,
    category_score: float | None = None,
    sentiment: str | None = None,
    related_stocks: str | None = None,
) -> dict:
    """組出一筆要寫入 news 表的資料。每一筆的 key 必須一致（批次 INSERT 的要求）。"""
    return {
        "title": title,
        "content": content,
        "url": url,
        "published_at": published_at or datetime.utcnow(),
        "source": source,
        "category": category,
        "category_score": category_score,
        "sentiment": sentiment,
        "related_stocks": related_stocks,
    }


def existing_urls(db, urls: list[str]) -> set[str]:
    """查出哪些網址已經在資料庫裡，避免重複爬、重複分類。"""
    import models

    found: set[str] = set()
    for i in range(0, len(urls), 500):
        chunk = urls[i : i + 500]
        found.update(u for (u,) in db.query(models.News.url).filter(models.News.url.in_(chunk)))
    return found


def insert_news(db, rows: list[dict], batch_size: int = 50) -> int:
    """
    批次寫入。網址重複就略過（ON CONFLICT (url) DO NOTHING），所以爬蟲可以放心重複執行。
    回傳實際新增的筆數。
    """
    import models
    from sqlalchemy.dialects.postgresql import insert as pg_insert

    inserted = 0
    try:
        for i in range(0, len(rows), batch_size):
            chunk = rows[i : i + batch_size]
            stmt = pg_insert(models.News).values(chunk).on_conflict_do_nothing(index_elements=["url"])
            result = db.execute(stmt)
            inserted += result.rowcount or 0
        db.commit()
    except Exception:
        db.rollback()
        raise
    return inserted
