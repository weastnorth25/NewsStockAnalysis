import os
import asyncio
from dotenv import load_dotenv
from huggingface_hub import AsyncInferenceClient

# 精準定位：告訴系統往上一層去找 .env 檔案
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(dotenv_path)

HF_TOKEN = os.getenv("HF_TOKEN")

# 透過官方套件初始化 AI 客戶端 (它會自動幫我們找到目前最新、正確的底層連線網址)
client = AsyncInferenceClient(token=HF_TOKEN)
MODEL_ID = "MoritzLaurer/mDeBERTa-v3-base-mnli-xnli"

async def classify_industry(news_title: str):
    """
    傳入新聞標題，AI 會自動幫你算出它屬於哪個產業
    """
    try:
        # 1. 優化標籤：加上關聯字詞，給 AI 更明確的指引
        candidate_labels = ["電子科技與半導體", "金融與銀行", "機械與製造", "生技與醫療", "傳統產業"]
        
        results = await client.zero_shot_classification(
            text=news_title,
            candidate_labels=candidate_labels,
            model=MODEL_ID
        )
        
        # 2. 測試階段：印出 AI 計算的所有機率，觀察它有沒有在瞎猜
        print(f"📊 AI 原始機率分析: {results}")
        
        best_match = results[0]
        full_category = getattr(best_match, "label", best_match.get("label", "未分類")) if isinstance(best_match, dict) else best_match.label
        
        # 3. 將詳細標籤對應回你資料庫需要的簡稱
        if "科技" in full_category: return "科技"
        if "金融" in full_category: return "銀行"
        if "機械" in full_category: return "機械"
        if "生技" in full_category: return "生技"
        return "傳產"
        
    except Exception as e:
        print(f"Hugging Face 呼叫錯誤: {e}")
        return "未分類"

# ==========================================
# 本機直接測試區塊
# ==========================================
if __name__ == "__main__":
    async def test_ai():
        print("🚀 正在呼叫 Hugging Face 官方 AI 模組進行測試...")
        title = "台積電今日法說會釋出利多，半導體供應鏈大漲"
        print(f"📰 測試新聞標題：{title}")
        
        category = await classify_industry(title)
        print(f"🎯 AI 判定產業類別：{category}")
        
    asyncio.run(test_ai())