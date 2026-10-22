"""
股票代號 -> 產業別 -> 本專案的新聞分類

用途：新聞裡有提到股票代號時（例如「聯電（2303）」），直接用該公司的產業別分類，
比讓 AI 模型從文字猜準確，也不用載入模型。

對照表 industry_map.json 由 build_industry_map.py 產生（只需執行一次）。
這個檔案刻意不 import torch / transformers，匯入腳本也能直接使用。
"""
from __future__ import annotations

import json
import logging
import os
from collections import Counter
from functools import lru_cache

log = logging.getLogger("industry_lookup")

MAP_PATH = os.getenv("INDUSTRY_MAP_PATH", os.path.join(os.path.dirname(os.path.abspath(__file__)), "industry_map.json"))

# 證交所「產業別」名稱 -> 本專案的分類。用「名稱包含關鍵字」判斷，
# 所以「金融保險」「金融保險業」兩種寫法都能對到；沒對到的（如「其他」「存託憑證」）回傳 None，交給 AI 判斷。
# 順序有意義：由上往下，第一個符合的就採用。
CATEGORY_RULES: list[tuple[str, list[str]]] = [
    ("科技半導體", ["半導體", "電腦及週邊", "光電", "電子零組件", "電子通路", "其他電子"]),
    ("軟體服務",   ["通信網路", "資訊服務", "數位雲端"]),
    ("金融保險",   ["金融"]),
    ("航運物流",   ["航運"]),
    ("生技醫療",   ["生技醫療"]),
    ("營建地產",   ["建材營造"]),
    ("民生消費",   ["貿易百貨", "觀光", "食品", "運動休閒", "居家生活"]),
    ("再生能源",   ["綠能環保"]),
    ("傳統產業",   ["水泥", "塑膠", "紡織", "電機機械", "電器電纜", "化學", "玻璃陶瓷", "造紙", "鋼鐵", "橡膠", "汽車", "油電燃氣"]),
]


def industry_to_category(industry: str | None) -> str | None:
    if not industry:
        return None
    for category, keywords in CATEGORY_RULES:
        if any(k in industry for k in keywords):
            return category
    return None


@lru_cache(maxsize=1)
def load_map() -> dict[str, dict]:
    """讀 industry_map.json；檔案不存在時回傳空表（不會讓程式當掉，只是這個功能不生效）。"""
    try:
        with open(MAP_PATH, encoding="utf-8") as f:
            data = json.load(f)
        log.info("已載入產業對照表：%d 檔股票", len(data))
        return data
    except FileNotFoundError:
        log.warning("找不到 %s，股票代號 -> 產業 的分類不會生效。請先執行 build_industry_map.py", MAP_PATH)
        return {}


def _split_codes(codes) -> list[str]:
    if not codes:
        return []
    if isinstance(codes, str):
        codes = codes.replace("，", ",").replace("、", ",").split(",")
    return [str(c).strip() for c in codes if str(c).strip()]


def classify_by_stocks(codes, min_share: float = 0.5) -> dict | None:
    """
    codes：'2330,2454' 或 ['2330', '2454']。
    各代號對應的分類投票，最高票的分類佔「有對到的代號」超過 min_share（預設一半）才採用。
    回傳格式與 ai_service.classify_industry 相同：{"category", "score", "details"}；
    沒把握（找不到對照、票數不過半）回傳 None，由呼叫端改用 AI 判斷。
    """
    table = load_map()
    votes: Counter[str] = Counter()
    seen: list[str] = []
    for code in _split_codes(codes):
        info = table.get(code)
        category = industry_to_category(info.get("industry")) if info else None
        if category is None:
            continue
        votes[category] += 1
        seen.append(f"{code}{info.get('name', '')}（{info.get('industry', '')}）")
    if not votes:
        return None
    category, n = votes.most_common(1)[0]
    share = n / sum(votes.values())
    if share <= min_share:
        return None
    return {
        "category": category,
        "score": round(0.9 * share, 4),   # 0.9 = 全部代號都指向同一分類；比關鍵字規則的 1.0 低一點
        "details": "股票代號對應產業：" + "、".join(seen),
    }


# ----------------------------------------------------------------------------
# 用公司名稱找股票代號（標題常只寫「台積電」「聯發科」，不寫括號代號）
# ----------------------------------------------------------------------------
# 太像一般詞彙的簡稱，不拿來比對（避免「統一發票」被當成統一企業）。可自行增減。
STOP_NAMES = {"統一", "大成", "台灣", "中華", "亞洲", "世界", "全球", "大眾", "中國", "美國", "日本", "新聞", "聯合"}
NAME_MIN_EVIDENCE = 3      # 標題出現一次算 3 分；內文出現一次算 1 分；總分要達到這個值才算有提到


@lru_cache(maxsize=1)
def _name_index() -> dict[str, str]:
    """公司簡稱 -> 代號。簡稱重複（同名多檔）的排除，避免誤判。"""
    names: dict[str, list[str]] = {}
    for code, info in load_map().items():
        name = (info.get("name") or "").strip()
        if len(name) >= 2 and name not in STOP_NAMES:
            names.setdefault(name, []).append(code)
    return {n: codes[0] for n, codes in names.items() if len(codes) == 1}


def find_codes_by_name(title: str, content: str = "", max_codes: int = 5) -> list[str]:
    """
    在標題與內文前段找公司簡稱，回傳最相關的幾檔代號。
    - 3 字以上的簡稱（台積電、聯發科）：標題或內文都算
    - 2 字簡稱（聯電、鴻海）：只看標題，避免內文裡的普通詞彙被誤認
    - 標題出現一次 = 3 分，內文一次 = 1 分，總分 >= NAME_MIN_EVIDENCE 才算數
    """
    index = _name_index()
    if not index:
        return []
    title, content = title or "", (content or "")[:1500]
    scores: Counter[str] = Counter()
    for name, code in index.items():
        pts = title.count(name) * 3
        if len(name) >= 3:
            pts += content.count(name)
        if pts >= NAME_MIN_EVIDENCE:
            scores[code] += pts
    return [code for code, _ in scores.most_common(max_codes)]


def codes_for_classification(title: str, content: str = "", explicit: str | None = None) -> str | None:
    """分類用的股票代號：文章裡有明確寫出的代號就用它；沒有再用公司名稱找。"""
    if explicit:
        return explicit
    return ",".join(find_codes_by_name(title, content)) or None
