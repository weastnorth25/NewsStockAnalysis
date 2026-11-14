"""個股籌碼:三大法人買賣超,以及法人買超後的股價表現統計。資料來自 FinMind。"""
from __future__ import annotations

from datetime import date, timedelta

from stock_financials import finmind

LOT = 1000          # 1 張 = 1000 股
MIN_SAMPLES = 20    # 買超天數太少就不給統計,避免用幾筆資料下結論
GROUPS = (("foreign", "外資"), ("trust", "投信"), ("dealer", "自營商"))


def _group_of(name: str):
    """FinMind 的法人名稱 -> 前端的三類。外資含外資自營商,自營商含自行買賣與避險。"""
    if name.startswith("Foreign"):
        return "foreign"
    if name.startswith("Investment_Trust"):
        return "trust"
    if name.startswith("Dealer"):
        return "dealer"
    return None


def daily_net(code: str, lookback_days: int) -> dict:
    """{日期: {foreign, trust, dealer}},單位:股(買進 − 賣出)。"""
    start = (date.today() - timedelta(days=lookback_days)).isoformat()
    out = {}
    for r in finmind("TaiwanStockInstitutionalInvestorsBuySell", code, start):
        group = _group_of(r.get("name", ""))
        if group is None:
            continue
        day = out.setdefault(r["date"], {"foreign": 0, "trust": 0, "dealer": 0})
        day[group] += (r.get("buy") or 0) - (r.get("sell") or 0)
    return out


def _field_by_date(dataset: str, code: str, start: str, field: str) -> dict:
    """{日期: 某個欄位的值}。抓不到就回傳空的,不讓整支 API 失敗(這兩個欄位只是附加資訊)。"""
    try:
        return {r["date"]: r.get(field) for r in finmind(dataset, code, start)}
    except Exception:
        return {}


def build_institutional(code: str, days: int = 10) -> list:
    """
    近 N 個交易日三大法人買賣超(張),加上外資持股比例與融資餘額:
    [{date, foreign, trust, dealer, foreignRatio, margin}]。查無資料丟 LookupError。
    foreignRatio:外資持股比例(%);margin:融資餘額(張)。當天沒有資料時為 None。
    """
    lookback = days * 2 + 20                     # 多抓一些,扣掉假日後仍夠 N 個交易日
    net = daily_net(code, lookback_days=lookback)
    if not net:
        raise LookupError(code)
    start = (date.today() - timedelta(days=lookback)).isoformat()
    ratio = _field_by_date("TaiwanStockShareholding", code, start, "ForeignInvestmentSharesRatio")
    margin = _field_by_date("TaiwanStockMarginPurchaseShortSale", code, start, "MarginPurchaseTodayBalance")
    return [
        {
            "date": d,
            **{k: round(v / LOT) for k, v in net[d].items()},
            "foreignRatio": ratio.get(d),
            "margin": margin.get(d),
        }
        for d in sorted(net)[-days:]
    ]


def build_performance(code: str, closes: dict) -> list:
    """
    法人「買超日」之後的股價表現(近 3 年):[{name, winRate5d, avgReturn20d, samples}]
    closes: {日期字串: 收盤價}。
    winRate5d:買超日收盤買進、5 個交易日後上漲的比例(%)。
    avgReturn20d:買超日之後 20 個交易日的平均報酬(%)。
    這只是歷史統計,樣本彼此重疊,也沒有扣交易成本,不是回測績效。
    """
    net = daily_net(code, lookback_days=3 * 365 + 10)
    if not net:
        raise LookupError(code)
    days = sorted(closes)
    pos = {d: i for i, d in enumerate(days)}
        # 基準:同一段期間「任何一個交易日」買進的結果,用來判斷法人買超是否真的比較好
    base_days = [pos[d] for d in net if d in pos]
    b5 = [closes[days[i + 5]] / closes[days[i]] - 1 for i in base_days if i + 5 < len(days)]
    b20 = [closes[days[i + 20]] / closes[days[i]] - 1 for i in base_days if i + 20 < len(days)]
    base_win = round(sum(x > 0 for x in b5) / len(b5) * 100) if len(b5) >= MIN_SAMPLES else None
    base_ret = round(sum(b20) / len(b20) * 100, 1) if len(b20) >= MIN_SAMPLES else None
    out = []
    for key, label in GROUPS:
        r5, r20 = [], []
        for d, v in net.items():
            i = pos.get(d)
            if v[key] <= 0 or i is None:
                continue
            if i + 5 < len(days):
                r5.append(closes[days[i + 5]] / closes[d] - 1)
            if i + 20 < len(days):
                r20.append(closes[days[i + 20]] / closes[d] - 1)
        out.append({
            "name": label,
            "winRate5d": round(sum(x > 0 for x in r5) / len(r5) * 100) if len(r5) >= MIN_SAMPLES else None,
            "avgReturn20d": round(sum(r20) / len(r20) * 100, 1) if len(r20) >= MIN_SAMPLES else None,
            "samples": len(r5),
            "baselineWinRate5d": base_win,
            "baselineAvgReturn20d": base_ret,
        })
    return out