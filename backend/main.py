from fastapi import FastAPI, HTTPException ,Request, Depends
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer,HTTPAuthorizationCredentials #網頁及API的檢查及限制
import yfinance as yf #導入yahoo股市股票資訊

from database import engine , SessionLocal  #導入engine
import models #database struct
import schemas #接口
from sqlalchemy.orm import Session
from passlib.context import CryptContext

import jwt
from datetime import timedelta,datetime

from fastapi.middleware.cors import CORSMiddleware #CORS 跨域請求

import requests
#from bs4 import BeautifulSoup #yahoo
import xml.etree.ElementTree as ET #解析網頁xml



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

#=====全域變數=====
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto") #schemes 機制 
SECRET_KEY="weast_graduation_project_super_secret_key" #因測試先寫死，之後藏到環境變數裡
ALGORITHM = "HS256" #加密演算法
ACCESS_TOKEN_EXPIRE_MINUTES = 60 #通行證有效期限 (60分鐘)
security=HTTPBearer() #HTTP Bearer Token 檢查員

app = FastAPI(title="新聞股票分析系統 API", description="雲科資管畢業專題後端",default_response_class=UTF8JsonResponse)

#CORS 白名單
origins = [
    "https://stock-analysis-api-f1aw.onrender.com",  #  render 後端
    "https://news-stock-analysis-frontend.vercel.app",  #  Vercel 前端
]


# 加入 CORS 中介軟體，允許前端跨域請求
app.add_middleware(
    CORSMiddleware,
    # 允許所有的來源 (開發期為了方便先設為 "*"，上線後可以改成前端的真實網址)
    allow_origins=origins, 
    allow_credentials=True,
    # 允許所有的 HTTP 方法 (GET, POST, PUT, DELETE)
    allow_methods=["*"], 
    # 允許所有的 Header (包含我們需要的 Authorization)
    allow_headers=["*"], 
)


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
    
#登入接收口
@app.post("/api/login",response_model=schemas.Token)
def login(user_credentials:schemas.UserLogin,db:Session=Depends(get_db)):
    #尋找是否有此人(信箱)
    user=db.query(models.User).filter(models.User.email == user_credentials.email).first()
    
    if not user:
        raise HTTPException(status_code=403,detail="信箱或密碼錯誤")
    #確認明文密碼是否與雜湊過的一致
    if not pwd_context.verify(user_credentials.password,user.password_hash):
        raise HTTPException(status_code=403,detail="信箱或密碼錯誤")
    
    #計算token過期時間
    expire=datetime.utcnow()+timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    #識別證裡的公開資料 sub,exp為保留字
    to_encode={"sub":user.email,"exp":expire}

    #發通行證(資料+密鑰，進行加密簽章，用algorithm)
    encoded_jwt=jwt.encode(to_encode,SECRET_KEY,algorithm=ALGORITHM)

    return {"access_token":encoded_jwt,"token_type":"bearer"}

#API_Token檢查
def get_current_user(credentials:HTTPAuthorizationCredentials=Depends(security),db:Session=Depends(get_db)):
    token=credentials.credentials #左邊的是上面httpauth... 容器的名字，右邊的是jwt亂碼的屬性
    try:
        payload=jwt.decode(token,SECRET_KEY,algorithms=[ALGORITHM])
        eamil:str =payload.get("sub")
        if eamil is None:
            raise HTTPException(status_code=401,detail="無效通行證，請重新登入")
    #如通行證jwt超時(60min)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401,detail="通行證已過期，請重新登入")
    #如遇假的jwt通行證
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401,detail="無效通行證，請重新登入")
    
    #確認這個帳號(使用者)是否還在
    user=db.query(models.User).filter(models.User.email== eamil).first()
    if user is None:
        raise HTTPException(status_code=401,detail="未知使用者")
    
    return user
    
#確保使用者只能讀到自己的資料
@app.get("/api/users/me",response_model=schemas.UserResponse)
def read_users_me(current_user:models.User=Depends(get_current_user)):
    
    
    return current_user


# 新增股票到個人的收藏清單 (POST)
@app.post("/api/watchlist", response_model=schemas.WatchlistResponse)
def add_to_watchlist(item: schemas.WatchlistCreate,db: Session = Depends(get_db),current_user: models.User = Depends(get_current_user)): #驗證身份 JWT
    # 檢查該使用者是否已經收藏過這檔股票
    existing_item = db.query(models.Watchlist).filter(
        models.Watchlist.user_id == current_user.id, 
        models.Watchlist.symbol == item.symbol #確認是否已加入過
    ).first()

    if existing_item:
        raise HTTPException(status_code=400, detail="這檔股票已經在你的收藏清單囉！")

    # 建立新紀錄並寫入資料庫
    new_item = models.Watchlist(
        user_id=current_user.id,
        symbol=item.symbol
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    
    return new_item


#受保護的 API：取得個人股票收藏清單與即時報價 (GET)
@app.get("/api/watchlist", response_model=list[schemas.WatchlistItemWithPrice])
def get_user_watchlist(db: Session = Depends(get_db),current_user: models.User = Depends(get_current_user)): #驗證身份 JWT
    #撈出該名使用者的所有收藏紀錄
    watchlist_items = db.query(models.Watchlist).filter(
        models.Watchlist.user_id == current_user.id
    ).all()

    result_list = []

    #抓取每一檔股票，透過 yfinance 抓取即時價格與名稱
    for item in watchlist_items:
        try:
            stock = yf.Ticker(item.symbol)
            hist = stock.history(period="1d")
            
            #確保資料表不是空的，且裡面真的有 Close 欄位
            if not hist.empty and 'Close' in hist.columns and len(hist['Close']) > 0:
                #拿最後一筆資料 (iloc[-1] 比 iloc[0] 更安全，確保是最新價)
                current_price = round(float(hist['Close'].iloc[-1]), 2) 
            else:
                current_price = 0.0 #處置股或無交易時，預設為 0
                
            #有些處置股連 info 都會抓不到，所以也要加上防禦
            company_name = stock.info.get('shortName', '暫無名稱') if stock.info else '暫無名稱'

            #正常組合資料
            result_list.append({
                "id": item.id,
                "symbol": item.symbol,
                "company_name": company_name,
                "current_price": current_price
            })
            
        except Exception as e:
            # 出現錯誤還是要把資料塞給前端，只是標示為無資料
            print(f"抓取 {item.symbol} 失敗: {e}")
            result_list.append({
                "id": item.id,
                "symbol": item.symbol,
                "company_name": "無報價資料 (處置/暫停交易)",
                "current_price": 0.0
            })

    return result_list

#刪除自選股
@app.delete("/api/watchlist/{symbol}")
def remove_from_watchlist(symbol:str,db:Session=Depends(get_db),current_user:models.User=Depends(get_current_user)): #身份驗份 JWT
    item_to_delete= db.query(models.Watchlist).filter(
        models.Watchlist.user_id==current_user.id,
        models.Watchlist.symbol== symbol
    ).first()
    
    if not item_to_delete:
        raise HTTPException(status_code=404,detail="你的自選股中沒有這檔股票哦!")
    db.delete(item_to_delete)
    db.commit()

    return {"message":f"成功將{symbol}從自選清單中移除!"}

'''======後期ai端完成新聞分析才做直接取用
@app.get("/api/news")
def get_news_from_db(db: Session = Depends(get_db)):
    # 直接去 Supabase 撈最新的 20 筆新聞 (包含內文跟分析結果)
    news_records = db.query(models.News).order_by(models.News.published_at.desc()).limit(20).all()
    return {"status": "success", "data": news_records}
'''


#網路爬蟲 先自取
@app.get("/api/news")
def get_stock_news():
    #爬蟲目標 改用google rss 新聞
    url="https://news.google.com/rss/search?q=台股+when:1d&hl=zh-TW&gl=TW&ceid=TW:zh-Hant"
    
    #下為抓取非rss網站所需要之偽裝
    '''
    #機器人偽裝成真人，不然可能會被擋掉
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    '''

    try:
        response=requests.get(url) #發送請求抓html原始碼下來
        response.raise_for_status() #如果沒抓到就跳error

        root = ET.fromstring(response.text)
        #soup=BeautifulSoup(response.text,'html.parser') #用BeautifulSoup 網頁解剖刀 分割
        news_list=[]
        
        #links=soup.find_all("a",href=True) #找出所有帶有 href 的超連結
        #items =item.find_all("item") #在rss中新聞會包在<item>裡



        for item in root.findall(".//item"):
            title=item.find("title").text
            link=item.find("link").text
            '''
            if len(title) >20 and "/news/" in url_path:

                #如果是相對路徑，就幫它補上主網域
                if not url_path.startswith("http"):
                    url_path="https://tw.stock.yahoo.com" + url_path
            '''
            news_list.append({
                "title":title,
                "link":link
            })
        
            #先抓10則新聞
            if len(news_list)>=20:  
                break

        return {"status": "success", "data": news_list}
                

    except:
        return {"status": "error", "message": f"爬取新聞失敗：{str(e)}"}
    