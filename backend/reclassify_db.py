"""
重新分類資料庫裡「未分類」的新聞（不用重爬、不會動到其他欄位）。

先用規則（股票代號、公司名稱 -> 產業別），規則找不到的可以再用 AI 模型（--model，較慢）。

用法（在專案根目錄執行）：
    python backend/reclassify_db.py                    # 只試算：印出會改多少、範例，不寫入
    python backend/reclassify_db.py --apply            # 寫入資料庫
    python backend/reclassify_db.py --apply --model    # 規則沒命中的，再交給 AI 模型（會載入模型）
    python backend/reclassify_db.py --source cnyes     # 只處理某個來源

需要先有 backend/industry_map.json（python backend/build_industry_map.py）。
"""
from __future__ import annotations

import argparse
import sys
from collections import Counter

import industry_lookup as il
import news_sources as ns


def decide(title: str, content: str, related_stocks: str | None, classify=None) -> tuple[dict | None, str | None]:
    """
    決定一則新聞的新分類。回傳 (結果或 None, 要補寫的 related_stocks 或 None)。
    不碰資料庫，方便單獨測試。結果格式與 ai_service.classify_industry 相同。
    """
    text = f"{title}\n{content}"
    explicit = related_stocks or ns.extract_tickers(text)
    codes = il.codes_for_classification(title, content, explicit)
    hit = il.classify_by_stocks(codes) if codes else None
    if hit is None and classify is not None:
        res = classify(f"標題：{title}\n內文：{content}"[:800], related_stocks=None)
        if res["category"] != "未分類":
            hit = res
    fill = explicit if (explicit and not related_stocks) else None
    return hit, fill


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="重新分類資料庫裡『未分類』的新聞")
    ap.add_argument("--apply", action="store_true", help="真的寫入資料庫（預設只試算）")
    ap.add_argument("--model", action="store_true", help="規則找不到的，再用 AI 模型判斷（較慢）")
    ap.add_argument("--source", help="只處理某個來源，例如 cnyes")
    args = ap.parse_args(argv)

    if not il.load_map():
        print("找不到 backend/industry_map.json，股票代號／公司名稱的規則不會生效。")
        print("請先執行：python backend/build_industry_map.py")
        if not args.model:
            return 1

    classify = None
    if args.model:
        from ai_service import classify_industry     # 會載入模型
        classify = classify_industry

    import models
    from database import SessionLocal
    from sqlalchemy import or_

    db = SessionLocal()
    try:
        q = db.query(models.News).filter(or_(models.News.category.is_(None), models.News.category == "未分類"))
        if args.source:
            q = q.filter(models.News.source == args.source)
        rows = q.order_by(models.News.id).all()
        print(f"資料庫裡未分類的新聞：{len(rows)} 筆" + (f"（來源 {args.source}）" if args.source else ""))

        before, changed, examples = Counter(), Counter(), []
        by_cat: Counter[str] = Counter()
        for i, row in enumerate(rows, 1):
            src = row.source or "（無來源）"
            before[src] += 1
            hit, fill = decide(row.title or "", row.content or "", row.related_stocks, classify)
            if hit:
                row.category, row.category_score = hit["category"], hit["score"]
                changed[src] += 1
                by_cat[hit["category"]] += 1
                if len(examples) < 10:
                    examples.append((src, hit["category"], (row.title or "")[:34], hit.get("details", "")[:40]))
            if fill:
                row.related_stocks = fill
            if args.apply and i % 100 == 0:
                db.commit()

        print("\n===== 結果 =====")
        print(f"{'來源':<10}{'原本未分類':>10}{'改成有分類':>10}{'仍未分類':>10}")
        for src in sorted(before):
            print(f"{src:<10}{before[src]:>10}{changed[src]:>10}{before[src] - changed[src]:>10}")
        print(f"{'合計':<10}{sum(before.values()):>10}{sum(changed.values()):>10}{sum(before.values()) - sum(changed.values()):>10}")
        if by_cat:
            print("\n新分到的類別：" + "、".join(f"{c} {n}" for c, n in by_cat.most_common()))
        if examples:
            print("\n範例（請抽看合不合理）：")
            for src, cat, title, why in examples:
                print(f"  [{src}] {cat}｜{title}｜{why}")

        if args.apply:
            db.commit()
            print("\n已寫入資料庫。")
        else:
            db.rollback()
            print("\n（試算而已，沒有寫入。確認沒問題後加上 --apply）")
    finally:
        db.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
