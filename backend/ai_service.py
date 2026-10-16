import os
from transformers import pipeline

# ==========================================
# 🧠 載入本地端 AI 模型 (第一次執行會自動下載)
# ==========================================
print("⏳ 正在將 AI 模型載入記憶體，請稍候...")
# 使用本地 pipeline 進行零樣本分類
classifier = pipeline(
    "zero-shot-classification", 
    model="MoritzLaurer/mDeBERTa-v3-base-mnli-xnli"
)
print("✅ 本地模型載入完成！")

# 這裡移除 async，因為本地運算不需要等待網路回應
def classify_industry(news_text: str):
    # ==========================================
    # 🌟 1. 專家規則攔截網 (Rule-based Override)
    # ==========================================
    market_keywords = ["台指期", "加權指數", "台股大盤", "0050", "006208", "央行", "台指"]
    if any(keyword in news_text for keyword in market_keywords):
        return {"category": "大盤總經", "score": 1.0, "details": "專家關鍵字直接命中"}

    # ==========================================
    # 🤖 2. 模糊地帶交給本地 AI 運算
    # ==========================================
    candidate_labels = [
        "大盤指數、期貨與總體經濟",
        "電子科技與半導體",
        "通訊網路與軟體服務",
        "金融與保險業",
        "航運與物流",
        "生技與醫療",
        "營建與房地產",
        "民生消費與零售",
        "再生能源與永續發展",
        "傳統製造與原物料",
        "其他產業或綜合新聞"
    ]
    
    try:
        # 呼叫本地模型進行預測
        results = classifier(news_text, candidate_labels)
        
        # 組合詳細分數
        details_list = []
        for i in range(len(results["labels"])):
            lbl = results["labels"][i]
            scr = results["scores"][i]
            details_list.append(f"{lbl}: {round(scr, 4)}")
        all_scores_str = " | ".join(details_list)
        
        # 取得最高分
        full_category = results["labels"][0]
        score = round(results["scores"][0], 4)
        
        # 30% 門檻防護與對應邏輯
        if score < 0.30:
            category = "未分類"
        else:
            if "大盤" in full_category or "經濟" in full_category or "期貨" in full_category: category = "大盤總經"
            elif "科技" in full_category or "半導體" in full_category: category = "科技半導體"
            elif "通訊" in full_category or "軟體" in full_category: category = "軟體服務"
            elif "金融" in full_category: category = "金融保險"
            elif "航運" in full_category: category = "航運物流"
            elif "生技" in full_category: category = "生技醫療"
            elif "營建" in full_category: category = "營建地產"
            elif "消費" in full_category or "零售" in full_category: category = "民生消費"
            elif "再生能源" in full_category: category = "再生能源"
            elif "其他" in full_category: category = "未分類"
            else: category = "傳統產業"
        
        return {"category": category, "score": score, "details": all_scores_str}
        
    except Exception as e:
        print(f"本地模型運算錯誤: {e}")
        return {"category": "未分類", "score": 0.0, "details": f"發生錯誤: {str(e)}"}