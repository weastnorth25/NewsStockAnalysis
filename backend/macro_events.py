"""總經事件:把資料庫的事件轉成前端格式,並計算「過去幾次公布後,加權指數的漲跌」。"""
from __future__ import annotations

import re
from bisect import bisect_left
from datetime import datetime, time, timedelta

TW_CLOSE = time(13, 30)     # 台股收盤時間
REACTIONS_PER_EVENT = 4     # 每個事件顯示最近幾次的反應

COUNTRIES = {"US", "TW", "JP"}
CATEGORIES = {"rate", "cpi", "job", "econ", "tw"}
IMPORTANCE = {"high", "medium", "low"}
RESULT_CODES = {"better", "worse", "inline"}


def reaction_for(event_utc: datetime, days: list, closes: dict):
    """
    事件公布後,加權指數「第一個能反應的交易日」與隔天的漲跌幅(%)。
    台灣時間 13:30 收盤前公布 -> 當天反應;收盤後(例如美國數據多在晚上)-> 下一個交易日反應。
    days: 由舊到新的交易日字串;closes: {日期: 收盤價}。算不出來回傳 None。
    """
    tw = event_utc + timedelta(hours=8)
    day = tw.date().isoformat()
    i = bisect_left(days, day)                       # 當天不是交易日時,會落在下一個交易日
    if i < len(days) and days[i] == day and tw.time() >= TW_CLOSE:
        i += 1
    if i == 0 or i + 1 >= len(days):
        return None
    pct = lambda a, b: round((closes[a] / closes[b] - 1) * 100, 1) or 0.0
    return {
        "date": day,
        "change0d": pct(days[i], days[i - 1]),
        "change1d": pct(days[i + 1], days[i]),
    }


def to_frontend(event, history: list, days: list, closes: dict) -> dict:
    """event: MacroEvent;history: 同一個 series 的所有事件。"""
    reactions = []
    past = sorted(
        (h for h in history if h.actual is not None and h.datetime_utc < event.datetime_utc),
        key=lambda h: h.datetime_utc, reverse=True,
    )
    for h in past:
        r = reaction_for(h.datetime_utc, days, closes) if days else None
        if r:
            reactions.append({"date": r["date"], "result": h.result, "change0d": r["change0d"], "change1d": r["change1d"]})
        if len(reactions) >= REACTIONS_PER_EVENT:
            break
    return {
        "id": event.id,
        "datetime": event.datetime_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "country": event.country,
        "category": event.category,
        "importance": event.importance,
        "name": event.name,
        "short": event.short,
        "expected": event.expected,
        "previous": event.previous,
        "actual": event.actual,
        "result": event.result,
        "aiSummary": event.ai_summary or "",
        "recentReactions": reactions,
    }


def validate_seed(item: dict) -> list:
    """檢查匯入檔的一筆資料,回傳錯誤訊息清單(空的代表沒問題)。"""
    errors = []
    for key in ("id", "series", "datetime", "country", "category", "importance", "name", "short"):
        if not item.get(key):
            errors.append(f"缺少 {key}")
    if item.get("country") and item["country"] not in COUNTRIES:
        errors.append(f"country 只能是 {sorted(COUNTRIES)}")
    if item.get("category") and item["category"] not in CATEGORIES:
        errors.append(f"category 只能是 {sorted(CATEGORIES)}")
    if item.get("importance") and item["importance"] not in IMPORTANCE:
        errors.append(f"importance 只能是 {sorted(IMPORTANCE)}")
    if item.get("datetime"):
        try:
            parse_utc(item["datetime"])
        except ValueError:
            errors.append("datetime 格式要像 2026-11-12T13:30:00Z(UTC 時間)")
    if item.get("id") and not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", item["id"]):
        errors.append("id 只能用小寫英文、數字和 -,例如 us-cpi-2026-09")
    result = item.get("result")
    if result and result.lower() in RESULT_CODES and result not in RESULT_CODES:
        errors.append(f"result 要全小寫:{result.lower()}")
    if item.get("actual") is None and result is not None:
        errors.append("還沒公布(actual 是空的)時,result 也要是空的")
    return errors


def parse_utc(text: str) -> datetime:
    if not text.endswith("Z"):
        raise ValueError(text)
    return datetime.strptime(text, "%Y-%m-%dT%H:%M:%SZ")