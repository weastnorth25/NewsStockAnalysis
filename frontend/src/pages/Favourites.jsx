// 自選股頁面：從後端 /api/watchlist 拉清單與即時價，可移除單筆。漲跌/成交量另行順序載入
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchWatchlist, removeFromWatchlist, fetchStockInfo, toDisplaySymbol } from '../api/stock'

function StockRow({ item, detail, onClick, onRemove, removing }) {
  // detail 是後續順序抓回來的完整資料（含 change_pct、volume）
  const displaySymbol = toDisplaySymbol(item.symbol)
  const price = detail?.current_price ?? item.current_price
  const isUp  = (detail?.change_pct ?? 0) >= 0

  return (
    <tr
      onClick={onClick}
      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
    >
      <td className="py-3.5 pl-4 pr-2 w-1">
        <div className={`w-1 h-8 rounded-full ${isUp ? 'bg-red-400' : 'bg-emerald-400'}`} />
      </td>

      <td className="py-3.5 pr-4">
        <p className="text-sm font-semibold text-gray-900">{item.company_name || displaySymbol}</p>
        <p className="text-xs text-gray-400">{displaySymbol}</p>
      </td>

      <td className="py-3.5 px-4 text-right">
        {price != null ? (
          <span className={`text-sm font-semibold ${isUp ? 'text-red-500' : 'text-emerald-600'}`}>
            {price.toLocaleString()}
          </span>
        ) : (
          <span className="text-gray-300 text-sm">--</span>
        )}
      </td>

      <td className="py-3.5 px-4 text-right">
        {detail ? (
          <div>
            <p className={`text-sm font-medium ${isUp ? 'text-red-500' : 'text-emerald-600'}`}>
              {isUp ? '▲' : '▼'} {Math.abs(detail.change ?? 0).toFixed(2)}
            </p>
            <p className={`text-xs ${isUp ? 'text-red-400' : 'text-emerald-500'}`}>
              ({Math.abs(detail.change_pct ?? 0).toFixed(2)}%)
            </p>
          </div>
        ) : (
          <span className="text-gray-300 text-sm">--</span>
        )}
      </td>

      <td className="py-3.5 px-4 text-right">
        {detail?.volume ? (
          <span className="text-sm text-gray-600">
            {detail.volume >= 10000
              ? `${(detail.volume / 10000).toFixed(2)} 萬`
              : detail.volume.toLocaleString()}
          </span>
        ) : (
          <span className="text-gray-300 text-sm">--</span>
        )}
      </td>

      <td className="py-3.5 pl-2 pr-4 text-right w-12">
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(item.symbol) }}
          disabled={removing}
          className="text-gray-300 hover:text-red-500 transition-colors p-1 rounded disabled:opacity-50"
          aria-label="移除自選"
          title="移除自選"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </td>
    </tr>
  )
}

export default function Favourites() {
  const navigate = useNavigate()
  const [watchlist, setWatchlist] = useState([])
  const [details,   setDetails]   = useState({})       // { symbol: stockInfo }
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [removing,  setRemoving]  = useState(null)     // symbol being removed

  const isGuest = localStorage.getItem('token') === 'guest'

  // 載入自選股清單，再順序抓每支股票完整資料
  useEffect(() => {
    if (isGuest) { setLoading(false); return }

    let cancelled = false
    ;(async () => {
      try {
        const items = await fetchWatchlist()
        if (cancelled) return
        setWatchlist(items)
        setLoading(false)

        // 順序載入完整資料，避免 yfinance 並行鎖（item.symbol 已是完整 ticker）
        for (const item of items) {
          if (cancelled) return
          try {
            const data = await fetchStockInfo(item.symbol)
            if (!cancelled) setDetails(prev => ({ ...prev, [item.symbol]: data }))
          } catch { /* 單筆失敗就跳過 */ }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.detail || '無法載入自選股')
          setLoading(false)
        }
      }
    })()
    return () => { cancelled = true }
  }, [])

  const handleRemove = async (symbol) => {
    setRemoving(symbol)
    try {
      await removeFromWatchlist(symbol)
      setWatchlist(prev => prev.filter(i => i.symbol !== symbol))
      setDetails(prev => {
        const next = { ...prev }
        delete next[symbol]
        return next
      })
    } catch (err) {
      alert('移除失敗：' + (err.response?.data?.detail || err.message))
    } finally {
      setRemoving(null)
    }
  }

  // ─── 遊客模式 ────────────────────────────────────────────────
  if (isGuest) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">自選</h1>
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <p className="text-gray-500 mb-4">遊客模式無法使用自選股功能</p>
          <button
            onClick={() => { localStorage.removeItem('token'); navigate('/login') }}
            className="text-sm text-blue-500 hover:text-blue-600 font-medium"
          >
            前往登入 →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">自選</h1>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading && (
          <div className="p-10 text-center text-sm text-gray-400">載入中...</div>
        )}

        {error && !loading && (
          <div className="p-10 text-center text-sm text-red-500">{error}</div>
        )}

        {!loading && !error && watchlist.length === 0 && (
          <div className="p-10 text-center text-sm text-gray-400">
            尚未加入任何自選股，到「股票」頁面按「加入自選」開始追蹤吧
          </div>
        )}

        {!loading && !error && watchlist.length > 0 && (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="py-2.5 pl-4 pr-2 w-1" />
                <th className="py-2.5 pr-4 text-left text-xs font-medium text-gray-500">股票名稱</th>
                <th className="py-2.5 px-4 text-right text-xs font-medium text-gray-500">成交</th>
                <th className="py-2.5 px-4 text-right text-xs font-medium text-gray-500">漲跌</th>
                <th className="py-2.5 px-4 text-right text-xs font-medium text-gray-500">成交量</th>
                <th className="py-2.5 pl-2 pr-4 w-12" />
              </tr>
            </thead>

            <tbody>
              {watchlist.map(item => (
                <StockRow
                  key={item.symbol}
                  item={item}
                  detail={details[item.symbol]}
                  removing={removing === item.symbol}
                  onClick={() => navigate(`/stocks?ticker=${toDisplaySymbol(item.symbol)}`)}
                  onRemove={handleRemove}
                />
              ))}
            </tbody>
          </table>
        )}

        <div
          onClick={() => navigate('/stocks')}
          className="flex items-center gap-2 px-6 py-4 border-t border-dashed border-gray-200 text-gray-400 hover:text-blue-500 hover:bg-blue-50 cursor-pointer transition-colors"
        >
          <span className="text-lg font-light">+</span>
          <span className="text-sm">新增自選股</span>
        </div>
      </div>
    </div>
  )
}
