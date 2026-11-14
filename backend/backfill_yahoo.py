"""
補抓 Yahoo 股市過去幾天的新聞(一次性使用,讓情緒走勢先有資料)。

Yahoo 的 sitemap 一天一份,每天上千篇,全部抓太久,所以每天平均抽樣 N 篇。
沿用爬蟲的規則:先查 robots.txt、同一網站限速、已存在的網址自動略過。

用法(在 backend 資料夾、啟動 .venv 後):
    python backfill_yahoo.py                          # 只看 sitemap 有哪幾天、每天幾篇,不抓內文、不寫資料庫
    python backfill_yahoo.py --days 14 --per-day 60 --apply
    python backfill_yahoo.py --date 2026-11-12 --per-day 150 --apply   # 只補某一天
注意:sitemap 的日期是 UTC,例如「11/12」涵蓋台灣時間 11/12 08:00 ~ 11/13 08:00。
補完後記得跑:python tag_news_sentiment.py --apply --limit 2000
"""
from __future__ import annotations

import argparse
import logging
import re
import xml.etree.ElementTree as ET
from datetime import date, datetime, timedelta

import industry_lookup as il
import news_sources as ns
import news_store as store

log = logging.getLogger("backfill_yahoo")


def dated_sitemaps(f) -> list:
    """[(日期字串, sitemap 網址)],由新到舊。"""
    r = f.get(ns.YAHOO_SITEMAP_INDEX)
    if not r:
        return []
    root = ET.fromstring(r.content)
    out = []
    for e in root.findall("sm:sitemap/sm:loc", ns.SM_NS):
        m = re.search(r"news-sitemap-(\d{4}-\d{2}-\d{2})\.xml", e.text or "")
        if m:
            out.append((m.group(1), e.text.strip()))
    return sorted(out, reverse=True)


def spread(items: list, n: int) -> list:
    """從整天的文章裡平均挑 n 篇(不是只挑最新的 n 篇),讓一天的不同時段都有。"""
    if len(items) <= n:
        return items
    step = len(items) / n
    return [items[int(i * step)] for i in range(n)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=14, help="補過去幾天(不含今天)")
    ap.add_argument("--per-day", type=int, default=60, help="每天最多抓幾篇")
    ap.add_argument("--delay", type=float, default=1.5, help="同一網站兩次請求的間隔秒數")
    ap.add_argument("--date", help="只補這一天的 sitemap,例如 2026-11-12(會忽略 --days)")
    ap.add_argument("--apply", action="store_true", help="真的抓內文並寫入資料庫;沒加就只列出數量")
    args = ap.parse_args()

    f = ns.Fetcher(delay=args.delay)
    today = date.today().isoformat()
    oldest = (date.today() - timedelta(days=args.days)).isoformat()
    if args.date:
        maps = [(d, u) for d, u in dated_sitemaps(f) if d == args.date]
    else:
        maps = [(d, u) for d, u in dated_sitemaps(f) if oldest <= d < today]
    if not maps:
        print("sitemap 索引裡找不到這段期間的資料,Yahoo 可能只保留最近幾天。")
        return
    print(f"sitemap 有 {len(maps)} 天可以補:{maps[-1][0]} ~ {maps[0][0]}")

    SessionLocal = classify = None
    if args.apply:
        from database import SessionLocal
        from ai_service import classify_industry      # 會載入分類模型
        classify = classify_industry

    total = 0
    for day, url in maps:
        r = f.get(url)
        arts = sorted(ns.parse_news_sitemap(r.content, "yahoo") if r else [],
                      key=lambda a: a.published_at or datetime.min, reverse=True)
        if SessionLocal is not None:
            # 只在查詢時連線,查完就關,不要在抓內文的幾分鐘裡一直佔著連線(會被 Supabase 斷掉)
            with SessionLocal() as db:
                seen = store.existing_urls(db, [a.url for a in arts])
            arts = [a for a in arts if a.url not in seen]
        picked = spread(arts, args.per_day)
        if not args.apply:
            print(f"  {day}:sitemap 有 {len(arts)} 篇,會抽 {len(picked)} 篇")
            continue

        rows = []
        for a in picked:
            if not ns.fill_content(f, a):
                continue
            tickers = ns.extract_tickers(f"{a.title}\n{a.content}")
            codes = il.codes_for_classification(a.title, a.content, tickers)
            res = classify(f"標題：{a.title}\n內文：{a.content}"[:800], related_stocks=codes)
            rows.append(store.make_row(
                title=a.title, content=a.content, url=a.url, published_at=a.published_at,
                source="yahoo", category=res["category"], category_score=res["score"],
                related_stocks=tickers,
            ))
        inserted = 0
        if rows:
            with SessionLocal() as db:          # 寫入時才重新連線
                inserted = store.insert_news(db, rows)
        total += inserted
        print(f"  {day}:抽 {len(picked)} 篇,抓到內文 {len(rows)} 篇,寫入 {inserted} 篇")

    if args.apply:
        print(f"\n共寫入 {total} 篇。接著執行:python tag_news_sentiment.py --apply --limit 2000")
    else:
        print("\n這是預覽,沒有抓內文也沒有寫入。確認後加上 --apply。")
    if f.blocked_hosts:
        print("⚠ 以下網站拒絕存取:" + "、".join(sorted(f.blocked_hosts)))


if __name__ == "__main__":
    logging.basicConfig(level=logging.WARNING, format="%(asctime)s %(levelname)s %(message)s")
    main()