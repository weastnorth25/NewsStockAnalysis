"""
用本機 Ollama 幫新聞產生「AI 重點」(3 點),寫進 news.ai_summary。

用法(在 backend 資料夾、啟動 venv、Ollama 開著):
    python summarize_news.py --limit 3            # 預覽:只印結果,不寫資料庫
    python summarize_news.py --apply              # 正式寫入(預設最新 60 篇)
    python summarize_news.py --apply --limit 200

規則:
- 只處理 ai_summary_model 是空的新聞(還沒處理過的),由新到舊。
- 模板速報(盤中速報、鉅亨速報 - Factset)標題已含全部資訊,不摘要,標記 skipped_template。
- 內文太短不摘要,標記 skipped_short。以上兩種之後都不再重試。
- 防止模型亂編數字:重點裡出現的每個數字都必須在原文裡找得到,否則重試一次,
  還是不行就標記 rejected,不寫入重點。
- ai_summary 格式:每點一行,用換行(\n)分隔,不含項目符號。
"""
from __future__ import annotations

import argparse
import os
import re

import requests

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
MODEL_NAME = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")
PROMPT_VERSION = "news_v1"
MODEL_TAG = f"{MODEL_NAME}|{PROMPT_VERSION}"
TIMEOUT_SEC = 120
MIN_CHARS = 150          # 內文少於這個字數就不摘要
MAX_CHARS = 2500         # 只餵前 2500 字,太長模型會變慢也容易失焦
TEMPLATE_PREFIXES = ("盤中速報", "鉅亨速報 - Factset")   # 模板速報,標題已含全部資訊

PROMPT = (
    "你是財經新聞重點整理助手。請只根據下面的新聞內容,用繁體中文列出 3 點重點。\n"
        "規則:只能使用繁體中文字、每點一行、每點不超過 40 字、不要編號、不要加標題或結語。"
    "只能使用內文中出現的事實與數字,不可推測原因、不可預測股價、不可給投資建議。\n\n"
    "標題:{title}\n內文:{content}"
)

_BULLET = re.compile(r"^[\s\-*•‧·●○▪︎・]*(?:\d+[.、)]|[一二三][、.])?\s*")
_NUM = re.compile(r"\d+(?:\.\d+)?")


def _numbers(text: str) -> set[str]:
    return set(_NUM.findall(text.replace(",", "").replace(",", "")))


def clean(raw: str) -> list[str]:
    """把模型輸出整理成最多 3 行,去掉編號和項目符號。"""
    lines = []
    for line in raw.splitlines():
        line = _BULLET.sub("", line).strip()
        if line and not line.endswith((":", "：")):
            lines.append(line)
    return lines[:3]


def numbers_ok(points: list[str], source: str) -> bool:
    """重點裡的每個數字,都要在原文(標題 + 內文)裡出現過。"""
    return _numbers(" ".join(points)) <= _numbers(source)


def ask(title: str, content: str) -> list[str]:
    resp = requests.post(
        f"{OLLAMA_URL}/api/generate",
        json={"model": MODEL_NAME, "prompt": PROMPT.format(title=title, content=content),
              "stream": False, "options": {"temperature": 0.2}},
        timeout=TIMEOUT_SEC,
    )
    resp.raise_for_status()
    return clean(resp.json()["response"])


def summarize(title: str, content: str) -> tuple[str | None, str]:
    """回傳 (重點文字或 None, 狀態)。狀態:ok / skipped_template / skipped_short / rejected。"""
    if title.startswith(TEMPLATE_PREFIXES):
        return None, "skipped_template"
    content = (content or "").replace("\n", " ").strip()
    if len(content) < MIN_CHARS:
        return None, "skipped_short"
    content = content[:MAX_CHARS]
    source = title + " " + content
    for _ in range(2):                       # 數字對不上就重試一次
        points = ask(title, content)
        if len(points) >= 2 and numbers_ok(points, source):
            return "\n".join(points), "ok"
    return None, "rejected"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=60, help="最多處理幾篇(預設 60)")
    ap.add_argument("--apply", action="store_true", help="真的寫入資料庫;沒加就只預覽")
    args = ap.parse_args()

    from database import SessionLocal
    import models

    db = SessionLocal()
    try:
        rows = (db.query(models.News.id, models.News.title, models.News.content)
                  .filter(models.News.ai_summary_model.is_(None))
                  .order_by(models.News.published_at.desc())
                  .limit(args.limit).all())
    finally:
        db.close()
    print(f"[AI 重點] 待處理 {len(rows)} 篇{'' if args.apply else '(預覽模式,不寫入)'}")

    counts = {"ok": 0, "skipped_template": 0, "skipped_short": 0, "rejected": 0, "error": 0}
    for news_id, title, content in rows:
        try:
            text, status = summarize(title, content)
        except requests.exceptions.ConnectionError:
            print("!! 連不到 Ollama,請先打開 Ollama 再執行。")
            break
        except Exception as e:                   # 單篇失敗不影響其他篇
            counts["error"] += 1
            print(f"  [錯誤] id={news_id}:{e}")
            continue
        counts[status] += 1
        print(f"\n[{status}] id={news_id} {title[:40]}")
        if text:
            print("  " + text.replace("\n", "\n  "))

        if args.apply:
            db = SessionLocal()                  # 每篇用新的連線,避免模型跑太久連線被斷
            try:
                n = db.get(models.News, news_id)
                n.ai_summary = text
                n.ai_summary_model = MODEL_TAG if status == "ok" else f"{status}|{PROMPT_VERSION}"
                db.commit()
            finally:
                db.close()

    print(f"\n[AI 重點] 完成 {counts['ok']} 篇,模板速報略過 {counts['skipped_template']} 篇,"
          f"內文太短略過 {counts['skipped_short']} 篇,"
          f"數字對不上未寫入 {counts['rejected']} 篇,錯誤 {counts['error']} 篇")


if __name__ == "__main__":
    main()