# 波動預測

預測一檔股票**未來 3 個交易日的波動,會不會比最近 3 個交易日更大**,輸出機率。

- **不預測漲跌。** 波動放大可能是大漲,也可能是大跌,畫面上不要暗示方向。
- 不需要 PyTorch、GPU、資料庫或金鑰,也不會在網站上訓練。權重已經訓練好,存在 `volatility_params.json`。

## 檔案

| 檔案 | 用途 | 上線需要 |
|---|---|---|
| `volatility_model.py` | 模型,後端 import 這個 | ✅ |
| `volatility_params.json` | 訓練好的權重 | ✅ 要跟上面的檔案放在一起 |
| `test_volatility_model.py` | 單元測試 | |
| `demo_predict.py` | 展示:輸入代號,印出預測 | |
| `requirements.txt` | 依賴 | |

## 自己跑跑看

前置作業:Python 3.10 ~ 3.12(3.10、3.12 已實測)。**Python 3.13 以上裝不了**,因為專案鎖定的 numpy 2.0.2 沒有對應的安裝檔。環境變數:不需要。

```
cd ai_model/volatility
python -m venv venv
venv\Scripts\activate              (Mac:source venv/bin/activate)
pip install -r requirements.txt

python test_volatility_model.py    # 應該顯示 Ran 21 tests ... OK
python demo_predict.py 2330.TW     # 需要連網
```

## 後端怎麼接

把下面這段加進 `backend/main.py`。它已經用 `backend/requirements.txt` 的版本實測過,不需要新增套件。

```python
import sys
from datetime import datetime, time, timedelta, timezone
from pathlib import Path

from cachetools import TTLCache

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "ai_model" / "volatility"))
from volatility_model import predict_volatility

_volatility_cache = TTLCache(maxsize=3000, ttl=3600)  # 同一檔股票 1 小時內不重抓
_TAIPEI = timezone(timedelta(hours=8))


@app.get("/api/stock/{ticker}/volatility")
def get_stock_volatility(ticker: str):
    if ticker in _volatility_cache:
        return _volatility_cache[ticker]

    closes = yf.Ticker(ticker).history(period="6mo", auto_adjust=True)["Close"]
    if closes.empty:
        raise HTTPException(status_code=404, detail="找不到該股票的交易資料，請確認代號是否正確。")

    # 盤中最後一筆是跳動中的價格,不是收盤價,要去掉
    now = datetime.now(_TAIPEI)
    if closes.index[-1].date() == now.date() and now.time() < time(13, 35):
        closes = closes.iloc[:-1]

    result = predict_volatility(closes)
    if result["status"] in ("insufficient_data", "invalid_data"):
        raise HTTPException(status_code=422, detail=result["message"])
    _volatility_cache[ticker] = result
    return result
```

**要確認一件事**:上面這段會去讀 `backend/` 旁邊的 `ai_model/` 資料夾。如果 Render 的 Root Directory 設成 `backend`,部署後可能讀不到。部署後打一次 `/api/stock/2330.TW/volatility` 就知道;如果出現 `ModuleNotFoundError`,把 Root Directory 留空,並把 Build / Start 指令改成先 `cd backend`。

## 輸入與輸出

**輸入**:每日收盤價,由舊到新,至少 65 個交易日。一定要用還原價(`auto_adjust=True`)。

**輸出**(`status` 是 `ok` 時):

| 欄位 | 說明 | 範例 |
|---|---|---|
| `as_of_date` | 最後一筆收盤價的日期 | `"2026-10-13"` |
| `horizon_days` | 預測未來幾個交易日 | `3` |
| `label` | 給使用者看的結論 | `"波動可能放大"` |
| `confidence` | **畫面要顯示的機率**,已經換算好 | `0.85` |
| `prob_expand` | 模型原始輸出:波動放大的機率。**不是上漲機率**,畫面不要直接用 | `0.85` |
| `direction` | `expand`(放大)/ `contract`(縮小) | `"expand"` |
| `signal_strength` | `strong` / `moderate` / `weak` | `"strong"` |
| `recent_vol` / `avg_vol_20d` / `avg_vol_60d` | 最近 3 天、過去 20 天、過去 60 天的每日波動 | `0.0092` = 0.92% |
| `explanation` | 一句話陳述上面三個數字 | |
| `reliability_note` | 歷史準確率與免責說明,**畫面一定要顯示** | |
| `model_version` | 權重版本 | |

**其他 `status`**:

| status | 意思 | 上面那段路由的處理 |
|---|---|---|
| `illiquid` | 近 60 天超過一半的日子價格沒動,不提供預測。不是錯誤 | 回 200,前端顯示 `message` |
| `insufficient_data` | 不到 65 個交易日,例如新上市 | 回 422 |
| `invalid_data` | 價格資料有問題 | 回 422 |

**前端顯示規則**:

| 情況 | 畫面 |
|---|---|
| `signal_strength` 是 `strong` 或 `moderate` | `label` + `confidence`,例如「波動可能放大 · 機率 85%」 |
| `signal_strength` 是 `weak` | 只顯示「波動變化不明顯」,不強調機率 |
| `status` 是 `illiquid` | 顯示 `message` |

## 準確率與限制

用 1,976 檔上市櫃股票、2015-04 ~ 2024-05 的資料訓練,2024-05-22 ~ 2026-09-15 的 109.7 萬筆測試(訓練時沒看過):

| | 準確率 |
|---|---|
| 永遠猜同一邊 | 50.28% |
| **本模型(全部日子)** | **71.36%** |
| 本模型,訊號明顯時(`strong`,約 45.5% 的日子) | 83.2% |
| 本模型,訊號中等時(`moderate`,約 40.6% 的日子) | 64.4% |
| 本模型,訊號不明顯時(`weak`,約 13.9% 的日子) | 53.0% |

- 這個準確率大部分來自「最近 3 天剛好特別安靜或特別劇烈,之後會回到平常」。所以要說「接下來可能比**最近 3 天**動得更大」,不能說「這檔股票要開始變劇烈了」。
- 大型股(例如台灣50)的「放大」機率偏保守:顯示 75% 時,實際約 85%。
- ETF 沒有參與訓練,實測準確率 69.9%。美股沒有驗證過。
- 訓練資料只有目前仍掛牌的公司,已下市的不在內。
- 不構成投資建議。

## 重新訓練

訓練程式和約 450 MB 的歷史價格不放在這個 repo,由 AI 端負責。重新訓練只會產生新的 `volatility_params.json`,換掉這個檔案就好,後端不用改程式。建議一年一次。
