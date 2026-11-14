"""
匯入上市公司過去幾個月的月營收,讓首頁可以畫趨勢。
資料來源:公開資訊觀測站「每月營業收入彙總表」。該網站的 robots.txt 不允許程式自動抓取,
所以由人用瀏覽器打開頁面、存成 HTML 檔,這支程式只讀本機的檔案。單位是千元,寫進 monthly_revenue 表。

每個月有兩頁:_0 是國內公司,_1 是外國公司(KY)。網址格式(115 是民國年):
    https://mopsov.twse.com.tw/nas/t21/sii/t21sc03_115_9_0.html
存檔時檔名保留 t21sc03_115_9_0 這段,程式靠它判斷月份。

用法(在 backend 資料夾、啟動 .venv 後):
    python revenue_backfill.py data/mops_revenue            # 預覽:解析並跟資料庫比對,不寫入
    python revenue_backfill.py data/mops_revenue --apply    # 寫入資料庫裡還沒有的月份
    python revenue_backfill.py data/mops_revenue --apply --overwrite   # 連已存在的月份也覆蓋
"""
from __future__ import annotations

import argparse
import re
from pathlib import Path

from bs4 import BeautifulSoup

from revenue_fetcher import to_int, upsert_revenue

CODE_RE = re.compile(r"^[0-9A-Z]{4,6}$")
INDUSTRY_RE = re.compile(r"產業別\s*[:：]\s*([^\s（(]+)")
NAME_RE = re.compile(r"_(\d{2,3})_(\d{1,2})_[01]")
TEXT_RE = re.compile(r"(\d{2,3})\s*年\s*(\d{1,2})\s*月")


def read_html(path: Path) -> str:
    """瀏覽器存的檔案可能是 UTF-8,也可能是原始的 Big5。"""
    raw = path.read_bytes()
    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError:
        return raw.decode("cp950", errors="replace")


def month_of(path: Path, html: str):
    """回傳 ('2026-09', 判斷依據);判斷不出來回傳 (None, None)。"""
    for regex, how in ((NAME_RE, "檔名"), (TEXT_RE, "內文")):
        m = regex.search(path.name if how == "檔名" else html)
        if m and 1 <= int(m.group(2)) <= 12:
            return f"{int(m.group(1)) + 1911}-{int(m.group(2)):02d}", how
    return None, None


def parse_page(html: str, year_month: str) -> list:
    """解析一頁彙總表,回傳可寫入 monthly_revenue 的資料列。"""
    soup = BeautifulSoup(html, "html.parser")
    industry = None
    rows = []
    for tr in soup.find_all("tr"):
        if tr.find("tr") is not None:          # 外層表格的列(裡面還包著表格),略過
            continue
        m = INDUSTRY_RE.search(tr.get_text(" ", strip=True))
        if m:
            industry = m.group(1)
            continue
        cells = [td.get_text(strip=True) for td in tr.find_all("td", recursive=False)]
        if len(cells) < 10 or not CODE_RE.match(cells[0]):
            continue                            # 表頭、合計列
        remark = cells[10] if len(cells) > 10 else ""
        rows.append({
            "symbol": cells[0],
            "company_name": cells[1],
            "industry": industry,
            "market": "listed",
            "year_month": year_month,
            "revenue": to_int(cells[2]),
            "revenue_prev_month": to_int(cells[3]),
            "revenue_year_ago": to_int(cells[4]),
            "remark": remark if remark not in ("", "-") else None,
            "report_date": None,
            "source": "mops",
        })
    return rows


def existing_in_db(year_month: str):
    """資料庫裡這個月份現有的 (家數, 合計千元, 產業名稱集合)。"""
    from sqlalchemy import func
    from database import SessionLocal
    import models
    M = models.MonthlyRevenue
    with SessionLocal() as db:
        n, total = db.query(func.count(M.id), func.sum(M.revenue)).filter(M.year_month == year_month).one()
        names = {r[0] for r in db.query(M.industry).filter(M.year_month == year_month).distinct()}
    return n, int(total or 0), names


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("folder", help="放 HTML 檔的資料夾,例如 data/mops_revenue")
    ap.add_argument("--apply", action="store_true", help="真的寫入資料庫;沒加就只預覽")
    ap.add_argument("--overwrite", action="store_true", help="資料庫已有的月份也覆蓋(預設略過)")
    args = ap.parse_args()

    files = sorted(p for p in Path(args.folder).iterdir() if p.suffix.lower() in (".html", ".htm"))
    if not files:
        raise SystemExit(f"{args.folder} 裡沒有 .html 檔")

    by_month = {}
    for path in files:
        html = read_html(path)
        ym, how = month_of(path, html)
        if ym is None:
            print(f"⚠ 判斷不出月份,略過:{path.name}(檔名請保留 t21sc03_115_9_0 這段)")
            continue
        rows = parse_page(html, ym)
        note = "" if how == "檔名" else "  ← 月份是從內文判斷的,請確認"
        print(f"{path.name}: {ym},{len(rows)} 家{note}")
        if not rows:
            print("    ⚠ 沒有解析到任何公司,可能存成了別的格式,或頁面不是營收彙總表")
        month = by_month.setdefault(ym, {"rows": {}, "files": 0})
        month["files"] += 1
        month["rows"].update({r["symbol"]: r for r in rows})

    print()
    for ym in sorted(by_month):
        rows = list(by_month[ym]["rows"].values())
        total = sum(r["revenue"] or 0 for r in rows)
        names = {r["industry"] for r in rows}
        no_industry = sum(r["industry"] is None for r in rows)
        print(f"{ym}:{by_month[ym]['files']} 個檔案|{len(rows)} 家|產業 {len(names)} 類(沒有產業的 {no_industry} 家)|合計 {total:,} 千元")
        if by_month[ym]["files"] < 2:
            print("    ⚠ 這個月只有 1 個檔案,應該有 _0(國內)和 _1(KY)兩頁")
        db_n, db_total, db_names = existing_in_db(ym)
        if db_n:
            print(f"    資料庫已有:{db_n} 家|合計 {db_total:,} 千元|差 {len(rows) - db_n:+d} 家、{total - db_total:+,} 千元")
            new_names = sorted(n for n in names - db_names if n)
            if new_names:
                print(f"    ⚠ 產業名稱跟資料庫不同:{new_names}")
        if not args.apply or not rows:
            continue
        if db_n and not args.overwrite:
            print("    資料庫已有這個月,略過(要覆蓋請加 --overwrite)")
            continue
        from database import SessionLocal
        with SessionLocal() as db:
            upsert_revenue(db, rows)
        print("    已寫入")

    if not args.apply:
        print("\n這是預覽,沒有寫入資料庫。確認後加上 --apply。")


if __name__ == "__main__":
    main()