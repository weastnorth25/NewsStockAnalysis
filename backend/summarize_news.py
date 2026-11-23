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
- 模型輸出會用 OpenCC 轉成繁體(需 pip install opencc-python-reimplemented)。
- ai_summary 格式:每點一行,用換行(\n)分隔,不含項目符號。
"""
from __future__ import annotations

import argparse
import os
import re
import unicodedata

import requests

try:                                    # 模型偶爾混入簡體字,用 OpenCC 轉成台灣繁體
    from opencc import OpenCC
    _cc = OpenCC("s2tw")
except ImportError:
    _cc = None

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
MODEL_NAME = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")
PROMPT_VERSION = "news_v3"
MODEL_TAG = f"{MODEL_NAME}|{PROMPT_VERSION}"
TIMEOUT_SEC = 120
MIN_CHARS = 150          # 內文少於這個字數就不摘要
MAX_CHARS = 2500         # 只餵前 2500 字,太長模型會變慢也容易失焦
TEMPLATE_PREFIXES = ("盤中速報", "鉅亨速報 - Factset")   # 模板速報,標題已含全部資訊

PROMPT = (
    "你是財經新聞重點整理助手。請只根據下面的新聞內容,用繁體中文列出 3 點重點。\n"
    "規則:只能使用繁體中文字、每點一行、每點不超過 40 字、不要編號、不要加標題或結語。"
    "只能使用內文中出現的事實與數字,數字必須照原文寫法照抄,不可換算單位或四捨五入(例如「25 兆 9,780 億」不可改寫成「25.97 兆」),不可推測原因、不可預測股價、不可給投資建議。\n\n"
    "標題:{title}\n內文:{content}"
)

_BULLET = re.compile(r"^[\s\-*•‧·●○▪︎・]*(?:\d+[.、)]|[一二三][、.])?\s*")
_NUM = re.compile(r"\d+(?:\.\d+)?")

# 中文數字:二十四．九二、一．六三、一五〇〇、一千五百、1千5百 這類寫法
_CN_DIGIT = {"零": 0, "〇": 0, "一": 1, "二": 2, "兩": 2, "三": 3, "四": 4,
             "五": 5, "六": 6, "七": 7, "八": 8, "九": 9}
_CN_UNIT = {"十": 10, "百": 100, "千": 1000}
_CN_CHARS = "零〇一二兩三四五六七八九十百千"
_CN_RUN = re.compile(rf"[0-9{_CN_CHARS}]+(?:\.[0-9零〇一二三四五六七八九]+)?")


def _digit(ch: str) -> int:
    return int(ch) if ch.isdigit() else _CN_DIGIT[ch]


def _cn_int(part: str) -> int:
    """整數部分:有十百千就照位數算(二十四 → 24),沒有就逐字轉(一五〇〇 → 1500)。"""
    if not any(ch in _CN_UNIT for ch in part):
        return int("".join(str(_digit(ch)) for ch in part))
    total, cur = 0, None
    for ch in part:
        if ch in _CN_UNIT:
            total += (1 if cur is None else cur) * _CN_UNIT[ch]
            cur = None
        else:
            cur = (cur or 0) * 10 + _digit(ch)
    return total + (cur or 0)


def _cn_number(run: str) -> str | None:
    """'二十四.九二' -> '24.92';'一五〇〇' -> '1500';純阿拉伯數字或看不懂回傳 None。"""
    if not any(ch in _CN_CHARS for ch in run):
        return None                                   # 純阿拉伯數字交給 _NUM 處理
    int_part, _, dec_part = run.partition(".")
    try:
        value = str(_cn_int(int_part))
        if dec_part:
            value += "." + "".join(str(_digit(ch)) for ch in dec_part)
    except (KeyError, ValueError):
        return None
    return _canon(value)


def _canon(n: str) -> str:
    """'1.50' -> '1.5'、'3.0' -> '3',讓同一個數字的不同寫法比對得上。"""
    return n.rstrip("0").rstrip(".") if "." in n else n


def _numbers(text: str) -> set[str]:
    # 全形數字與符號轉半形(例如 2 1 3 . 4 → 213.4)
    text = unicodedata.normalize("NFKC", text)
    text = re.sub(r"(?<=\d),(?=\d{3})", "", text)   # 只去掉數字中間的千分位逗號
    nums = {_canon(n) for n in _NUM.findall(text)}
    for run in _CN_RUN.findall(text):          # 中文數字也換算成阿拉伯數字
        value = _cn_number(run)
        if value is not None:
            nums.add(value)
    return nums


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


def to_traditional(text: str) -> str:
    return _cc.convert(text) if _cc else text


def ask(title: str, content: str) -> list[str]:
    resp = requests.post(
        f"{OLLAMA_URL}/api/generate",
        json={"model": MODEL_NAME, "prompt": PROMPT.format(title=title, content=content),
              "stream": False, "options": {"temperature": 0.2}},
        timeout=TIMEOUT_SEC,
    )
    resp.raise_for_status()
    return clean(to_traditional(resp.json()["response"]))


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