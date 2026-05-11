【架構】
先用fastapi做簡易的網站能夠運行，之後再用aws api gateway
股價資訊引用「yahoo股市」，開源無版權問題




【操作】
cd backend
python3 -m venv venv
source venv/bin/activate

pip3 install fastapi uvicorn
pip3 install yfinance

uvicorn main:app --reload

【fastapi 自動生成的API_DEMO】
http://127.0.0.1:8000/docs#
