"""
全市場漲跌幅排行(上市股票),資料來源:證交所 OpenAPI「上市個股日成交資訊」STOCK_DAY_ALL。

- 一次回傳所有上市股票「最近一個交易日」的收盤價與漲跌價差,收盤後才會更新。
- Change 是「漲跌價差」不是漲跌幅,漲跌幅 = 價差 / 前一日收盤 = Change / (Close - Change)。
- TradeVolume 單位是「股」,1 張 = 1,000 股。
- 只留一般股票:4 位數字、開頭不是 0 的代號(排除 0050、00400A 這類 ETF)。
- 成交量太小的冷門股排除(預設當天少於 1,000 張)。
"""
from __future__ import annotations

import requests

URL = "https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL"
HEADERS = {"User-Agent": "NewsStockAnalysis student project (market movers)"}
MIN_LOTS = 1000          # 成交量門檻(張)


def fetch_day_all() -> list:
    r = requests.get(URL, headers=HEADERS, timeout=20)
    r.raise_for_status()
    return r.json()


def roc_to_iso(s: str) -> str:
    """'1151119' -> '2026-11-19'"""
    s = s.strip()
    return f"{int(s[:-4]) + 1911}-{s[-4:-2]}-{s[-2:]}"


def is_common_stock(code: str) -> bool:
    return len(code) == 4 and code.isdigit() and code[0] != "0"


def build_movers(rows: list, limit: int = 5, min_lots: int = MIN_LOTS) -> dict:
    items = []
    date = None
    for r in rows:
        code = (r.get("Code") or "").strip()
        if not is_common_stock(code):
            continue
        try:
            close = float(r["ClosingPrice"])
            change = float(r["Change"])
            volume = int(r["TradeVolume"])
        except (KeyError, TypeError, ValueError):   # 當天沒成交的股票,價格欄位會是空的
            continue
        prev = close - change
        if close <= 0 or prev <= 0 or volume < min_lots * 1000:
            continue
        date = date or r.get("Date")
        items.append({
            "code": code,
            "name": (r.get("Name") or "").strip(),
            "price": close,
            "changePct": round(change / prev * 100, 2),
        })

    # 只放真的有漲 / 有跌的,避免大跌日「漲幅排行」裡出現下跌的股票
    gainers = sorted((x for x in items if x["changePct"] > 0), key=lambda x: x["changePct"], reverse=True)[:limit]
    losers = sorted((x for x in items if x["changePct"] < 0), key=lambda x: x["changePct"])[:limit]
    return {
        "date": roc_to_iso(date) if date else None,
        "gainers": gainers,
        "losers": losers,
    }