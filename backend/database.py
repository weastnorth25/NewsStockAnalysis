from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

#指定資料庫檔案位置
DATABASE_URL="sqlite:///./stock_system.db"

# 建立資料庫引擎 (Engine)，是python跟sql的橋梁
# connect_args={"check_same_thread": False} 是 SQLite 特有的設定，其他資料庫不需要
engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)

# 建立對話的 Session(ai的) 工廠 ( 以後 API 要存取資料，都要跟這個工廠拿 Session )
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 建立基礎類別，這樣才能啟動，以後所有的資料表都要繼承它
Base = declarative_base()


