"""個股財報摘要。資料來自 FinMind,回傳格式對應前端的 mockFundamentals。

金額單位:億元;比率單位:%。算不出來的欄位回傳 None(例如金融業沒有毛利)。
"""
from __future__ import annotations

import os
from datetime import date, timedelta
from statistics import median

import requests
from cachetools import TTLCache

FINMIND_URL = os.getenv("FINMIND_URL", "https://api.finmindtrade.com/api/v4/data")
YI = 100_000_000          # 1 億
PEER_COUNT = 8            # 同業本益比:取同產業營收前幾大
_peer_pe_cache = TTLCache(maxsize=200, ttl=12 * 3600)


class FinMindError(Exception):
    pass


def finmind(dataset: str, stock_id: str, start_date: str) -> list:
    """呼叫 FinMind。失敗就丟例外,不重試(連續錯誤請求會被 FinMind 暫時封鎖 IP)。"""
    headers = {}
    token = os.getenv("FINMIND_TOKEN")   # 沒設定也能用,額度較低
    if token:
        headers["Authorization"] = f"Bearer {token}"
    resp = requests.get(
        FINMIND_URL,
        params={"dataset": dataset, "data_id": stock_id, "start_date": start_date},
        headers=headers,
        timeout=20,
    )
    if resp.status_code != 200:
        raise FinMindError(f"{dataset} HTTP {resp.status_code}")
    body = resp.json()
    if body.get("status") != 200:
        raise FinMindError(f"{dataset} {body.get('msg')}")
    return body.get("data", [])


def _days_ago(n: int) -> str:
    return (date.today() - timedelta(days=n)).isoformat()


def _yi(v):
    """元 -> 億元。小公司保留一位小數,避免 3.4 億被四捨五入成 3。"""
    if v is None:
        return None
    x = v / YI
    return round(x) if abs(x) >= 100 else round(x, 1)


def _pct(cur, base, digits: int = 1):
    """成長率 %。基期不存在或不是正數時回傳 None。"""
    if cur is None or base is None or base <= 0:
        return None
    return round((cur / base - 1) * 100, digits)


def _ratio(part, whole):
    if part is None or not whole:
        return None
    return round(part / whole * 100, 1)


def build_monthly(rows: list) -> list:
    """近 12 個月營收:[{month, revenue(億), yoy, mom}]"""
    by = {(r["revenue_year"], r["revenue_month"]): r["revenue"] for r in rows}
    out = []
    for (y, m) in sorted(by)[-12:]:
        rev = by[(y, m)]
        prev_key = (y, m - 1) if m > 1 else (y - 1, 12)
        out.append({
            "month": f"{y}-{m:02d}",
            "revenue": _yi(rev),
            "yoy": _pct(rev, by.get((y - 1, m))),
            "mom": _pct(rev, by.get(prev_key)),
        })
    return out


def _pivot(rows: list) -> dict:
    """[{date, type, value}] -> {date: {type: value}}"""
    out = {}
    for r in rows:
        out.setdefault(r["date"], {})[r["type"]] = r["value"]
    return out


def build_quarterly(income_rows: list, balance_rows: list) -> tuple:
    """近 8 季明細,以及最新一季的股數(億股)。FinMind 的損益表是單季數字。"""
    income, balance = _pivot(income_rows), _pivot(balance_rows)
    quarters = []
    for d in sorted(income)[-8:]:
        inc, bal = income[d], balance.get(d, {})
        rev = inc.get("Revenue")
        net = inc.get("IncomeAfterTaxes")
        net_parent = inc.get("EquityAttributableToOwnersOfParent", net)   # 損益表裡這個代碼是「歸屬母公司淨利」
        equity = bal.get("EquityAttributableToOwnersOfParent") or bal.get("Equity")
        y, m = int(d[:4]), int(d[5:7])
        quarters.append({
            "q": f"{str(y)[2:]}Q{(m - 1) // 3 + 1}",
            "revenue": _yi(rev),
            "grossMargin": _ratio(inc.get("GrossProfit"), rev),
            "opMargin": _ratio(inc.get("OperatingIncome"), rev),
            "netMargin": _ratio(net, rev),
            "netIncome": _yi(net),
            "eps": inc.get("EPS"),
            "roe": _ratio(net_parent, equity),
        })
    shares = None
    if income:
        capital = balance.get(sorted(income)[-1], {}).get("OrdinaryShare")
        if capital:
            shares = round(capital / 10 / YI, 1)   # 以面額 10 元換算;少數公司面額不同,會有誤差
    return quarters, shares


def peer_pe(code: str, db):
    """同業本益比:同產業(依月營收表的產業別)營收前幾大公司的本益比中位數。算不出來回傳 None。"""
    if db is None:
        return None
    try:
        import models
        M = models.MonthlyRevenue
        me = db.query(M).filter(M.symbol == code).order_by(M.year_month.desc()).first()
        if not me or not me.industry:
            return None
        key = (me.industry, me.year_month)
        if key in _peer_pe_cache:
            return _peer_pe_cache[key]
        peers = (
            db.query(M.symbol)
            .filter(M.industry == me.industry, M.year_month == me.year_month, M.revenue.isnot(None))
            .order_by(M.revenue.desc())
            .limit(PEER_COUNT)
            .all()
        )
        values = []
        for (symbol,) in peers:
            rows = finmind("TaiwanStockPER", symbol, _days_ago(14))
            if rows and rows[-1].get("PER", 0) > 0:
                values.append(rows[-1]["PER"])
        result = round(median(values), 1) if len(values) >= 3 else None
        _peer_pe_cache[key] = result
        return result
    except Exception:
        return None


def build_financials(code: str, db=None) -> dict:
    """組出前端 /api/stock/{code}/financials 的完整格式。查無資料丟 LookupError。"""
    monthly = build_monthly(finmind("TaiwanStockMonthRevenue", code, _days_ago(800)))
    quarterly, shares = build_quarterly(
        finmind("TaiwanStockFinancialStatements", code, _days_ago(830)),
        finmind("TaiwanStockBalanceSheet", code, _days_ago(830)),
    )
    if not monthly and not quarterly:
        raise LookupError(code)

    per_rows = finmind("TaiwanStockPER", code, _days_ago(14))
    per = per_rows[-1] if per_rows else {}

    eps_list = [q["eps"] for q in quarterly]
    eps_ok = all(e is not None for e in eps_list)
    eps4q = round(sum(eps_list[-4:]), 2) if eps_ok and len(eps_list) >= 4 else None
    eps_prev4 = sum(eps_list[-8:-4]) if eps_ok and len(eps_list) >= 8 else None

    roe_list = [q["roe"] for q in quarterly[-4:]]
    last = quarterly[-1] if quarterly else {}
    prev = quarterly[-2] if len(quarterly) >= 2 else {}
    gm, gm_prev = last.get("grossMargin"), prev.get("grossMargin")

    streak = 0
    for m in reversed(monthly):
        if m["yoy"] is None or m["yoy"] <= 0:
            break
        streak += 1

    return {
        "pe": per.get("PER") or None,
        "peerPe": peer_pe(code, db),
        "pb": per.get("PBR") or None,
        "dividendYield": per.get("dividend_yield"),
        "eps4q": eps4q,
        "epsYoY": _pct(eps4q, eps_prev4, 0),
        "revYoY": monthly[-1]["yoy"] if monthly else None,
        "revStreak": streak,
        "grossMargin": gm,
        "grossMarginChg": round(gm - gm_prev, 1) if gm is not None and gm_prev is not None else None,
        "opMargin": last.get("opMargin"),
        "roe": round(sum(roe_list), 1) if len(roe_list) == 4 and all(r is not None for r in roe_list) else None,
        "quarterlyEps": eps_list,
        "lastRevenue": last.get("revenue"),
        "shares": shares,
        "quarters": [q["q"] for q in quarterly],
        "quarterly": quarterly,
        "monthly": monthly,
        "source": "FinMind",
    }