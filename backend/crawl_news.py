"""
爬取新聞 -> AI 分類 -> 寫入 Supabase

用法（在專案根目錄執行）：
    python backend/crawl_news.py --dry-run --no-classify --limit 3   # 只試抓：不分類、不寫資料庫
    python backend/crawl_news.py --dry-run --limit 3                 # 抓 + 分類，只印出結果
    python backend/crawl_news.py                                     # 正式：抓 + 分類 + 寫入
    python backend/crawl_news.py --sources cnyes yahoo --limit 20    # 指定來源與數量

流程：取得清單 -> 扣掉資料庫已有的網址 -> 取最新的 N 篇「新」新聞 -> 抓全文 -> 分類 -> 寫入
"""
from __future__ import annotations

import argparse
import logging
import sys

import news_sources as ns
import news_store as store

log = logging.getLogger("crawl_news")


def parse_args(argv=None):
    ap = argparse.ArgumentParser(description="爬取新聞、分類並寫入資料庫")
    ap.add_argument("--sources", nargs="+", default=list(ns.SOURCES), choices=list(ns.SOURCES),
                    help="要爬的來源（預設全部）")
    ap.add_argument("--limit", type=int, default=30, help="每個來源最多處理幾篇『新』新聞（預設 30）")
    ap.add_argument("--delay", type=float, default=1.5, help="同一網站兩次請求的最短間隔秒數（預設 1.5）")
    ap.add_argument("--dry-run", action="store_true", help="不連資料庫、不寫入，只印出結果")
    ap.add_argument("--no-classify", action="store_true", help="不跑 AI 分類（不用載入模型，測試爬蟲用）")
    return ap.parse_args(argv)


def crawl_one(src: str, fetcher: ns.Fetcher, classify, db, args) -> dict:
    stats = {"listed": 0, "new": 0, "no_content": 0, "inserted": 0}

    arts = ns.list_articles(src, fetcher)
    stats["listed"] = len(arts)

    if db is not None:   # 先扣掉已經存過的，不用再抓全文、再分類
        seen = store.existing_urls(db, [a.url for a in arts])
        arts = [a for a in arts if a.url not in seen]
    arts = arts[: args.limit]
    stats["new"] = len(arts)

    rows = []
    for i, a in enumerate(arts, 1):
        if not ns.fill_content(fetcher, a):
            stats["no_content"] += 1
            log.warning("[%s] 抓不到內文，略過：%s", src, a.url)
            continue

        category = score = None
        if classify:
            # 與 process_cvs.py 相同的輸入格式與 800 字截斷
            res = classify(f"標題：{a.title}\n內文：{a.content}"[:800])
            category, score = res["category"], res["score"]

        rows.append(store.make_row(
            title=a.title, content=a.content, url=a.url, published_at=a.published_at,
            source=src, category=category, category_score=score,
            related_stocks=ns.extract_tickers(f"{a.title}\n{a.content}"),
        ))
        log.info("[%s] %d/%d  %s  %s", src, i, len(arts), f"{category}({score})" if classify else "-", a.title[:40])
        if args.dry_run:
            print(f"  內文 {len(a.content)} 字｜{a.published_at}｜{a.content[:60].replace(chr(10), ' ')}...")

    if rows and db is not None:
        stats["inserted"] = store.insert_news(db, rows)
    return stats


def run(args) -> int:
    fetcher = ns.Fetcher(delay=args.delay)

    classify = None
    if not args.no_classify:
        from ai_service import classify_industry   # 會載入模型，第一次執行較慢
        classify = classify_industry

    db = None
    if not args.dry_run:
        from database import SessionLocal           # 需要 DATABASE_URL
        db = SessionLocal()

    all_stats = {}
    try:
        for src in args.sources:
            try:
                all_stats[src] = crawl_one(src, fetcher, classify, db, args)
            except Exception:
                log.exception("來源 %s 發生錯誤，繼續處理下一個來源", src)
    finally:
        if db is not None:
            db.close()

    if fetcher.blocked_hosts:
        print("\n⚠ 以下網站拒絕存取（HTTP 403），已停止對它們發請求：" + "、".join(sorted(fetcher.blocked_hosts)))
        print("  這是網站端的限制，請不要偽裝成瀏覽器；建議改用其他來源，或向該媒體詢問授權。")

    print("\n===== 結果 =====")
    for src, s in all_stats.items():
        print(f"{src:6s} 清單 {s['listed']:4d}｜新文章 {s['new']:3d}｜抓不到內文 {s['no_content']:3d}｜寫入 {s['inserted']:3d}")
    if not any(s["listed"] for s in all_stats.values()):
        print("三個來源都沒取得清單，請檢查網路、robots.txt 或網站是否改版。")
        return 1
    return 0


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    sys.exit(run(parse_args()))
