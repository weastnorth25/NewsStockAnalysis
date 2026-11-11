"""用 ctee_simple.xlsx 的人工審核標籤,檢查 FinBERT 的判斷。

用法(在 backend 資料夾、啟動 .venv 後):
    python eval_sentiment.py                 # 三個類別各抽 30 篇
    python eval_sentiment.py --n 150         # 各抽 50 篇
    python eval_sentiment.py --title-only    # 只用標題判斷

注意:如果模型訓練時用過這份資料,準確率會偏高,不能當成真實表現。
"""
import argparse
import time
from pathlib import Path

import pandas as pd

from sentiment_model import predict_batch, MODEL_DIR, LABELS

XLSX = Path(__file__).resolve().parent / "ctee_simple.xlsx"

SAMPLES = [
    "台積電法說會財測優於預期,上修全年資本支出",
    "某公司公告重大虧損,並大幅下修全年財測",
    "央行理監事會決議維持政策利率不變",
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=90, help="總共抽幾篇,三個類別平均分配")
    ap.add_argument("--title-only", action="store_true", help="只用標題判斷")
    args = ap.parse_args()

    print("模型資料夾:", MODEL_DIR)
    print("\n=== 手寫範例 ===")
    for text, r in zip(SAMPLES, predict_batch(SAMPLES)):
        print(f"{r['label_name']:<8} {r['probabilities']} | {text}")

    df = pd.read_excel(XLSX)
    per = max(1, args.n // 3)
    df = pd.concat([g.sample(min(len(g), per), random_state=0) for _, g in df.groupby("label")])
    title = df["title_tw"].astype(str)
    texts = (title if args.title_only else title + "。" + df["content_tw"].astype(str)).tolist()

    t0 = time.time()
    preds = predict_batch(texts)
    print(f"\n判讀 {len(texts)} 篇,耗時 {time.time() - t0:.1f} 秒"
          f"({'只用標題' if args.title_only else '標題+內文'})")

    df = df.assign(pred=[p["label"] for p in preds])
    print("\n=== 混淆矩陣(列=人工標籤,欄=模型預測)===")
    print(pd.crosstab(df["label"].map(LABELS), df["pred"].map(LABELS),
                      rownames=["人工標籤"], colnames=["模型預測"]))

    print("\n=== 各類別 ===")
    for lab, name in LABELS.items():
        true_n = (df["label"] == lab).sum()
        pred_n = (df["pred"] == lab).sum()
        hit = ((df["label"] == lab) & (df["pred"] == lab)).sum()
        recall = hit / true_n if true_n else float("nan")
        precision = hit / pred_n if pred_n else float("nan")
        print(f"{name:<8} 召回率 {recall:.0%}({hit}/{true_n})  精確率 {precision:.0%}({hit}/{pred_n})")
    print(f"\n整體準確率(三類別平均抽樣): {(df['label'] == df['pred']).mean():.0%}")

    print("\n=== 判錯的前 5 篇 ===")
    for _, r in df[df["label"] != df["pred"]].head(5).iterrows():
        print(f"{LABELS[r['label']]} -> {LABELS[r['pred']]} | {str(r['title_tw'])[:50]}")


if __name__ == "__main__":
    main()