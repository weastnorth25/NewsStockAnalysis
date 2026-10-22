"""
把已分類好的 xlsx（例如 backend/ctee_analyzed.xlsx）一次匯入 Supabase 的 news 表。
網址重複的會自動略過，所以重複執行是安全的。

用法（在專案根目錄執行）：
    python backend/import_xlsx_to_db.py --dry-run     # 只檢查資料、印出筆數與範例，不連資料庫
    python backend/import_xlsx_to_db.py               # 正式匯入
    python backend/import_xlsx_to_db.py --file backend/其他檔案.xlsx --source cnyes

欄位對應：
    title_tw -> title        content_tw -> content     url -> url
    第一欄(日期) -> published_at     stock_id -> related_stocks（「其他」或空白 -> 不填）
    AI_Category -> category          Confidence_Score -> category_score
    sentiment -> sentiment
"""
from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime

import pandas as pd

import news_store as store

DEFAULT_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ctee_analyzed.xlsx")
REQUIRED = ["title_tw", "content_tw", "url"]


def _text(v) -> str | None:
    if v is None or (isinstance(v, float) and pd.isna(v)) or v is pd.NaT:
        return None
    s = str(v).strip()
    return s or None


def _ticker(v) -> str | None:
    s = _text(v)
    if s is None or s == "其他":
        return None
    return s[:-2] if s.endswith(".0") else s     # Excel 有時會把 1216 存成 1216.0


def load_rows(path: str, source: str = "ctee", reclassify: bool = False) -> tuple[list[dict], dict]:
    """讀 xlsx -> 回傳 (要寫入的資料列, 統計)。不碰資料庫，方便單獨測試。"""
    df = pd.read_excel(path)
    missing = [c for c in REQUIRED if c not in df.columns]
    if missing:
        raise SystemExit(f"xlsx 缺少必要欄位：{missing}；實際欄位：{list(df.columns)}")

    # 日期欄：檔案裡第一欄（欄名是 Unnamed: 0）是 datetime
    date_col = None
    if pd.api.types.is_datetime64_any_dtype(df.iloc[:, 0]):
        date_col = df.columns[0]

    stats = {"rows": len(df), "imported": 0, "skipped_empty": 0, "skipped_dup": 0}
    rows: list[dict] = []
    seen: set[str] = set()

    for _, r in df.iterrows():
        title, content, url = _text(r["title_tw"]), _text(r["content_tw"]), _text(r["url"])
        if not (title and content and url):       # news.title / content 是必填
            stats["skipped_empty"] += 1
            continue
        if url in seen:
            stats["skipped_dup"] += 1
            continue
        seen.add(url)

        published = None
        if date_col is not None and pd.notna(r[date_col]):
            # xlsx 的日期是台灣時間、沒有時區 -> 轉成 UTC（與爬蟲、資料庫預設一致）
            ts = pd.Timestamp(r[date_col]).tz_localize("Asia/Taipei").tz_convert("UTC").tz_localize(None)
            published = ts.to_pydatetime()

        score = r.get("Confidence_Score")
        rows.append(store.make_row(
            title=title, content=content, url=url,
            published_at=published or datetime.utcnow(),
            source=source,
            category=_text(r.get("AI_Category")),
            category_score=None if score is None or pd.isna(score) else float(score),
            sentiment=(_text(r.get("sentiment")) or "")[:20] or None,
            related_stocks=_ticker(r.get("stock_id")),
        ))
    if reclassify:
        # 原本被判成「未分類」、但有股票代號的，改用該公司的產業別（需要 industry_map.json）
        import industry_lookup

        stats["reclassified"] = 0
        for row in rows:
            if row["category"] == "未分類" and row["related_stocks"]:
                hit = industry_lookup.classify_by_stocks(row["related_stocks"])
                if hit:
                    row["category"], row["category_score"] = hit["category"], hit["score"]
                    stats["reclassified"] += 1
    stats["imported"] = len(rows)
    stats["unclassified"] = sum(r["category"] == "未分類" for r in rows)
    return rows, stats


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="把分類好的 xlsx 匯入 Supabase")
    ap.add_argument("--file", default=DEFAULT_FILE)
    ap.add_argument("--source", default="ctee", help="寫入 news.source 的值（預設 ctee）")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--reclassify", action="store_true",
                    help="把「未分類」且有股票代號的新聞，改用公司產業別重新分類（需先執行 build_industry_map.py）")
    args = ap.parse_args(argv)

    rows, stats = load_rows(args.file, args.source, args.reclassify)
    print(f"讀取 {stats['rows']} 列 -> 可匯入 {stats['imported']}｜內容不全略過 {stats['skipped_empty']}｜檔內重複略過 {stats['skipped_dup']}")
    if args.reclassify:
        print(f"重新分類：{stats['reclassified']} 筆從「未分類」改成有分類｜目前未分類剩 {stats['unclassified']} / {stats['imported']} 筆")
    if rows:
        s = rows[0]
        print(f"範例：{s['published_at']}｜{s['category']}({s['category_score']})｜{s['related_stocks']}｜{s['title'][:30]}")

    if args.dry_run:
        print("（dry-run：沒有寫入資料庫）")
        return 0

    from database import SessionLocal   # 需要 DATABASE_URL
    db = SessionLocal()
    try:
        inserted = store.insert_news(db, rows)
    finally:
        db.close()
    print(f"實際新增 {inserted} 筆（網址已存在的會自動略過）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
