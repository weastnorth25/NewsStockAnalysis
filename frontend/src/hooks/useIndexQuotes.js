// 首頁的多個指數報價：同時發出請求，誰先回來就先顯示（後端已有自己的快取，不必再一支一支排隊）
// 回傳 { '^TWII': { loading, data, error, stale }, ... }
// 一開始先拿瀏覽器存的上次報價（stale），後端休眠開機時首頁也不會空白
import { useEffect, useState } from 'react'
import { fetchStockInfo } from '../api/stock'
import { readCache, writeCache } from '../utils/apiCache'

const initial = (t) => {
  const hit = readCache(`quote|${t}`)
  return hit ? { data: hit.data, loading: false, stale: !hit.recent, savedAt: hit.t } : { loading: true }
}

export default function useIndexQuotes(tickers) {
  const key = tickers.join(',')
  const [quotes, setQuotes] = useState(() => Object.fromEntries(tickers.map((t) => [t, initial(t)])))

  useEffect(() => {
    let cancelled = false
    for (const ticker of key.split(',')) {
      fetchStockInfo(ticker)
        .then((data) => {
          if (cancelled) return
          setQuotes((prev) => ({ ...prev, [ticker]: { data, loading: false } }))
          writeCache(`quote|${ticker}`, data)
        })
        .catch(() => {
          // 抓失敗：有舊資料就繼續顯示舊的，並標成上次資料（就算是幾分鐘內剛存的，也要讓使用者知道沒更新成功）
          if (!cancelled) setQuotes((prev) => ({ ...prev, [ticker]: prev[ticker]?.data ? { ...prev[ticker], error: true, stale: true } : { error: true, loading: false } }))
        })
    }
    return () => { cancelled = true }
  }, [key])

  return quotes
}
