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

def classify_news_type(news_text: str):
    """
    分析新聞屬於哪種財經事件（財報、法說會、股利等）
    """
    # ==========================================
    # 🌟 1. 事件關鍵字攔截網 (處理速度最快，準確率最高)
    # ==========================================
    if any(k in news_text for k in ["法說會", "股東會", "法說"]):
        return "法說與股東會"
    if any(k in news_text for k in ["財報", "營收", "季報", "年報", "獲利", "EPS", "每股純益"]):
        return "財報與營收"
    if any(k in news_text for k in ["除權息", "配息", "股利", "殖利率", "填息"]):
        return "股利與除權息"
    if any(k in news_text for k in ["買超", "賣超", "漲停", "跌停", "三大法人", "外資"]):
        return "籌碼與股價動態"

    # ==========================================
    # 🤖 2. 沒有明確關鍵字的，交給 AI 判斷
    # ==========================================
    candidate_labels = [
        "財務報表與營收數據",
        "法說會與股東會議",
        "股利發放與除權息",
        "產品發表與業務合作", # 涵蓋新產品、併購、大訂單
        "人事異動與公司治理", # 涵蓋董事長換人、高層變動
        "股市籌碼與股價波動",
        "總體經濟與產業政策",
        "一般綜合報導"
    ]
    
    try:
        results = classifier(news_text, candidate_labels)
        full_category = results["labels"][0]
        score = round(results["scores"][0], 4)
        
        # 門檻設為 25%，低於此分數代表不是特定重大事件
        if score < 0.25:
            return "一般新聞"
            
        if "財務" in full_category or "營收" in full_category: return "財報與營收"
        elif "法說" in full_category or "股東" in full_category: return "法說與股東會"
        elif "股利" in full_category or "除權息" in full_category: return "股利與除權息"
        elif "合作" in full_category or "產品" in full_category: return "業務與產品"
        elif "人事" in full_category or "治理" in full_category: return "人事異動"
        elif "籌碼" in full_category or "股價" in full_category: return "籌碼與股價動態"
        elif "經濟" in full_category or "政策" in full_category: return "總經與政策"
        else: return "一般新聞"
        
    except Exception as e:
        return "一般新聞"