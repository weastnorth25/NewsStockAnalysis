// 自選股清單與抽屜開關：股票頁和四個分析工具頁共用
// 抽屜開關記在模組變數，切換頁面時維持原本的開／關
import { useEffect, useState } from 'react'
import { fetchWatchlist, addToWatchlist, removeFromWatchlist, toFullTicker, toDisplaySymbol } from '../api/stock'

let lastOpen = false

export default function useWatchlist() {
  const isGuest = localStorage.getItem('token') === 'guest'
  // items：[{ symbol, name }]，symbol 是 strip 掉 .TW 的顯示格式
  const [items, setItems] = useState([])
  const [status, setStatus] = useState(isGuest ? 'guest' : 'loading')
  const [open, setOpen] = useState(lastOpen)
  const [busy, setBusy] = useState(false)

  // 載入一次自選股清單（後端存的是 .TW 格式，前端統一 strip 後存）
  useEffect(() => {
    if (isGuest) return
    fetchWatchlist()
      .then((rows) => {
        setItems(rows.map((i) => ({ symbol: toDisplaySymbol(i.symbol), name: i.company_name })))
        setStatus('ok')
      })
      .catch(() => setStatus('error'))
  }, [isGuest])

  const toggleOpen = () => setOpen((o) => { lastOpen = !o; return !o })

  const has = (symbol) => items.some((s) => s.symbol === symbol)

  const toggle = async (symbol, name) => {
    setBusy(true)
    try {
      if (has(symbol)) {
        await removeFromWatchlist(toFullTicker(symbol))
        setItems((prev) => prev.filter((s) => s.symbol !== symbol))
      } else {
        await addToWatchlist(toFullTicker(symbol))
        setItems((prev) => [...prev, { symbol, name }])
      }
    } catch (err) {
      alert('操作失敗：' + (err.response?.data?.detail || err.message))
    } finally {
      setBusy(false)
    }
  }

  return { isGuest, items, status, open, toggleOpen, busy, has, toggle }
}
