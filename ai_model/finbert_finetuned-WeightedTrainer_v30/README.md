模型位置：https://drive.google.com/drive/folders/1cEIWzlcCjmTT81wML-BYiNOuTbiiu-pB?usp=sharing


# 金融新聞情緒分析微服務 API

這是一套基於 FinBERT (finert_finetuned-WeightedTrainer_v30) 的金融新聞情緒分析微服務。
本專案使用 FastAPI 構建，接收前端或爬蟲傳入的新聞文本，並透過微調後的情緒模型，結合動態校準邏輯，回傳「正面、負面、中立」的情緒判定與機率分佈。

本文件旨在協助後端開發團隊快速理解架構、部署服務並完成系統對接。

---

## 📂 1. 核心模型資產與檔案結構交接

自然語言處理微服務的核心奠基於預訓練模型與特徵萃取組件。請確認您已收到名為 `finbert_finetuned-WeightedTrainer_v30` 的資料夾，其中必須包含以下核心檔案：

| 檔案名稱 | 檔案類型與格式 | 主要功能描述 |
| :--- | :--- | :--- |
| `model.safetensors` | 模型權重 (Safetensors) | 儲存經過微調訓練後的神經網路參數。使用零拷貝與記憶體對映技術，載入極快且安全性高（無任意程式碼執行風險）。 |
| `config.json` | 結構組態 (JSON) | 定義 Transformer 計算圖架構與標籤映射，確保模型精準實例化。 |
| `tokenizer.json` | 斷詞規則 (JSON) | 包含完整詞彙表與子詞切分邏輯，保障輸入文字轉化為 token ID 的準確度。 |
| `tokenizer_config.json`| 斷詞組態 (JSON) | 記錄特殊 Token、最大長度限制（512 tokens）與前處理參數。 |

---

## 🛠️ 2. 環境建置與依賴安裝(參考用)

請在您的伺服器或虛擬環境中，安裝以下必要的 Python 套件：

```bash
pip install fastapi uvicorn pydantic-settings transformers torch
```

*   `fastapi`, `uvicorn`: 提供高效能的非同步 API 伺服器。
*   `torch`, `transformers`: 深度學習推論引擎與模型載入套件。
*   `pydantic-settings`: 用於安全且動態地讀取環境變數。

---

## ⚙️ 3. 動態參數設定 (.env)(參數不可改)

為了確保模型預測的準確度，並賦予 MLOps 營運彈性，我們設計了「門檻校準機制」。
**請在專案根目錄建立一個 `.env` 檔案，並寫入以下參數（此為測試後得到的最佳參數，交接初期請勿改動）：**

```env
# .env 檔案
NEG_TH=0.44
POS_MARGIN=-0.04
NEU_SCALE=0.95
```

**參數策略意義：**
*   `NEG_TH` ($0.44$): 負面情緒最低置信度。過濾微弱噪音，避免過度敏感引發錯誤避險。
*   `POS_MARGIN` ($-0.04$): 調整正面判定邊界。提高對微妙利多新聞的識別靈敏度。
*   `NEU_SCALE` ($0.95$): 壓抑中立類別的過度自信傾向，修復預訓練模型的偏差。

---

## 🚀 4. FastAPI 後端核心實作 (main.py)(參考用)

以下是完整的 `main.py` 程式碼，您可以直接使用或整合至現有的後端專案中。
程式碼具備資源預熱功能，確保 API 伺服器啟動時即載入模型，實現極低延遲的推論。

```python
import os
import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from pydantic_settings import BaseSettings
from contextlib import asynccontextmanager
from transformers import AutoTokenizer, AutoModelForSequenceClassification

# ==========================================
# 1. 組態管理：自動讀取 .env 檔案中的門檻參數
# ==========================================
class Settings(BaseSettings):
    neg_th: float = 0.44
    pos_margin: float = -0.04
    neu_scale: float = 0.95

    class Config:
        env_file = ".env"

settings = Settings()

# ==========================================
# 2. 定義 API 的輸入與輸出 JSON 格式 (Pydantic)
# ==========================================
class NewsRequest(BaseModel):
    text: str

class PredictionResponse(BaseModel):
    label: int
    label_name: str
    probabilities: dict

# ==========================================
# 3. 資源預熱：在伺服器啟動時將模型載入記憶體
# ==========================================
ml_models = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 【重要】請將下方路徑換成您伺服器上存放模型資料夾的實際路徑
    model_path = "./finbert_finetuned-WeightedTrainer_v30" 
    
    print("[*] 正在載入 Tokenizer 與 Model...")
    try:
        ml_models["tokenizer"] = AutoTokenizer.from_pretrained(model_path)
        ml_models["model"] = AutoModelForSequenceClassification.from_pretrained(model_path)
        ml_models["model"].eval() # 強制切換到推理模式，停用 Dropout，確保結果一致性
        print("[*] 模型載入完成！")
    except Exception as e:
        print(f"[!] 模型載入失敗，請檢查路徑與檔案是否完整：{e}")
        raise e
    
    yield # 伺服器運行期間停留在這裡
    
    # 伺服器關閉時釋放資源
    ml_models.clear()

app = FastAPI(lifespan=lifespan, title="金融新聞情緒分析 API")

# ==========================================
# 4. 預測端點：接收特徵、產生機率、套用校準邏輯
# ==========================================
@app.post("/predict", response_model=PredictionResponse)
def predict_sentiment(request: NewsRequest):
    if "model" not in ml_models:
        raise HTTPException(status_code=503, detail="模型未載入，服務暫不可用")

    tokenizer = ml_models["tokenizer"]
    model = ml_models["model"]
    
    # 步驟一：前處理並設定最大長度截斷為 512 tokens
    inputs = tokenizer(request.text, return_tensors="pt", truncation=True, max_length=512)
    
    # 步驟二：送入模型產生未校準的原始 Logits
    with torch.no_grad(): # 關閉梯度計算，加速推論並節省記憶體
        outputs = model(**inputs)
        # 使用 softmax 將 logit 轉為 0~1 的機率分佈
        probs = torch.softmax(outputs.logits, dim=-1).squeeze().tolist()
    
    # 取出機率 (對應標籤順序：0=中立, 1=正面, 2=負面)
    p_neu, p_pos, p_neg = probs[0], probs[1], probs[2]
    
    # 步驟三：套用來自 .env 的最佳化動態門檻判定邏輯
    # 1. 檢查負面情緒遮罩
    neg_mask = (p_neg >= settings.neg_th) and (p_neg > p_pos)
    # 2. 檢查正面情緒遮罩
    pos_mask = (not neg_mask) and (p_pos > (p_neu * settings.neu_scale + settings.pos_margin)) and (p_pos > p_neg)
    
    # 產生最終決策標籤
    if pos_mask:
        final_label = 1
        label_name = "Positive"
    elif neg_mask:
        final_label = 2
        label_name = "Negative"
    else:
        final_label = 0
        label_name = "Neutral"
        
    # TODO: 步驟四 (開發者實作)
    # 建議在此處透過非同步 ORM 將原始文字、標籤與機率寫入資料庫(如 PostgreSQL/時序資料庫)
    # 範例： await db.news_sentiment.insert(...)
        
    # 步驟五：封裝成 JSON 回傳給前端或呼叫端
    return PredictionResponse(
        label=final_label,
        label_name=label_name,
        probabilities={
            "neutral": round(p_neu, 4),
            "positive": round(p_pos, 4),
            "negative": round(p_neg, 4)
        }
    )
```

---

## 🏃 5. 啟動伺服器與測試

1. 確認模型檔案已放置於 `main.py` 內設定的 `model_path`。
2. 在終端機執行以下指令啟動伺服器：
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```
3. 測試 API 接口：
   伺服器啟動後，您可以透過 FastAPI 內建的 Swagger UI 進行測試。
   開啟瀏覽器前往：`http://localhost:8000/docs`，在 `/predict` 端點輸入測試用新聞文本即可查看完整的 JSON 回傳結果。

---