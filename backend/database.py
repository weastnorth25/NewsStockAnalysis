'''

'''

#import os
#from dotenv import load_load_env
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

# 載入本機的 .env 檔案
#load_dotenv()
#指定資料庫檔案位置
#DATABASE_URL="sqlite:///./stock_system.db"
SQLALCHEMY_DATABASE_URL="postgresql://postgres.ccmymqfcrauvnzefhfav:yuntech112230xx@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"


#因github公開，隱藏機密
#從環境變數中讀取連線網址，如果讀不到就維持空值或報錯
#SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")


# 建立資料庫引擎 (Engine)，是python跟sql的橋梁
# connect_args={"check_same_thread": False} 是 SQLite 特有的設定，其他資料庫不需要

#換成supabase就不用check了
'''
engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)
'''

# 建立資料庫引擎 (Engine)，是python跟sql的橋梁
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# 建立對話的 Session(ai的) 工廠 ( 以後 API 要存取資料，都要跟這個工廠拿 Session )
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 建立基礎類別，這樣才能啟動，以後所有的資料表都要繼承它
Base = declarative_base()


