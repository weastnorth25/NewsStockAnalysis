"""把整理好的總經事件匯入 macro_events 表。支援 CSV(從 Numbers、Excel、Google 試算表匯出)和 JSON。
同一個 id 會更新,所以公布後補上 actual 再匯入一次即可。

用法(在 backend 資料夾、啟動 .venv 後):
    python import_macro_events.py data/macro_events.csv            # 只檢查,不寫入
    python import_macro_events.py data/macro_events.csv --apply    # 寫入資料庫

CSV 格式:第一列是欄位名稱(id, series, datetime, ...),之後每一列是一個事件;空白格子代表沒有值。
"""
import argparse
import csv
import json

from macro_events import validate_seed, parse_utc

FIELDS = ("series", "country", "category", "importance", "name", "short",
          "expected", "previous", "actual", "result")
ALL_COLUMNS = ("id", "datetime") + FIELDS + ("aiSummary",)
EMPTY_WORDS = {"", "null", "none", "-"}     # 這些都當成「沒有值」


def _clean(v):
    if not isinstance(v, str):
        return v
    v = v.strip()
    return None if v.lower() in EMPTY_WORDS else v


def load(path: str) -> list:
    if path.lower().endswith(".csv"):
        with open(path, encoding="utf-8-sig", newline="") as f:   # utf-8-sig:去掉 Excel/Numbers 加的 BOM
            rows = list(csv.DictReader(f))
        if rows:
            missing = [c for c in ALL_COLUMNS if c not in rows[0]]
            if missing:
                raise SystemExit(f"CSV 第一列少了欄位:{', '.join(missing)}")
        items = []
        for r in rows:
            item = {k: _clean(v) for k, v in r.items() if k}
            if any(item.values()):              # 整列空白就略過
                items.append(item)
        return items
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("file", help="CSV 或 JSON 檔")
    ap.add_argument("--apply", action="store_true", help="真的寫入資料庫;沒加就只檢查")
    args = ap.parse_args()

    items = load(args.file)
    bad, seen = 0, set()
    for n, item in enumerate(items, 1):
        errors = validate_seed(item)
        if item.get("id") in seen:
            errors.append("id 重複")
        seen.add(item.get("id"))
        if errors:
            bad += 1
            print(f"第 {n} 筆 {item.get('id')}: " + "; ".join(errors))

    print(f"\n共 {len(items)} 筆,有問題 {bad} 筆")
    if bad:
        print("請先修正上面的問題,沒有寫入任何資料。")
        return

    print("\n預覽(請確認數字沒有被表格軟體改掉,例如 2.5% 變成 0.025):")
    for item in items:
        print(f"  {item['id']:<20} {item['datetime']}  預期 {item.get('expected')}  前值 {item.get('previous')}"
              f"  實際 {item.get('actual')}  結果 {item.get('result')}")

    if not args.apply:
        print("\n檢查通過。這是預覽,沒有寫入;確認後加上 --apply。")
        return

    from database import SessionLocal
    import models
    db = SessionLocal()
    try:
        for item in items:
            db.merge(models.MacroEvent(
                id=item["id"],
                datetime_utc=parse_utc(item["datetime"]),
                ai_summary=item.get("aiSummary"),
                **{k: item.get(k) for k in FIELDS},
            ))           # 有同 id 就更新,沒有就新增
        db.commit()
        print(f"\n已寫入 {len(items)} 筆。")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()