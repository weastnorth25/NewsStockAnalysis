"""幫資料庫裡還沒有情緒標籤的新聞,用 FinBERT 打標籤。

用法(在 backend 資料夾、啟動 .venv 後):
    python tag_news_sentiment.py                 # 預覽:只判讀並印出結果,不寫入資料庫
    python tag_news_sentiment.py --limit 50      # 預覽最新的 50 篇
    python tag_news_sentiment.py --apply         # 正式寫入(預設最多 200 篇)
    python tag_news_sentiment.py --apply --limit 1000

只會補「sentiment 是空的」新聞,不會覆蓋已有的標籤(例如匯入的人工審核標籤)。
sentiment_score = 正面機率 − 負面機率,範圍 −1 ~ +1。
sentiment_source 記錄是哪個模型判的,跟人工審核的標籤區分。
"""
import argparse

from database import SessionLocal
import models
from sentiment_model import predict_batch

MODEL_TAG = "finbert_v30"   # 換模型或改校準參數時,改這個名稱


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=200, help="最多處理幾篇")
    ap.add_argument("--apply", action="store_true", help="真的寫入資料庫;沒加就只預覽")
    args = ap.parse_args()

    db = SessionLocal()
    try:
        total_all = db.query(models.News).count()
        total_missing = db.query(models.News).filter(models.News.sentiment.is_(None)).count()
        print(f"資料庫新聞共 {total_all} 篇,還沒有情緒標籤的有 {total_missing} 篇")

        rows = (
            db.query(models.News)
            .filter(models.News.sentiment.is_(None))
            .order_by(models.News.published_at.desc())
            .limit(args.limit)
            .all()
        )
        if not rows:
            print("沒有需要判讀的新聞。")
            return

        # 標題 + 內文(內文只取前 1500 字,模型最多讀 512 個 token,多的用不到)
        texts = [f"{r.title}。{(r.content or '')[:1500]}" for r in rows]
        preds = predict_batch(texts)

        counts = {}
        for r, p in zip(rows, preds):
            counts[p["label_name"]] = counts.get(p["label_name"], 0) + 1
            if args.apply:
                r.sentiment = p["label_name"]
                r.sentiment_source = MODEL_TAG
                r.sentiment_score = round(p["probabilities"]["positive"] - p["probabilities"]["negative"], 4)

        print(f"\n本次判讀 {len(rows)} 篇,分布:{counts}")
        print("\n=== 前 10 篇預覽 ===")
        for r, p in list(zip(rows, preds))[:10]:
            score = p["probabilities"]["positive"] - p["probabilities"]["negative"]
            print(f"{p['label_name']:<8} {score:+.2f} | {r.source or '-'} | {r.title[:40]}")

        if args.apply:
            try:
                db.commit()
            except Exception:
                db.rollback()
                raise
            print(f"\n已寫入 {len(rows)} 篇。")
        else:
            print("\n這是預覽,沒有寫入資料庫。確認後加上 --apply 才會寫入。")
    finally:
        db.close()


if __name__ == "__main__":
    main()