'''
ERD 轉 資料庫結構

'''



from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, BigInteger, DECIMAL, ForeignKey, Float, UniqueConstraint
from datetime import datetime

from database import Base #database.py

from sqlalchemy.dialects.postgresql import JSONB

class User(Base):
    __tablename__="user"

    id = Column(Integer,primary_key=True,index=True)
    username = Column(String(50))
    #unique 信箱不能重覆
    email = Column(String(100),unique=True,index=True) 
    password_hash = Column(String(255))
    #utcnow 自動填入當前時間
    created_at = Column(DateTime,default=datetime.utcnow) #註冊時間
'''    
class UserWatchlist(Base):
    __tablename__="user_watchlist"

    id=Column(Integer,primary_key=True,index=True)
    user_id=Column(Integer,ForeignKey('user.id'))
    stock_id=Column(Integer,ForeignKey('stock.id'))
'''

class Stock(Base):
    __tablename__="stock"

    id = Column(Integer,primary_key=True,index=True) 
    symbol = Column(String(50),unique=True,index=True) #股票代號
    company_name = Column(String(100)) #公司名稱
    sector = Column(String(50)) #公司產業類別

class TechnicalData(Base):
    __tablename__="technical_data"

    id=Column(Integer,primary_key=True,index=True)
    stock_id=Column(Integer,ForeignKey('stock.id'))
    record_date=Column(DateTime,default=datetime.utcnow) #記錄時間點
    close_price=Column(DECIMAL(10, 2)) #收盤價
    volume=Column(BigInteger) #成交量
    structure_pattern=Column(String(50)) #記錄型態
    liquidity_status=Column(Boolean) 

class ChipData(Base) :
    __tablename__="chip_data"

    id=Column(Integer,primary_key=True,index=True)
    stock_id=Column(Integer,ForeignKey('stock.id'))
    record_date=Column(DateTime,default=datetime.utcnow) #時間點
    foreign_investor=Column(BigInteger) #外資
    investment_trust=Column(BigInteger) #投信
    dealer=Column(BigInteger) #法人

class FundamentalData(Base):
    __tablename__="fundamental_data"

    id=Column(Integer,primary_key=True,index=True)
    stock_id=Column(Integer,ForeignKey('stock.id'))
    year_month=Column(String(10)) #月報表
    monthly_revenue=Column(BigInteger) #月收入(績效)
    eps=Column(DECIMAL(10, 2)) #eps

class News(Base):
    __tablename__="news"

    id=Column(Integer,primary_key=True,index=True)
    stock_id=Column(Integer,ForeignKey('stock.id'))
    title=Column(String,nullable=False) 
    content=Column(Text,nullable=False) #存完整內文
    url = Column(String, unique=True)   #網址 
    sentiment_score=Column(Float) #ai情緒分
    related_stocks=Column(String) #存放關聯股的代號
    published_at=Column(DateTime,default=datetime.utcnow) #新聞時間

    category = Column(String(20))        # 分類結果，如 科技半導體
    category_score = Column(Float)       # 分類信心分數
    sentiment = Column(String(20))       # 情緒標籤（匯入 xlsx 用，爬蟲暫不填）
    source = Column(String(30))          # ctee / cnyes / yahoo

class AiChatSession(Base):
    __tablename__="ai_chat_session"

    id=Column(Integer,primary_key=True,index=True)
    user_id=Column(Integer,ForeignKey('user.id'))
    stock_id=Column(Integer,ForeignKey('stock.id'))
    created_at=Column(DateTime,default=datetime.utcnow) #聊天起始時間

class AiChatMessage(Base):
    __tablename__="ai_chat_message"

    id=Column(Integer,primary_key=True,index=True)
    session_id=Column(Integer,ForeignKey('ai_chat_session.id')) #聊天室id
    sender_type=Column(String(10)) #對話者(只會出現'ai'或'user')
    message_text=Column(Text) #內容
    created_at=Column(DateTime,default=datetime.utcnow) #建立時間


class Watchlist(Base):
    __tablename__ = "watchlists"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id")) 
    symbol = Column(String, index=True)    # 股票代號

class AiSummary(Base):
    __tablename__ = "ai_summaries"

    id = Column(Integer, primary_key=True, index=True)
    scope = Column(String(20), index=True)       # market / industry / stock
    summary_type = Column(String(30), index=True) # monthly_revenue / macro_event ...
    ref = Column(String(50), index=True)          # 期間或事件代號,如 2026-09
    summary_text = Column(Text, nullable=False)   # 模型寫的摘要
    model_name = Column(String(50))               # 哪個模型產的
    prompt_version = Column(String(10))           # 哪版 prompt 產的
    input_snapshot = Column(JSONB)                # 當時餵給模型的原始數字
    created_at = Column(DateTime, default=datetime.utcnow)

class MonthlyRevenue(Base):
    __tablename__ = "monthly_revenue"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(10), index=True)         # 公司代號,如 2330
    company_name = Column(String(100))
    industry = Column(String(50))                   # 產業別
    market = Column(String(10), default="listed")   # listed 上市 / otc 上櫃(之後補)
    year_month = Column(String(7), index=True)      # 統一成 2026-09
    revenue = Column(BigInteger)                    # 當月營收,單位:千元
    revenue_prev_month = Column(BigInteger)         # 上月營收,千元
    revenue_year_ago = Column(BigInteger)           # 去年當月營收,千元
    remark = Column(Text)                           # 官方備註
    report_date = Column(String(10))                # 官方出表日期,保留原始值
    source = Column(String(30), default="twse_openapi")
    fetched_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("symbol", "year_month", name="uq_monthly_revenue_symbol_month"),
    )

class MacroEvent(Base):
    __tablename__ = "macro_events"

    id = Column(String(60), primary_key=True)        # 例如 us-cpi-2026-10
    series = Column(String(40), index=True)          # 同一種指標用同一個代號,例如 us-cpi
    datetime_utc = Column(DateTime, index=True)      # 公布時間(UTC)
    country = Column(String(4))                      # US / TW / JP
    category = Column(String(10))                    # rate / cpi / job / econ / tw
    importance = Column(String(10))                  # high / medium / low
    name = Column(String(100))
    short = Column(String(30))
    expected = Column(String(40))                    # 預期值,可為空
    previous = Column(String(40))                    # 前值
    actual = Column(String(40))                      # 實際值,還沒公布就是空的
    result = Column(String(40))                      # better / worse / inline,或文字如「降息 1 碼」
    ai_summary = Column(Text)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)