"""展示用:輸入股票代號,即時抓最新價格,算出波動預測。

用法(在 ai_model/volatility 資料夾裡):
    python demo_predict.py 2330.TW
    python demo_predict.py 2330.TW 0050.TW 6488.TWO      # 一次多檔;上市 .TW、上櫃 .TWO
"""
import sys
from pathlib import Path

import yfinance as yf

sys.path.insert(0, str(Path(__file__).resolve().parent))
from volatility_model import predict_volatility  # noqa: E402

try:
    sys.stdout.reconfigure(encoding="utf-8")
except (AttributeError, ValueError):
    pass


def show(ticker: str):
    print(f"\n=== {ticker} ===")
    closes = yf.Ticker(ticker).history(period="6mo", auto_adjust=True)["Close"]
    if closes.empty:
        print("  找不到這檔股票的交易資料,請確認代號")
        return
    result = predict_volatility(closes)
    if result["status"] != "ok":
        print(f"  {result['status']}: {result['message']}")
        return
    print(f"  資料日期: {result['as_of_date']}")
    print(f"  {result['label']}(機率 {result['confidence']:.0%},訊號 {result['signal_strength']})")
    print(f"  最近 {result['horizon_days']} 天波動 {result['recent_vol']:.2%} | "
          f"過去 20 天 {result['avg_vol_20d']:.2%} | 過去 60 天 {result['avg_vol_60d']:.2%}")
    print(f"  {result['reliability_note']}")


if __name__ == "__main__":
    for t in sys.argv[1:] or ["2330.TW"]:
        show(t)
