"""簡單波動預測模型(邏輯回歸版)— AI 端交付給後端的推論模組。

只依賴 pandas / numpy,不需要 PyTorch、scikit-learn。
給它一檔股票最近的每日收盤價,回傳「未來 3 個交易日的波動,會比最近 3 個交易日更大」的機率。

原理(白話): 波動有「均值回歸」的特性 — 最近特別平靜,接下來通常會回升;最近特別劇烈,
接下來通常會回落。這裡把「最近 3 天的波動」分別跟過去 5/10/20/60 天的平均波動比,
得到 4 個比值,再用一組訓練好的權重(volatility_params.json)算成機率。

這個模型只描述「波動幅度」,不預測漲跌方向。

用法:
    from volatility_model import predict_volatility
    result = predict_volatility(closes)   # closes: 依日期由舊到新排列的每日收盤價
"""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

import numpy as np
import pandas as pd

PARAMS_PATH = Path(__file__).resolve().parent / "volatility_params.json"

# ── 特徵定義:訓練與推論共用同一份,改這裡就必須重新訓練 ──
RECENT_WINDOW = 3                   # 「最近波動」= 最近 3 天每日報酬的標準差
COMPARE_WINDOWS = (5, 10, 20, 60)   # 拿最近波動,跟這幾種長度的平均波動相比
HORIZON = 3                         # 預測未來 3 個交易日
EPS = 1e-6                          # 波動為 0 時避免 log 出錯
MIN_CLOSES = 65                     # 至少需要的收盤價天數(最長比較窗格 60 天,再留一點餘裕)

# 訊號強度:機率離 0.5 越遠,訊號越明顯
STRONG_GAP = 0.20   # 機率 >= 0.70 或 <= 0.30
MODERATE_GAP = 0.05  # 機率 >= 0.55 或 <= 0.45;更接近 0.5 視為不明顯

# 成交清淡保護:最近 ILLIQUID_WINDOW 天中,超過 ILLIQUID_ZERO_SHARE 的日子收盤價跟前一天一樣 → 不提供預測。
# 只看「價格有沒有動」,不看成交量(模組只拿得到收盤價)。門檻 50% 是實測選的(非台灣50共 818 檔,2024-05 之後):
# 沒動比例 25~50% 的股票準確率仍有約 69.5%(只比正常低 1.5~2 個百分點),超過 50% 才崩到 62.6%(明顯訊號 59.4%)。
# 原本設 25%,會誤擋中華電 2412(43% 的日子)、台灣大 3045(34%)這類價格很穩的大型股;50% 則台灣50 一檔都不會被擋。
ILLIQUID_WINDOW = 60
ILLIQUID_ZERO_SHARE = 0.50
ZERO_RETURN_TOL = 1e-8              # 報酬率絕對值小於此數就算「價格沒動」(還原價的浮點誤差用,台股最小跳動單位遠大於此)

assert RECENT_WINDOW == HORIZON, "標籤定義是『未來 N 天波動 vs 過去 N 天波動』,兩者長度必須一致"


def zero_return_share(closes: pd.Series) -> pd.Series:
    """每一天往回看 ILLIQUID_WINDOW 天,收盤價與前一天相同(價格沒動)的日子佔幾成。成交清淡保護用。

    訓練腳本與推論共用這一份定義,避免兩邊算法不一致。前 ILLIQUID_WINDOW 天為 NaN。
    """
    r = closes.pct_change()
    flat = (r.abs() < ZERO_RETURN_TOL).astype(float)
    flat[r.isna()] = np.nan
    return flat.rolling(ILLIQUID_WINDOW).mean()


def compute_features(closes: pd.Series) -> pd.DataFrame:
    """由收盤價算出每一天的波動與 4 個比值特徵(向後看,不會偷看未來)。

    回傳欄位: rv_recent, rv5, rv10, rv20, rv60, f5, f10, f20, f60
    其中 f{w} = log((最近波動 + EPS) / (w 天平均波動 + EPS))。
    """
    r = closes.pct_change()
    out = pd.DataFrame(index=closes.index)
    out["rv_recent"] = r.rolling(RECENT_WINDOW).std()
    for w in COMPARE_WINDOWS:
        out[f"rv{w}"] = r.rolling(w).std()
        out[f"f{w}"] = np.log((out["rv_recent"] + EPS) / (out[f"rv{w}"] + EPS))
    return out


@lru_cache(maxsize=4)
def _load_params_cached(path: str) -> dict:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def load_params(path: Path | str = PARAMS_PATH) -> dict:
    return _load_params_cached(str(path))


def _clean_closes(closes) -> pd.Series:
    if isinstance(closes, pd.Series):
        s = closes.copy()
    else:
        s = pd.Series(np.asarray(closes, dtype=float))
    s = pd.to_numeric(s, errors="coerce").dropna()
    if isinstance(s.index, pd.DatetimeIndex) and not s.index.is_monotonic_increasing:
        s = s.sort_index()
    return s


def _signal_strength(prob: float) -> str:
    gap = abs(prob - 0.5)
    if gap >= STRONG_GAP:
        return "strong"
    if gap >= MODERATE_GAP:
        return "moderate"
    return "weak"


def predict_volatility(closes, params: dict | None = None) -> dict:
    """預測「未來 HORIZON 個交易日的波動,是否比最近 HORIZON 個交易日更大」。

    closes: 每日收盤價(pandas Series / list / numpy array),依日期由舊到新。
            建議用 yfinance 的 auto_adjust=True 還原價(訓練時就是這個口徑)。
    回傳 dict,status 為 "ok" / "insufficient_data" / "invalid_data" / "illiquid":
      - insufficient_data: 收盤價不到 MIN_CLOSES 天(例如新上市股票),不要硬算
      - invalid_data: 有非正數價格,或算出來的特徵不是有限數字
      - illiquid: 成交清淡(最近 ILLIQUID_WINDOW 天超過 ILLIQUID_ZERO_SHARE 的日子價格沒動),不提供機率。
        這是正常狀態、不是錯誤,畫面上顯示 message 即可。
    """
    p = params if params is not None else load_params()
    s = _clean_closes(closes)

    if len(s) < MIN_CLOSES:
        return {"status": "insufficient_data", "n_closes": int(len(s)), "min_closes": MIN_CLOSES,
                "message": f"收盤價資料不足({len(s)} 天),至少需要 {MIN_CLOSES} 個交易日"}
    if (s <= 0).any():
        return {"status": "invalid_data", "message": "收盤價含有非正數,無法計算報酬率"}

    as_of = s.index[-1].strftime("%Y-%m-%d") if isinstance(s.index, pd.DatetimeIndex) else None
    zero_share = float(zero_return_share(s).iloc[-1])
    if zero_share > ILLIQUID_ZERO_SHARE:
        return {"status": "illiquid", "as_of_date": as_of, "zero_return_share": round(zero_share, 4),
                # 不直接說「這檔成交清淡」:判斷依據是價格沒動,穩定的大型股也可能符合,措辭要對每一種被擋下的股票都是真的
                "message": f"近 {ILLIQUID_WINDOW} 個交易日有 {zero_share:.0%} 的日子收盤價完全沒變動"
                           "(價格變動太少,常見於成交清淡的股票),波動預測的可靠度偏低,因此不提供預測。",
                "model_version": p.get("model_version", "unknown")}

    feats = compute_features(s).iloc[-1]
    x = np.array([feats[f"f{w}"] for w in COMPARE_WINDOWS], dtype=float)
    if not np.isfinite(x).all():
        return {"status": "invalid_data", "message": "算出的波動特徵不是有限數字,請檢查價格資料"}

    z = (x - np.array(p["scaler_mean"])) / np.array(p["scaler_scale"])
    logit = float(p["intercept"] + z @ np.array(p["coef"]))
    prob = float(1.0 / (1.0 + np.exp(-logit)))

    strength = _signal_strength(prob)
    direction = "expand" if prob >= 0.5 else "contract"
    if strength == "weak":
        label = "波動變化不明顯"
    else:
        label = "波動可能放大" if direction == "expand" else "波動可能縮小"

    rv_recent, rv20, rv60 = float(feats["rv_recent"]), float(feats["rv20"]), float(feats["rv60"])
    prob_expand = round(prob, 4)

    ev = p.get("evaluation", {})
    if "accuracy" in ev:
        where = "、".join(x for x in (ev.get("test_scope"), f"{ev['test_start']} 之後" if ev.get("test_start") else "") if x)
        note = (f"歷史回測準確率約 {ev['accuracy']:.0%}" + (f"({where})" if where else "") +
                ";僅描述波動幅度,不代表漲跌方向,不構成投資建議。")
    else:
        note = "僅描述波動幅度,不代表漲跌方向,不構成投資建議。"

    return {
        "status": "ok",
        "as_of_date": as_of,
        "horizon_days": HORIZON,
        "prob_expand": prob_expand,   # 未來 3 天波動「放大」的機率(模型原始輸出,不是股價漲的機率)
        # 畫面上要顯示的機率 = 預測那一邊的機率:放大 → prob_expand;縮小 → 1 − prob_expand。前端直接顯示即可。
        # 永遠 >= 0.5;signal_strength 為 weak 時只有 50~55%,畫面上不要強調。
        "confidence": round(prob_expand if direction == "expand" else 1.0 - prob_expand, 4),
        "direction": direction,
        "signal_strength": strength,
        "label": label,
        "recent_vol": round(rv_recent, 6),
        "avg_vol_20d": round(rv20, 6),
        "avg_vol_60d": round(rv60, 6),
        # 刻意只陳述數字,不寫「低於/高於平均所以…」:3 天的波動天生比 20、60 天的小(樣本少,標準差偏低),
        # 所以『略低於平均』不等於『會放大』,模型是綜合四種天期的比較才下判斷。寫成因果句會讓
        # 約 18% 的日子看起來跟標籤互相矛盾(訊號明顯的日子只有 2%)。
        "explanation": f"最近 {RECENT_WINDOW} 天平均每日波動約 {rv_recent:.2%};過去 20 天平均 {rv20:.2%}、"
                       f"過去 60 天平均 {rv60:.2%}。模型綜合最近 {RECENT_WINDOW} 天與過去 "
                       f"{'/'.join(map(str, COMPARE_WINDOWS))} 天平均波動的比較來判斷。",
        "reliability_note": note,
        "model_version": p.get("model_version", "unknown"),
    }
