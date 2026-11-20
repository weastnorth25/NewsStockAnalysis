"""
全市場三大法人買賣金額(證交所 BFI82U),每天抓一次存進資料庫。

用法(在 backend 資料夾、啟動 venv 後):
    python market_institutional.py              # 補最近 7 天(已存在的日期會略過)
    python market_institutional.py --days 120   # 第一次使用:補最近 120 天
    python market_institutional.py --dry-run    # 只抓、只印,不寫資料庫

資料來源:https://www.twse.com.tw/rwd/zh/fund/BFI82U (robots.txt 允許)
- 單位:元。存原始「元」,API 再換算成億元。
- 外資 = 「外資及陸資(不含外資自營商)」;外資自營商已計入自營商,不重複加。
- 自營商 = 「自營商(自行買賣)」+「自營商(避險)」。
- 證交所有請求頻率限制,兩次請求間隔 3 秒。
"""
from __future__ import annotations

import argparse
import time
from datetime import date, datetime, timedelta, timezone

import requests

URL = "https://www.twse.com.tw/rwd/zh/fund/BFI82U"
TAIPEI = timezone(timedelta(hours=8))
DELAY_SECONDS = 3
HEADERS = {"User-Agent": "NewsStockAnalysis student project (market institutional daily fetch)"}


def _num(s: str) -> int:
    return int(s.replace(",", ""))


def parse(payload: dict) -> dict | None:
    """把證交所回傳的 JSON 轉成 {foreign, trust, dealer, total}(元)。非交易日回傳 None。"""
    if payload.get("stat") != "OK" or not payload.get("data"):
        return None
    out = {"foreign": None, "trust": None, "dealer": 0, "total": None}
    dealer_rows = 0
    for name, _buy, _sell, diff in payload["data"]:
        net = _num(diff)
        if name.startswith("外資及陸資"):
            out["foreign"] = net
        elif name == "投信":
            out["trust"] = net
        elif name.startswith("自營商("):       # 自行買賣、避險;「外資自營商」不會進來
            out["dealer"] += net
            dealer_rows += 1
        elif name == "合計":
            out["total"] = net
    if None in (out["foreign"], out["trust"], out["total"]) or dealer_rows != 2:
        raise ValueError(f"欄位和預期不同,證交所可能改了格式:{[r[0] for r in payload['data']]}")
    if out["foreign"] + out["trust"] + out["dealer"] != out["total"]:
        raise ValueError(f"三大法人加總 {out['foreign'] + out['trust'] + out['dealer']} 不等於合計 {out['total']}")
    return out


def fetch_day(d: date) -> dict | None:
    r = requests.get(
        URL,
        params={"type": "day", "dayDate": d.strftime("%Y%m%d"), "response": "json"},
        headers=HEADERS,
        timeout=15,
    )
    r.raise_for_status()
    return parse(r.json())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=7, help="往回補幾天(日曆天,預設 7)")
    ap.add_argument("--dry-run", action="store_true", help="不寫資料庫,只印結果")
    args = ap.parse_args()

    today = datetime.now(TAIPEI).date()
    candidates = [today - timedelta(days=i) for i in range(args.days)]
    candidates = [d for d in candidates if d.weekday() < 5]          # 週末不用問

    db = None
    existing: set[str] = set()
    if not args.dry_run:
        from database import SessionLocal, engine
        import models
        models.Base.metadata.create_all(bind=engine, tables=[models.MarketInstitutional.__table__])
        db = SessionLocal()
        existing = {d for (d,) in db.query(models.MarketInstitutional.date)}

    saved = skipped = holidays = 0
    try:
        for d in sorted(candidates):
            key = d.isoformat()
            if key in existing:
                skipped += 1
                continue
            row = fetch_day(d)
            time.sleep(DELAY_SECONDS)
            if row is None:
                holidays += 1          # 休市,或今天收盤後資料還沒公布
                continue
            yi = lambda v: round(v / 1e8, 1)
            print(f"{key}  外資 {yi(row['foreign']):>8}  投信 {yi(row['trust']):>7}  自營商 {yi(row['dealer']):>8}  (億元)")
            if db is not None:
                from sqlalchemy.dialects.postgresql import insert as pg_insert
                values = {"date": key, "foreign_net": row["foreign"], "trust_net": row["trust"],
                          "dealer_net": row["dealer"], "total_net": row["total"]}
                stmt = pg_insert(models.MarketInstitutional).values(values).on_conflict_do_update(
                    index_elements=["date"], set_={k: v for k, v in values.items() if k != "date"})
                db.execute(stmt)
                db.commit()
                saved += 1
    finally:
        if db is not None:
            db.close()

    print(f"[三大法人] 寫入 {saved} 天,已存在略過 {skipped} 天,無資料(休市或尚未公布) {holidays} 天")


if __name__ == "__main__":
    main()