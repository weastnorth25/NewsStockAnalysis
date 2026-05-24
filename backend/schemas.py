'''
負責跟前端（JSON）溝通接口

'''

from pydantic import BaseModel, EmailStr #輸入資料檢查
from datetime import datetime
#from typing import Optional #貼標籤

#從前端接收的資料(新建)
class UserCreate(BaseModel):
    username: str
    email: EmailStr #pydantic 會檢查是否為信箱格式
    #age:Optional[int]=None #年紀可填可不填
    password: str

#準備送入後端的資料(新建)
class UserResponse(BaseModel):
    id:int 
    username:str
    email:str
    created_at:datetime

    class Config:
        from_attributes=True # 讓 Pydantic 放寬標準，懂得讀取 SQLAlchemy 的 'xxx.id' (物件)，而不是死板地只接受 'xxx["id"]' (字典)

#接收前端的資料(登入)
class UserLogin(BaseModel):
    email:EmailStr
    password:str
#給前端通行證的資料(登入)
class Token(BaseModel):
    access_token: str  
    token_type: str
