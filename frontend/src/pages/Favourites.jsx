// 自選股頁面：表格式清單，顯示股票名稱、成交價、漲跌、成交量，點擊可跳至股票詳情
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchStockInfo } from '../api/stock'
import { mockWatchlist, mockStockList } from '../data/mockData'
import { getStockName } from '../data/stockNames'

// 個別股票列（打 API 取即時資料）
function StockRow({ symbol, name, onClick }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const ticker = `${symbol}.TW`
    fetchStockInfo(ticker)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [symbol])

  const isUp = (data?.change_pct ?? 0) >= 0

  return (
    <tr
      onClick={onClick}
      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
    >
      {/* 漲跌色條 */}
      <td className="py-3.5 pl-4 pr-2 w-1">
        <div className={`w-1 h-8 rounded-full ${isUp ? 'bg-red-400' : 'bg-emerald-400'}`} />
      </td>

      {/* 股票名稱 + 代號 */}
      <td className="py-3.5 pr-4">
        <p className="text-sm font-semibold text-gray-900">{name}</p>
        <p className="text-xs text-gray-400">{symbol}</p>
      </td>

      {/* 成交價 */}
      <td className="py-3.5 px-4 text-right">
        {loading ? (
          <span className="text-gray-300 text-sm">--</span>
        ) : data ? (
          <span className={`text-sm font-semibold ${isUp ? 'text-red-500' : 'text-emerald-600'}`}>
            {data.current_price?.toLocaleString()}
          </span>
        ) : (
          <span className="text-gray-300 text-sm">--</span>
        )}
      </td>

      {/* 漲跌（金額 + %） */}
      <td className="py-3.5 px-4 text-right">
        {data ? (
          <div>
            <p className={`text-sm font-medium ${isUp ? 'text-red-500' : 'text-emerald-600'}`}>
              {isUp ? '▲' : '▼'} {Math.abs(data.change ?? 0).toFixed(2)}
            </p>
            <p className={`text-xs ${isUp ? 'text-red-400' : 'text-emerald-500'}`}>
              ({Math.abs(data.change_pct ?? 0).toFixed(2)}%)
            </p>
          </div>
        ) : (
          <span className="text-gray-300 text-sm">--</span>
        )}
      </td>

      {/* 成交量 */}
      <td className="py-3.5 pl-4 pr-6 text-right">
        {data?.volume ? (
          <span className="text-sm text-gray-600">
            {data.volume >= 10000
              ? `${(data.volume / 10000).toFixed(2)} 萬`
              : data.volume.toLocaleString()}
          </span>
        ) : (
          <span className="text-gray-300 text-sm">--</span>
        )}
      </td>
    </tr>
  )
}

export default function Favourites() {
  const navigate = useNavigate()

  const favourites = mockWatchlist.map((symbol) => ({
    symbol,
    name: mockStockList.find((s) => s.symbol === symbol)?.name || getStockName(symbol, symbol),
  }))

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">自選</h1>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          {/* 表頭 */}
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="py-2.5 pl-4 pr-2 w-1" />
              <th className="py-2.5 pr-4 text-left text-xs font-medium text-gray-500">股票名稱</th>
              <th className="py-2.5 px-4 text-right text-xs font-medium text-gray-500">成交</th>
              <th className="py-2.5 px-4 text-right text-xs font-medium text-gray-500">漲跌</th>
              <th className="py-2.5 pl-4 pr-6 text-right text-xs font-medium text-gray-500">成交量</th>
            </tr>
          </thead>

          <tbody>
            {favourites.map(({ symbol, name }) => (
              <StockRow
                key={symbol}
                symbol={symbol}
                name={name}
                onClick={() => navigate(`/stocks?ticker=${symbol}`)}
              />
            ))}
          </tbody>
        </table>

        {/* 新增自選股按鈕 */}
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
