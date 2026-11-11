import os 
import re
from market_aggregate import market_revenue_summary, revenue_by_industry, latest_revenue_month
from typing import Optional
from fastapi import FastAPI, HTTPException, Request, Depends, Query
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer,HTTPAuthorizationCredentials
import yfinance as yf #導入yahoo股市股票資訊

from database import engine , SessionLocal  ##Í導入engine
import models #database struct
import schemas #接口
from sqlalchemy.orm import Session
from passlib.context import CryptContext

import jwt

import sys
from pathlib import Path
from datetime import timedelta, datetime, time, timezone
from cachetools import TTLCache


from fastapi.middleware.cors import CORSMiddleware #CORS 跨域請求

import requests
#from bs4 import BeautifulSoup #yahoo
import xml.etree.ElementTree as ET #解析網頁xml

from stock_financials import build_financials
from stock_institutional import build_institutional, build_performance

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

SECRET_KEY=os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY 未設定")

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

@app.get("/api/news", response_model=schemas.NewsListResponse)
def get_news_from_db(
    category: Optional[str] = None,
    source: Optional[str] = None,
    q: Optional[str] = None,
    stock: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(models.News)
    if category:
        query = query.filter(models.News.category == category)
    if source:
        query = query.filter(models.News.source == source)
    if q:
        query = query.filter(models.News.title.ilike(f"%{q}%"))
    if stock:
        query = query.filter(models.News.related_stocks.ilike(f"%{stock}%"))

    total = query.count()
    rows = (query.order_by(models.News.published_at.desc())
                 .offset(offset).limit(limit).all())

    data = []
    for n in rows:
        text = (n.content or "").replace("\n", " ").strip()
        data.append({
            "id": n.id,
            "title": n.title,
            "summary": text[:120] + ("…" if len(text) > 120 else ""),
            "url": n.url,
            "source": n.source,
            "category": n.category,
            "category_score": n.category_score,
            "sentiment": n.sentiment,
            "sentiment_score": n.sentiment_score,
            "related_stocks": n.related_stocks,
            "published_at": n.published_at,
        })
    return {"status": "success", "total": total, "limit": limit,
            "offset": offset, "data": data}

@app.get("/api/summaries", response_model=schemas.AiSummaryListResponse)
def get_ai_summaries(
    scope: Optional[str] = None,
    summary_type: Optional[str] = None,
    ref: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(models.AiSummary)
    if scope:
        query = query.filter(models.AiSummary.scope == scope)
    if summary_type:
        query = query.filter(models.AiSummary.summary_type == summary_type)
    if ref:
        query = query.filter(models.AiSummary.ref == ref)

    rows = query.order_by(models.AiSummary.created_at.desc()).all()

    # 同一組 scope + summary_type + ref 可能有多筆(重跑或換 prompt 版本),只留最新一筆
    seen = set()
    latest = []
    for r in rows:
        key = (r.scope, r.summary_type, r.ref)
        if key in seen:
            continue
        seen.add(key)
        latest.append(r)
    latest = latest[:limit]

    return {"status": "success", "total": len(latest), "data": latest}

@app.get("/api/market/revenue", response_model=schemas.MarketRevenueResponse)
def get_market_revenue(year_month: Optional[str] = None, db: Session = Depends(get_db)):
    """上市公司月營收合計與各產業拆解。不帶 year_month 就取最新一個月。金額單位:千元。"""
    if not year_month:
        year_month = latest_revenue_month(db)
    if not year_month:
        raise HTTPException(status_code=404, detail="目前沒有月營收資料")

    agg = market_revenue_summary(db, year_month)
    if agg is None:
        raise HTTPException(status_code=404, detail=f"{year_month} 沒有月營收資料")

    return {
        "status": "success",
        "data": {
            **agg,
            "scope": "listed",
            "unit": "千元",
            "industries": revenue_by_industry(db, year_month),
        },
    }



sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "ai_model" / "volatility"))
from volatility_model import predict_volatility

_volatility_cache = TTLCache(maxsize=3000, ttl=3600)  # 同一檔股票 1 小時內不重抓
_TAIPEI = timezone(timedelta(hours=8))


@app.get("/api/stock/{ticker}/volatility")
def get_stock_volatility(ticker: str):
    if ticker in _volatility_cache:
        return _volatility_cache[ticker]

    closes = yf.Ticker(ticker).history(period="6mo", auto_adjust=True)["Close"]
    if closes.empty:
        raise HTTPException(status_code=404, detail="找不到該股票的交易資料，請確認代號是否正確。")

    # 盤中最後一筆是跳動中的價格,不是收盤價,要去掉
    now = datetime.now(_TAIPEI)
    if closes.index[-1].date() == now.date() and now.time() < time(13, 35):
        closes = closes.iloc[:-1]

    result = predict_volatility(closes)
    if result["status"] in ("insufficient_data", "invalid_data"):
        raise HTTPException(status_code=422, detail=result["message"])
    _volatility_cache[ticker] = result
    return result
_PERIODS = {"1mo", "3mo", "6mo", "1y"}
_TICKER_RE = re.compile(r"^[A-Za-z0-9.^=\-]{1,15}$")
_history_cache = TTLCache(maxsize=2000, ttl=600)   # 同一檔、同一區間 10 分鐘內不重抓


def _currency_of(ticker: str) -> str:
    if ticker.startswith("^"):
        return ""
    for suffix, cur in ((".TWO", "TWD"), (".TW", "TWD"), (".KS", "KRW"), (".HK", "HKD"), (".CO", "DKK"), (".T", "JPY")):
        if ticker.endswith(suffix):
            return cur
    return "USD"


def _load_history(ticker: str, period: str) -> list:
    """抓每日股價,回傳 [{date, open, high, low, close, volume}]。台股成交量換算成「張」。"""
    key = (ticker, period)
    if key in _history_cache:
        return _history_cache[key]

    df = yf.Ticker(ticker).history(period=period)
    if df.empty:
        return []
    df = df.dropna(subset=["Close"])
    in_lots = ticker.endswith((".TW", ".TWO"))   # 台股 1 張 = 1000 股

    rows = []
    for r in df.itertuples():
        vol = r.Volume if r.Volume == r.Volume else 0   # NaN 當 0
        rows.append({
            "date": r.Index.strftime("%Y-%m-%d"),
            "open": round(float(r.Open), 2),
            "high": round(float(r.High), 2),
            "low": round(float(r.Low), 2),
            "close": round(float(r.Close), 2),
            "volume": int(vol // 1000) if in_lots else int(vol),
        })
    if rows:
        _history_cache[key] = rows
    return rows


@app.get("/api/stock/{ticker}/history")
def get_stock_history(ticker: str, period: str = "3mo"):
    """歷史股價。period: 1mo / 3mo / 6mo / 1y。"""
    if period not in _PERIODS:
        raise HTTPException(status_code=422, detail="period 只接受 1mo、3mo、6mo、1y")
    if not _TICKER_RE.match(ticker):
        raise HTTPException(status_code=422, detail="股票代號格式不正確")
    try:
        rows = _load_history(ticker, period)
    except Exception:
        raise HTTPException(status_code=502, detail="暫時無法取得股價資料，請稍後再試。")
    if not rows:
        raise HTTPException(status_code=404, detail="找不到該股票的交易資料，請確認代號是否正確。")
    return rows


@app.get("/api/peers/{ticker}")
def get_peers(ticker: str, period: str = "3mo", peers: str = ""):
    """同業比較。peers 用逗號分隔,例如 ?peers=NVDA,AMD,^GSPC。第一條線是主角。"""
    if period not in _PERIODS:
        raise HTTPException(status_code=422, detail="period 只接受 1mo、3mo、6mo、1y")
    if not _TICKER_RE.match(ticker):
        raise HTTPException(status_code=422, detail="股票代號格式不正確")

    tickers = [ticker]
    for p in peers.split(","):
        p = p.strip()
        if p and p not in tickers and _TICKER_RE.match(p):
            tickers.append(p)
    tickers = tickers[:9]   # 主角 + 最多 8 個比較對象

    series = []
    for i, t in enumerate(tickers):
        try:
            rows = _load_history(t, period)
        except Exception:
            rows = []
        if not rows:
            if i == 0:
                raise HTTPException(status_code=404, detail="找不到該股票的交易資料，請確認代號是否正確。")
            continue   # 某個比較對象抓不到就略過,不讓整張圖失敗
        series.append({
            "ticker": t,
            "name": t,
            "currency": _currency_of(t),
            "points": [{"date": r["date"], "close": r["close"]} for r in rows],
        })
    return {"series": series}


_financials_cache = TTLCache(maxsize=2000, ttl=6 * 3600)   # 財報一天變不了幾次,快取 6 小時


@app.get("/api/stock/{code}/financials")
def get_stock_financials(code: str, db: Session = Depends(get_db)):
    """個股財報摘要:估值、近 8 季明細、近 12 個月營收。金額單位億元。"""
    code = code.upper().replace(".TWO", "").replace(".TW", "")
    if not re.fullmatch(r"[0-9A-Z]{4,6}", code):
        raise HTTPException(status_code=422, detail="股票代號格式不正確")
    if code in _financials_cache:
        return _financials_cache[code]
    try:
        result = build_financials(code, db)
    except LookupError:
        raise HTTPException(status_code=404, detail="找不到該股票的財報資料，請確認代號是否正確。")
    except Exception:
        raise HTTPException(status_code=502, detail="暫時無法取得財報資料，請稍後再試。")
    _financials_cache[code] = result
    return result



_institutional_cache = TTLCache(maxsize=2000, ttl=3600)        # 法人資料每天收盤後更新一次
_institutional_perf_cache = TTLCache(maxsize=2000, ttl=24 * 3600)


def _clean_code(code: str) -> str:
    code = code.upper().replace(".TWO", "").replace(".TW", "")
    if not re.fullmatch(r"[0-9A-Z]{4,6}", code):
        raise HTTPException(status_code=422, detail="股票代號格式不正確")
    return code


@app.get("/api/stock/{code}/institutional")
def get_stock_institutional(code: str, days: int = Query(10, ge=1, le=60)):
    """近 N 個交易日三大法人買賣超,單位:張。"""
    code = _clean_code(code)
    key = (code, days)
    if key in _institutional_cache:
        return _institutional_cache[key]
    try:
        result = build_institutional(code, days)
    except LookupError:
        raise HTTPException(status_code=404, detail="找不到該股票的法人買賣資料，請確認代號是否正確。")
    except Exception:
        raise HTTPException(status_code=502, detail="暫時無法取得法人買賣資料，請稍後再試。")
    _institutional_cache[key] = result
    return result


@app.get("/api/stock/{code}/institutional-performance")
def get_stock_institutional_performance(code: str):
    """法人買超日之後的股價表現(近 3 年統計)。"""
    code = _clean_code(code)
    if code in _institutional_perf_cache:
        return _institutional_perf_cache[code]
    try:
        closes = {}
        for suffix in (".TW", ".TWO"):   # 先試上市,沒有再試上櫃
            series = yf.Ticker(code + suffix).history(period="3y")["Close"].dropna()
            if not series.empty:
                closes = {idx.strftime("%Y-%m-%d"): float(v) for idx, v in series.items()}
                break
        if not closes:
            raise LookupError(code)
        result = build_performance(code, closes)
    except LookupError:
        raise HTTPException(status_code=404, detail="找不到該股票的資料，請確認代號是否正確。")
    except Exception:
        raise HTTPException(status_code=502, detail="暫時無法取得資料，請稍後再試。")
    _institutional_perf_cache[code] = result
    return result