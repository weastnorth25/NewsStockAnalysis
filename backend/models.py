'''
ERD 轉 資料庫結構

'''



from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, BigInteger, DECIMAL, ForeignKey, Float
from datetime import datetime

from database import Base #database.py

class User(Base):
    __tablename__="user"

    id = Column(Integer,primary_key=True,index=True)
    username = Column(String(50))
    #unique 信箱不能重覆
    email = Column(String(100),unique=True,index=True) 
    password_hash = Column(String(255))
    #utcnow 自動填入當前時間
    created_at = Column(DateTime,default=datetime.utcnow) #註冊時間

class UserWatchlist(Base):
    __tablename__="user_watchlist"

    id=Column(Integer,primary_key=True,index=True)
    user_id=Column(Integer,ForeignKey('user.id'))
    stock_id=Column(Integer,ForeignKey('stock.id'))


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
    title=Column(String(255))
    content=Column(Text)
    sentiment_score=Column(Float) #ai情緒分
    published_at=Column(DateTime,default=datetime.utcnow) #新聞時間

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
