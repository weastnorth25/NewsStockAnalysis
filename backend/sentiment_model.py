"""FinBERT v30 新聞情緒判讀(離線使用,需要 PyTorch)。

判定邏輯與 AI 組 README 的 /predict 完全相同,只是改成可以直接 import 的函式。
標籤順序與 config.json 一致:0=中立 1=正面 2=負面。
"""
from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

MODEL_DIR = Path(os.getenv(
    "FINBERT_DIR",
    Path(__file__).resolve().parent.parent / "ai_model" / "finbert_finetuned-WeightedTrainer_v30",
))

# AI 組指定的校準參數,交接初期請勿改動
NEG_TH = float(os.getenv("NEG_TH", "0.44"))
POS_MARGIN = float(os.getenv("POS_MARGIN", "-0.04"))
NEU_SCALE = float(os.getenv("NEU_SCALE", "0.95"))

LABELS = {0: "Neutral", 1: "Positive", 2: "Negative"}


@lru_cache(maxsize=1)
def _load():
    from transformers import AutoTokenizer, AutoModelForSequenceClassification
    tok = AutoTokenizer.from_pretrained(str(MODEL_DIR))
    model = AutoModelForSequenceClassification.from_pretrained(str(MODEL_DIR))
    model.eval()   # 推論模式,關閉 dropout
    return tok, model


def decide(p_neu: float, p_pos: float, p_neg: float) -> int:
    """套用 AI 組的門檻判定,回傳 0/1/2。"""
    neg_mask = (p_neg >= NEG_TH) and (p_neg > p_pos)
    pos_mask = (not neg_mask) and (p_pos > (p_neu * NEU_SCALE + POS_MARGIN)) and (p_pos > p_neg)
    if pos_mask:
        return 1
    if neg_mask:
        return 2
    return 0


def predict_batch(texts: list[str], batch_size: int = 16) -> list[dict]:
    import torch
    tok, model = _load()
    out = []
    for i in range(0, len(texts), batch_size):
        chunk = [t or "" for t in texts[i:i + batch_size]]
        inputs = tok(chunk, return_tensors="pt", truncation=True, max_length=512, padding=True)
        with torch.no_grad():
            probs = torch.softmax(model(**inputs).logits, dim=-1).tolist()
        for p_neu, p_pos, p_neg in probs:
            label = decide(p_neu, p_pos, p_neg)
            out.append({
                "label": label,
                "label_name": LABELS[label],
                "probabilities": {
                    "neutral": round(p_neu, 4),
                    "positive": round(p_pos, 4),
                    "negative": round(p_neg, 4),
                },
            })
    return out


def predict_sentiment(text: str) -> dict:
    return predict_batch([text])[0]