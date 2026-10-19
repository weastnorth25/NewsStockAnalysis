import pandas as pd
from ai_service import classify_industry, classify_news_type 

def process_news_batch():
    input_file = "backend/ctee_simple.xlsx"      
    output_file = "backend/ctee_analyzed.xlsx" 
    
    title_column = "title_tw" 
    content_column = "content_tw" 
    
    print(f"🚀 開始讀取 {input_file} ...")
    
    try:
        df = pd.read_excel(input_file)
    except Exception as e:
        print(f"❌ 讀取 Excel 失敗: {e}")
        return
        
    categories, scores, detailed_scores = [], [], []
    event_types = [] # 🌟 新增：用來收集「新聞事件類型」的空清單
    
    for index, row in df.iterrows():
        raw_title = str(row[title_column]).strip() if pd.notna(row[title_column]) else ""
        raw_content = str(row[content_column]).strip() if pd.notna(row[content_column]) else ""
        
        combined_text = f"標題：{raw_title}\n內文：{raw_content}"
        
        if len(combined_text) > 800:
            combined_text = combined_text[:800]
        
        if raw_title or raw_content:
            print(f"正在分析 [{index+1}/{len(df)}]: {raw_title[:30]}...")
            
            # 1. 取得產業分類
            ai_result = classify_industry(combined_text)
            categories.append(ai_result["category"])
            scores.append(ai_result["score"])
            detailed_scores.append(ai_result["details"]) 
            
            # 🌟 2. 新增：取得事件分類
            event_result = classify_news_type(combined_text)
            event_types.append(event_result)
            
            print(f"  👉 產業: [{ai_result['category']}] | 事件: [{event_result}]")
            
        else:
            categories.append("無資料")
            scores.append(0.0)
            detailed_scores.append("")
            event_types.append("無資料") # 🌟 新增：空資料處理

    df["AI_Category"] = categories
    df["Confidence_Score"] = scores
    df["All_Scores"] = detailed_scores 
    df["News_Event"] = event_types # 🌟 新增：將事件類型寫入新的 Excel 欄位
    
    df.to_excel(output_file, index=False, engine='openpyxl')
    print(f"🎉 所有新聞分析完畢，已成功存入 {output_file}")

if __name__ == "__main__":
    process_news_batch()