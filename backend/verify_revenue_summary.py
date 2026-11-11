import re
from database import SessionLocal
import models
from market_aggregate import market_revenue_summary

YM = "2026-09"
THOUSAND_PER_YI = 100_000

db = SessionLocal()
try:
    rows = (
        db.query(models.AiSummary)
        .filter_by(scope="market", summary_type="monthly_revenue", ref=YM)
        .order_by(models.AiSummary.created_at.desc())
        .all()
    )
    if not rows:
        raise SystemExit(f"找不到 {YM} 的摘要")

    latest = rows[0]
    agg = market_revenue_summary(db, YM)

    cur = f"{agg['revenue_total_thousand'] / THOUSAND_PER_YI:,.0f}"
    ago = f"{agg['year_ago_total_thousand'] / THOUSAND_PER_YI:,.0f}"
    yoy = f"{agg['yoy_pct']:.1f}"
    text = latest.summary_text

    print(f"該組共 {len(rows)} 筆: {[(r.id, r.prompt_version) for r in rows]}")
    print(f"最新一筆 id={latest.id} ({latest.prompt_version}): {text}\n")

    # 摘要裡出現的數字,除了這幾個之外都算可疑(模型自己編的)
    allowed = {cur, ago, yoy, "2026", "9"}
    found = [n.rstrip(".") for n in re.findall(r"\d[\d,]*\.?\d*", text)]
    extra = [n for n in found if n not in allowed]

    snap = (latest.input_snapshot or {}).get("source_aggregate", {})
    fake = db.query(models.AiSummary).filter(models.AiSummary.summary_text.contains("2,850")).count()
    bad_ref = [r.id for r in db.query(models.AiSummary).all()
               if not re.fullmatch(r"\d{4}-\d{2}", r.ref or "")]

    checks = {
        "摘要含期間原文「2026年9月上市公司合計」": "2026年9月上市公司合計" in text,
        f"含當月合計 {cur} 億": cur in text,
        f"含去年同期 {ago} 億": ago in text,
        f"含年增率 {yoy}%": yoy in text,
        f"沒有多出來的數字 {extra}": not extra,
        "快照裡的合計跟現在資料庫一致(資料沒被改過)":
            snap.get("revenue_total_thousand") == agg["revenue_total_thousand"],
        "沒有第六步的假資料(2,850 億)": fake == 0,
        f"所有 ref 都是 YYYY-MM 格式(異常 id: {bad_ref})": not bad_ref,
    }
    for name, ok in checks.items():
        print("✅" if ok else "❌", name)
finally:
    db.close()