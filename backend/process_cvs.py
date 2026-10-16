import pandas as pd
import asyncio
from ai_service import classify_industry

def process_news_batch():
    input_file = "backend/ctee_simple.xlsx"      
    output_file = "backend/ctee_analyzed.xlsx" 
    
    # 1. 這裡請設定你 Excel 裡面對應的「標題」與「內文」欄位名稱
    title_column = "title_tw" 
    content_column = "content_tw" 
    
    print(f"🚀 開始讀取 {input_file} ...")
    
    try:
        df = pd.read_excel(input_file)
    except Exception as e:
        print(f"❌ 讀取 Excel 失敗: {e}")
        return
        
    categories, scores, detailed_scores = [], [], []
    
    for index, row in df.iterrows():
        # 2. 同時抓取標題與內文，並處理空值
        raw_title = str(row[title_column]).strip() if pd.notna(row[title_column]) else ""
        raw_content = str(row[content_column]).strip() if pd.notna(row[content_column]) else ""
        
        # 3. 組合文字，明確告訴 AI 哪裡是標題、哪裡是內文
        combined_text = f"標題：{raw_title}\n內文：{raw_content}"
        
        # 4. 關鍵防護：截斷過長的文字避免 API 報錯 (保留標題與內文前 800 字元)
        if len(combined_text) > 800:
            combined_text = combined_text[:800]
        
        # 只要有標題或有內文就進行分析
        if raw_title or raw_content:
            print(f"正在分析 [{index+1}/{len(df)}]: {raw_title[:30]}...")
            
            # 把「組合好的文字」送給 AI 分析
            ai_result =classify_industry(combined_text)
            
            categories.append(ai_result["category"])
            scores.append(ai_result["score"])
            detailed_scores.append(ai_result["details"]) 
            
            print(f"  👉 最終判定: [{ai_result['category']}] (最高分: {ai_result['score']})")
            print(f"  📊 詳細分數: {ai_result['details']}\n")
            
            
        else:
            categories.append("無資料")
            scores.append(0.0)
            detailed_scores.append("")

    df["AI_Category"] = categories
    df["Confidence_Score"] = scores
    df["All_Scores"] = detailed_scores 
    
    df.to_excel(output_file, index=False, engine='openpyxl')
    print(f"🎉 所有新聞分析完畢，已成功存入 {output_file}")

if __name__ == "__main__":
    process_news_batch()