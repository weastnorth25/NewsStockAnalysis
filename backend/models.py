from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from database import Base #database.py

class User(Base):
    __tablename__="user"

    id = Column(Integer,primary_key=True,index=True)
    username = Column(String(50))
    #unique → 信箱不能重覆
    email = Column(String(100),unique=True,index=True) 
    password_hash = Column(String(255))
    #utcnow，自動填入當前時間
    created_at = Column(DateTime,default=datetime.utcnow) #註冊時間


class Stock(Base):
    __tablename__="stock"

    id = Column(Integer,primary_key=True,index=True) 
    sysbol = Column(String(50),unique=True,index=True) #股票代號
    company_name = Column(String(100)) #公司名稱
    sector = Column(String(50)) #公司產業類別



    

