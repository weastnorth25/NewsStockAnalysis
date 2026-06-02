from fastapi import FastAPI, HTTPException ,Request, Depends
from fastapi.responses import JSONResponse
import yfinance as yf #導入yahoo股市股票資訊

from database import engine , SessionLocal  #導入engine
import models #database struct
import schemas #接口
from sqlalchemy.orm import Session
from passlib.context import CryptContext



#把models的數據轉出來
models.Base.metadata.create_all(bind=engine)

def get_db():
    db=SessionLocal()  #開啟對話
    try:
        yield db    #db交給api
    finally:
        db.close()  #關閉db 


class UTF8JsonResponse(JSONResponse):
    media_type = "application/json; charset=utf-8"

#全域變數
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto") #schemes 機制 



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
#函式-查看狀態
def read_root():
    return {"message": "Backend Server is working !"}

# 指定查詢股票路徑
@app.get("/api/stock/{ticker}")
def get_stock_info(ticker: str):
    """
    透過股票代號 (例如：2330.TW, AAPL) 取得股票基本資訊與最新價格。
    """
    try:
        stock = yf.Ticker(ticker)

        # 抓取近兩日歷史，用來計算今日漲跌
        hist = stock.history(period="2d")

        if hist.empty:
            raise HTTPException(status_code=404, detail="找不到該股票的交易資料，請確認代號是否正確。")

        current_price = round(float(hist['Close'].iloc[-1]), 2)

        # 計算漲跌金額與漲跌幅
        if len(hist) >= 2:
            prev_close   = round(float(hist['Close'].iloc[-2]), 2)
            change       = round(current_price - prev_close, 2)
            change_pct   = round((change / prev_close) * 100, 2) if prev_close else 0
        else:
            # 只有一筆資料時，從 info 取 previousClose
            prev_close   = stock.info.get('previousClose') or current_price
            change       = round(current_price - prev_close, 2)
            change_pct   = round((change / prev_close) * 100, 2) if prev_close else 0

        volume = int(hist['Volume'].iloc[-1]) if 'Volume' in hist.columns else 0

        return {
            "symbol":        ticker,
            "company_name":  stock.info.get('shortName', '未知名稱'),
            "current_price": current_price,
            "prev_close":    prev_close,
            "change":        change,
            "change_pct":    change_pct,   # 正數=漲, 負數=跌
            "volume":        volume,
            "currency":      stock.info.get('currency', 'TWD'),
            "sector":        stock.info.get('sector', '未知產業'),
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    

#註冊json傳給前端
@app.post("/api/register",response_model=schemas.UserResponse)

#如果資料檢查沒問題，那資料那會變成user物件，這樣就可以使用user.email 之類的 #depends(get_db)，跟資料庫借一條線來連線
def register_user(user:schemas.UserCreate,db: Session = Depends(get_db)):
    db_user=db.query(models.User).filter(models.User.email == user.email).first() #query 指定層、filter 搜尋條件、first 只找第一個，找到就停或是none
    
    #如果找到了表示此信箱己經註冊過
    if db_user:
        raise HTTPException(status_code=400, detail="這個 Email 已經被註冊過囉！") #raise 是強制報錯(避免系統被動報錯卡住)
    
    #建立要儲存的資料物件形式
    #用雜湊來加密前端送來的密碼
    hashed_password = pwd_context.hash(user.password)
    #項目有 「姓名、email、密碼」、此password_hash存進去，後端還要做bcrypt加密，左邊為models.User 右邊為user.xxx(schemas.UserCreate)前端傳來的json
    new_user=models.User(
        username=user.username,
        email=user.email,
        password_hash=hashed_password

    )

    db.add(new_user)
    db.commit() #寫入資料庫
    db.refresh(new_user) # 重新從硬碟讀取一次，確保拿到自動生成的 ID 與 時間

    #回傳給前端 (FastAPI 會自動把它轉換成 schemas.UserResponse 的 JSON 格式)
    return new_user
    

