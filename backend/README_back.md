***

【API架構】
先用fastapi做簡易的網站能夠運行，之後再用aws api gateway
股價資訊引用「yahoo股市」，開源無版權問題


【API操作】
cd backend
python3 -m venv venv
source venv/bin/activate

pip3 install fastapi uvicorn
pip3 install yfinance

uvicorn main:app --reload

【fastapi 自動生成的API_DEMO】
http://127.0.0.1:8000/docs#

***

【ERD說明】
為什麼password的varchar要設到255 因為，我們之後如果對密碼進行bcrypt雜湊加密，產出的亂碼隨便就會超過50字元。


【DataBase架構】
採用現在業界常用的「ORM驅動開發」、「MVC架構 (model-view-controller) 」
為什麼採用這個，而不採用普通sql語法建置，,可能有資安問題、維護地獄(哪天資料表要改名要動很多東西)、物件導向思維(不需要py跟sql語法來回切換，用py即可)。

sqlalchemy套件 會自動翻譯 String to Varchar

【DataBase操作】
pip install sqlalchemy


可以去商店下載 SQLite Viewer 掛件，這樣stock_system.db 的表就不是亂碼了

***

【API前端接口】
BaseModel 是pydantic裡的套件，用於翻譯後端語言，輸入成json格式讓前端看得懂

【API操作】
因為有套件 EmailStr
pip install "pydantic[email]"
雜湊
pip install "passlib[bcrypt]"
pip install bcrypt==3.2.2 #降版，版本太高，太嚴格72byte就會報錯

***
【API 登入】
用JWT 
及為什麼在schemas中要分登入跟創建的api，主要符合 「最小權限原則」


【API 操作】
pip install PyJWT
