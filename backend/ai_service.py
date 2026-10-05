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
        # 使用官方提供的零樣本分類方法
        results = await client.zero_shot_classification(
            text=news_title,
            candidate_labels=["科技", "銀行", "機械", "生技", "傳產"],
            model=MODEL_ID
        )
        
        # results 會回傳一個列表，依機率由高到低排序，我們取第一個最高分的標籤
        best_match = results[0]
        # 兼容物件與字典兩種讀取格式防呆
        return getattr(best_match, "label", best_match.get("label", "未分類")) if isinstance(best_match, dict) else best_match.label
        
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