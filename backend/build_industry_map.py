"""
產生「股票代號 -> 產業別」對照表 backend/industry_map.json（只需執行一次，之後有新上市櫃公司再重跑）。

資料來源：證交所 ISIN 公開頁面（上市、上櫃、興櫃的有價證券清單，含產業別文字名稱）。

用法（在專案根目錄執行）：
    python backend/build_industry_map.py
    python backend/build_industry_map.py --html 上市.html 上櫃.html     # 網路抓不到時，改讀你手動存下的網頁

注意：
  - 網頁是 Big5 編碼；程式已處理。
  - 下載會經過 robots.txt 檢查與限速（和爬蟲共用同一個 Fetcher）。
  - 跑完會印出「每個產業別 -> 本專案分類」的對照，請花一分鐘確認有沒有對錯或沒對到的產業。
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from collections import defaultdict

import industry_lookup as il

ISIN_URLS = {
    "上市": "https://isin.twse.com.tw/isin/C_public.jsp?strMode=2",
    "上櫃": "https://isin.twse.com.tw/isin/C_public.jsp?strMode=4",
    "興櫃": "https://isin.twse.com.tw/isin/C_public.jsp?strMode=5",
}
OUT_PATH = il.MAP_PATH
MIN_EXPECTED = 500        # 只解析到這麼少，幾乎可以確定網頁格式跟預期不同


def _clean(cell: str) -> str:
    cell = re.sub(r"<[^>]+>", "", cell)
    return cell.replace("&nbsp;", " ").replace("\xa0", " ").strip()


def parse_isin_html(html: str) -> dict[str, dict]:
    """
    解析 ISIN 頁面。每列大致是：
        代號　名稱 | ISIN | 上市日 | 市場別 | 產業別 | CFICode | 備註
    只留下「普通股」（CFICode 以 ES 開頭），權證、ETF、特別股等一律略過。
    對 HTML 寫法寬鬆（不要求有 </td> </tr>）。
    """
    out: dict[str, dict] = {}
    for row in re.split(r"<tr[^>]*>", html, flags=re.I)[1:]:
        cells = [_clean(c) for c in re.split(r"<td[^>]*>", row, flags=re.I)[1:]]
        if len(cells) < 6:
            continue
        m = re.match(r"^(\d{4})[\s　]+(.+)$", cells[0])
        if not m:
            continue
        market, industry, cfi = cells[3], cells[4], cells[5]
        if not cfi.upper().startswith("ES"):
            continue
        out.setdefault(m.group(1), {"name": m.group(2).strip(), "industry": industry, "market": market})
    return out


def fetch_all() -> dict[str, dict]:
    import news_sources as ns       # 共用 Fetcher：robots.txt 檢查、限速、403 保護

    fetcher = ns.Fetcher(delay=2.0)
    merged: dict[str, dict] = {}
    for market, url in ISIN_URLS.items():
        r = fetcher.get(url)
        if r is None:
            print(f"✗ {market}：抓不到（網站拒絕、robots.txt 不允許或連線失敗），略過")
            continue
        found = parse_isin_html(r.content.decode("cp950", errors="replace"))
        print(f"✓ {market}：解析出 {len(found)} 檔普通股")
        for code, info in found.items():
            merged.setdefault(code, info)
    return merged


def load_html_files(paths: list[str]) -> dict[str, dict]:
    merged: dict[str, dict] = {}
    for p in paths:
        raw = open(p, "rb").read()
        try:
            text = raw.decode("cp950")
        except UnicodeDecodeError:
            text = raw.decode("utf-8", errors="replace")
        found = parse_isin_html(text)
        print(f"✓ {p}：解析出 {len(found)} 檔普通股")
        for code, info in found.items():
            merged.setdefault(code, info)
    return merged


def print_report(table: dict[str, dict]) -> None:
    by_ind: dict[str, list[str]] = defaultdict(list)
    for code, info in table.items():
        by_ind[info["industry"]].append(f"{code}{info['name']}")
    print("\n===== 產業別 -> 本專案分類（請確認）=====")
    print(f"{'證交所產業別':<14}{'檔數':>5}  {'本專案分類':<8}範例")
    unmapped = []
    for ind, names in sorted(by_ind.items(), key=lambda kv: -len(kv[1])):
        cat = il.industry_to_category(ind)
        if cat is None:
            unmapped.append(ind)
        print(f"{ind:<14}{len(names):>5}  {cat or '（不對應，交給 AI）':<8}{'、'.join(names[:2])}")
    if unmapped:
        print(f"\n以下產業別沒有對到任何分類：{'、'.join(unmapped)}")
        print("→ 若其中有該歸入某個分類的，改 industry_lookup.py 裡的 CATEGORY_RULES 即可（不用重新下載）。")


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="建立 股票代號 -> 產業別 對照表")
    ap.add_argument("--html", nargs="+", help="改讀手動存下的 ISIN 網頁（上市／上櫃／興櫃），不連網")
    args = ap.parse_args(argv)

    table = load_html_files(args.html) if args.html else fetch_all()
    if len(table) < MIN_EXPECTED:
        print(f"\n只解析到 {len(table)} 檔（預期上千檔），沒有寫入。可能是網頁格式改了、被網站拒絕，或編碼不對。")
        print("請把 ISIN 頁面另存成 .html，改用 --html 指定，並把這段訊息告訴 Claude。")
        return 1

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(table, f, ensure_ascii=False, indent=0, sort_keys=True)
    print(f"\n已寫入 {OUT_PATH}（共 {len(table)} 檔）")
    print_report(table)
    return 0


if __name__ == "__main__":
    sys.exit(main())
