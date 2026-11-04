"""volatility_model.py 的測試(只用標準函式庫 unittest,不需要額外安裝東西)。

執行:
    cd ai_model
    python test_volatility_model.py -v
"""
import unittest

import numpy as np
import pandas as pd

from volatility_model import (COMPARE_WINDOWS, EPS, ILLIQUID_WINDOW, ILLIQUID_ZERO_SHARE, MIN_CLOSES, RECENT_WINDOW,
                              predict_volatility, zero_return_share)

# 與訓練結果無關的固定參數,用來測「算式本身」有沒有算對
FIXED = {"model_version": "test", "scaler_mean": [0.1, -0.2, 0.3, 0.0], "scaler_scale": [1.0, 2.0, 0.5, 1.5],
         "coef": [0.5, -0.3, 0.8, 0.1], "intercept": 0.2}
# 係數全為 0,只靠截距決定機率 → 可以精準控制輸出的機率
ZERO_COEF = {"model_version": "t", "scaler_mean": [0] * 4, "scaler_scale": [1] * 4, "coef": [0] * 4}

OK_FIELDS = {"status", "as_of_date", "horizon_days", "prob_expand", "confidence", "direction", "signal_strength",
             "label", "recent_vol", "avg_vol_20d", "avg_vol_60d", "explanation", "reliability_note", "model_version"}
ILLIQUID_FIELDS = {"status", "as_of_date", "zero_return_share", "message", "model_version"}


def make_closes(returns, start=100.0):
    """N 個報酬率 -> N 個收盤價(第一個收盤價 = start * (1 + 第一個報酬))。"""
    return pd.Series(start * np.cumprod(1 + np.asarray(returns, dtype=float)))


def closes_with_flat_days(n_flat, n=130, seed=0):
    """n 個收盤價;最近 ILLIQUID_WINDOW 天當中,剛好 n_flat 天的價格跟前一天一樣。"""
    returns = np.random.default_rng(seed).normal(0, 0.01, n)
    returns[n - ILLIQUID_WINDOW: n - ILLIQUID_WINDOW + n_flat] = 0.0
    return make_closes(returns)


def reference(closes, p):
    """獨立寫的參考算法:只用 numpy 陣列,不用 pandas rolling,對照 predict_volatility。"""
    c = np.asarray(closes, dtype=float)
    r = c[1:] / c[:-1] - 1
    rv = lambda w: np.std(r[-w:], ddof=1)
    rv_recent = rv(RECENT_WINDOW)
    f = np.array([np.log((rv_recent + EPS) / (rv(w) + EPS)) for w in COMPARE_WINDOWS])
    z = (f - np.array(p["scaler_mean"])) / np.array(p["scaler_scale"])
    logit = p["intercept"] + z @ np.array(p["coef"])
    return 1 / (1 + np.exp(-logit)), rv_recent, rv(20), rv(60)


class TestData(unittest.TestCase):
    def test_insufficient_data(self):
        res = predict_volatility(make_closes(np.zeros(MIN_CLOSES - 1)))  # 少一天
        self.assertEqual(res["status"], "insufficient_data")
        self.assertEqual(res["n_closes"], MIN_CLOSES - 1)

    def test_exactly_min_closes_is_ok(self):
        rng = np.random.default_rng(1)
        res = predict_volatility(make_closes(rng.normal(0, 0.01, MIN_CLOSES)))  # 剛好夠
        self.assertEqual(res["status"], "ok")

    def test_non_positive_price_is_invalid(self):
        s = make_closes(np.full(100, 0.001))
        s.iloc[50] = 0.0
        self.assertEqual(predict_volatility(s)["status"], "invalid_data")

    def test_nan_values_are_dropped(self):
        rng = np.random.default_rng(2)
        s = make_closes(rng.normal(0, 0.01, 99))
        s.iloc[[10, 40, 70]] = np.nan
        self.assertEqual(predict_volatility(s)["status"], "ok")

    def test_zero_recent_vol_does_not_crash(self):
        # 最近 3 天價格完全沒動(recent_vol = 0),但整體不算成交清淡 → 仍要算得出機率,不能 log(0)
        rng = np.random.default_rng(6)
        res = predict_volatility(make_closes(np.concatenate([rng.normal(0, 0.01, 120), [0.0, 0.0, 0.0]])))
        self.assertEqual(res["status"], "ok")
        self.assertEqual(res["recent_vol"], 0.0)
        self.assertTrue(0.0 <= res["prob_expand"] <= 1.0)

    def test_list_and_series_give_same_answer(self):
        rng = np.random.default_rng(3)
        s = make_closes(rng.normal(0, 0.01, 120))
        self.assertEqual(predict_volatility(s), predict_volatility(list(s)))

    def test_datetime_index_gives_as_of_date_and_is_sorted(self):
        rng = np.random.default_rng(4)
        s = make_closes(rng.normal(0, 0.01, 100))
        s.index = pd.bdate_range("2026-01-01", periods=len(s))
        res = predict_volatility(s)
        self.assertEqual(res["as_of_date"], s.index[-1].strftime("%Y-%m-%d"))
        shuffled = s.sample(frac=1, random_state=0)  # 順序打亂,模組應自己排回日期順序
        self.assertEqual(predict_volatility(shuffled)["prob_expand"], res["prob_expand"])


class TestMath(unittest.TestCase):
    def test_matches_independent_reference(self):
        for seed in range(6):
            rng = np.random.default_rng(seed)
            s = make_closes(rng.normal(0, rng.uniform(0.003, 0.02), 130))
            res = predict_volatility(s, params=FIXED)
            prob, rv3, rv20, rv60 = reference(s, FIXED)
            self.assertAlmostEqual(res["prob_expand"], round(prob, 4), places=6, msg=f"seed {seed}")
            self.assertAlmostEqual(res["confidence"], max(round(prob, 4), 1 - round(prob, 4)), places=6)
            self.assertAlmostEqual(res["recent_vol"], rv3, places=6)
            self.assertAlmostEqual(res["avg_vol_20d"], rv20, places=6)
            self.assertAlmostEqual(res["avg_vol_60d"], rv60, places=6)

    def test_signal_strength_and_labels(self):
        rng = np.random.default_rng(5)
        s = make_closes(rng.normal(0, 0.01, 100))
        cases = [  # (intercept, 期望 strength, 期望 direction, 期望 label)
            (3.0, "strong", "expand", "波動可能放大"),
            (-1.5, "strong", "contract", "波動可能縮小"),
            (0.4, "moderate", "expand", "波動可能放大"),
            (-0.4, "moderate", "contract", "波動可能縮小"),
            (0.0, "weak", "expand", "波動變化不明顯"),
        ]
        for intercept, strength, direction, label in cases:
            res = predict_volatility(s, params={**ZERO_COEF, "intercept": intercept})
            self.assertEqual((res["signal_strength"], res["direction"], res["label"]), (strength, direction, label),
                             msg=f"intercept={intercept}, prob={res['prob_expand']}")

    def test_confidence_is_probability_of_displayed_side(self):
        rng = np.random.default_rng(5)
        s = make_closes(rng.normal(0, 0.01, 100))
        for intercept in (3.0, 0.4, 0.0, -0.4, -1.5, -4.0):
            res = predict_volatility(s, params={**ZERO_COEF, "intercept": intercept})
            expected = res["prob_expand"] if res["direction"] == "expand" else 1.0 - res["prob_expand"]
            self.assertAlmostEqual(res["confidence"], expected, places=9, msg=f"intercept={intercept}")
            self.assertGreaterEqual(res["confidence"], 0.5)
        # 縮小那一邊:prob_expand = 0.1824 → 畫面顯示「縮小 81.76%」
        res = predict_volatility(s, params={**ZERO_COEF, "intercept": -1.5})
        self.assertEqual(res["direction"], "contract")
        self.assertAlmostEqual(res["prob_expand"] + res["confidence"], 1.0, places=9)
        self.assertGreater(res["confidence"], 0.8)


class TestIlliquidGuard(unittest.TestCase):
    def test_constant_prices_are_illiquid(self):
        res = predict_volatility([100.0] * 80)
        self.assertEqual(res["status"], "illiquid")
        self.assertEqual(res["zero_return_share"], 1.0)

    def test_boundary_is_strictly_more_than_threshold(self):
        limit = int(ILLIQUID_WINDOW * ILLIQUID_ZERO_SHARE)  # 剛好等於門檻的天數(60 天 × 50% = 30 天)
        self.assertEqual(predict_volatility(closes_with_flat_days(limit))["status"], "ok")  # 剛好等於門檻:不算「超過」
        res = predict_volatility(closes_with_flat_days(limit + 1))  # 多一天就超過
        self.assertEqual(res["status"], "illiquid")
        self.assertAlmostEqual(res["zero_return_share"], (limit + 1) / ILLIQUID_WINDOW, places=4)

    def test_only_last_60_days_count(self):
        # 很久以前有一大段沒動(整個前半段),但最近 60 天正常 → 不算成交清淡
        rng = np.random.default_rng(7)
        returns = np.concatenate([np.zeros(70), rng.normal(0, 0.01, 80)])
        self.assertEqual(predict_volatility(make_closes(returns))["status"], "ok")

    def test_illiquid_returns_no_probability(self):
        res = predict_volatility(closes_with_flat_days(42), params=FIXED)
        self.assertEqual(set(res), ILLIQUID_FIELDS)
        self.assertIn("70%", res["message"])  # 訊息裡要帶出實際的沒動比例(42/60 = 70%)
        self.assertIn("沒變動", res["message"])

    def test_illiquid_has_as_of_date(self):
        s = closes_with_flat_days(42)
        s.index = pd.bdate_range("2026-01-01", periods=len(s))
        self.assertEqual(predict_volatility(s)["as_of_date"], s.index[-1].strftime("%Y-%m-%d"))

    def test_float_noise_still_counts_as_flat(self):
        # 還原價的浮點誤差(相對差 1e-13)不能讓「沒動」的日子逃過偵測
        noisy = pd.Series([100.0 * (1 + 1e-13 * (i % 2)) for i in range(80)])
        self.assertEqual(predict_volatility(noisy)["status"], "illiquid")

    def test_real_one_tick_move_is_not_flat(self):
        # 每天真的差一檔(100 → 100.5 → 100 ...),0.5% 的變動不能被當成沒動
        ticks = pd.Series([100.0 + 0.5 * (i % 2) for i in range(80)])
        self.assertEqual(zero_return_share(ticks).iloc[-1], 0.0)

    def test_zero_return_share_values(self):
        s = closes_with_flat_days(12)
        share = zero_return_share(s)
        self.assertAlmostEqual(share.iloc[-1], 12 / ILLIQUID_WINDOW)
        self.assertTrue(share.iloc[:ILLIQUID_WINDOW].isna().all())  # 資料不滿 60 天的部分沒有值


class TestBehaviour(unittest.TestCase):
    """用訓練好的權重(volatility_params.json)檢查『均值回歸』的方向沒有寫反。"""

    def test_calm_after_turbulent_predicts_expansion(self):
        rng = np.random.default_rng(10)
        returns = np.concatenate([rng.normal(0, 0.015, 120), [0.0004, -0.0003, 0.0002]])
        res = predict_volatility(make_closes(returns))
        self.assertGreater(res["prob_expand"], 0.5)
        self.assertEqual(res["direction"], "expand")
        self.assertEqual(res["confidence"], res["prob_expand"])

    def test_turbulent_after_calm_predicts_contraction(self):
        rng = np.random.default_rng(11)
        returns = np.concatenate([rng.normal(0, 0.003, 120), [0.04, -0.05, 0.03]])
        res = predict_volatility(make_closes(returns))
        self.assertLess(res["prob_expand"], 0.5)
        self.assertEqual(res["direction"], "contract")
        self.assertAlmostEqual(res["confidence"], 1 - res["prob_expand"], places=9)

    def test_output_fields(self):
        rng = np.random.default_rng(12)
        res = predict_volatility(make_closes(rng.normal(0, 0.01, 100)))
        self.assertEqual(set(res), OK_FIELDS)  # 舊欄位名 prob_rise 不能再出現


if __name__ == "__main__":
    unittest.main()
