// 依序載入多個指數／報價（避免後端 yfinance 內建 SQLite 快取被並行請求鎖住）
// 回傳 { '^TWII': { loading, data, error }, ... }，每抓完一支就更新一次，畫面可以逐步顯示
import { useEffect, useState } from 'react'
import { fetchStockInfo } from '../api/stock'

export default function useIndexQuotes(tickers) {
  const key = tickers.join(',')
  const [quotes, setQuotes] = useState(() => Object.fromEntries(tickers.map((t) => [t, { loading: true }])))

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      for (const ticker of key.split(',')) {
        if (cancelled) return
        try {
          const data = await fetchStockInfo(ticker)
          if (!cancelled) setQuotes((prev) => ({ ...prev, [ticker]: { data, loading: false } }))
        } catch {
          if (!cancelled) setQuotes((prev) => ({ ...prev, [ticker]: { error: true, loading: false } }))
        }
      }
    })()
    return () => { cancelled = true }
  }, [key])

  return quotes
}
