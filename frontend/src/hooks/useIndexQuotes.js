// 依序載入多個指數／報價（避免後端 yfinance 內建 SQLite 快取被並行請求鎖住）
// 回傳 { '^TWII': { loading, data, error, stale }, ... }，每抓完一支就更新一次，畫面可以逐步顯示
// 一開始先拿瀏覽器存的上次報價（stale），後端休眠開機時首頁也不會空白
import { useEffect, useState } from 'react'
import { fetchStockInfo } from '../api/stock'
import { readCache, writeCache } from '../utils/apiCache'

const initial = (t) => {
  const hit = readCache(`quote|${t}`)
  return hit ? { data: hit.data, loading: false, stale: true, savedAt: hit.t } : { loading: true }
}

export default function useIndexQuotes(tickers) {
  const key = tickers.join(',')
  const [quotes, setQuotes] = useState(() => Object.fromEntries(tickers.map((t) => [t, initial(t)])))

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      for (const ticker of key.split(',')) {
        if (cancelled) return
        try {
          const data = await fetchStockInfo(ticker)
          if (cancelled) return
          setQuotes((prev) => ({ ...prev, [ticker]: { data, loading: false } }))
          writeCache(`quote|${ticker}`, data)
        } catch {
          // 抓失敗：有舊資料就繼續顯示舊的
          if (!cancelled) setQuotes((prev) => ({ ...prev, [ticker]: prev[ticker]?.data ? { ...prev[ticker], error: true } : { error: true, loading: false } }))
        }
      }
    })()
    return () => { cancelled = true }
  }, [key])

  return quotes
}
