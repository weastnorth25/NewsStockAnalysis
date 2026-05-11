from fastapi import FastAPI, HTTPException ,Request
from fastapi.responses import JSONResponse
import yfinance as yf #導入yahoo股市股票資訊


class UTF8JsonResponse(JSONResponse):
    media_type = "application/json; charset=utf-8"

app = FastAPI(title="新聞股票分析系統 API", description="雲科資管畢業專題後端",default_response_class=UTF8JsonResponse)

#攔下報錯的訊息，轉成utf-8
@app.exception_handler(HTTPException)
#簡單問題 用非同步，把函式並入主執行緒，提高效率
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    return UTF8JsonResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

#預設首頁資訊
@app.get("/")
def read_root():
    return {"message": "Backend Server is working !"}

# 指定查詢股票路徑
@app.get("/api/stock/{ticker}")
def get_stock_info(ticker: str):
    """
    透過股票代號 (例如：2330.TW, AAPL) 取得股票基本資訊與最新價格。
    """
    try:
        # 使用 yfinance 抓取股票資料
        stock = yf.Ticker(ticker)
        
        # 取得昨天或最近一個交易日的收盤價
        # history(period="1d") 會回傳一個 DataFrame，我們要抓取 Close 欄位的值
        hist = stock.history(period="1d")
        
        if hist.empty:
            raise HTTPException(status_code=404, detail="找不到該股票的交易資料，請確認代號是否正確。")
            
        current_price = round(hist['Close'].iloc[0], 2)
        
        # 整理要回傳給前端的 JSON 格式
        return {
            "symbol": ticker,
            "company_name": stock.info.get('shortName', '未知名稱'),
            "current_price": current_price,
            "currency": stock.info.get('currency', 'TWD'),
            "sector": stock.info.get('sector', '未知產業')
        }
    except Exception as e:
        # 如果發生錯誤（例如代號亂打），回傳 400 錯誤代碼
        raise HTTPException(status_code=400, detail=str(e))