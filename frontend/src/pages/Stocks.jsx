// 股票頁面：左側為股票列表，右側顯示選中股票的即時價格、線圖（1H/4H/日線/週線）、基本資料、相關新聞
import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { fetchStockInfo } from '../api/stock'
import { mockStockList, mockStockDetail, mockNews } from '../data/mockData'
import { getStockName } from '../data/stockNames'

// ─── 時間框架設定 ────────────────────────────────────────────────
const TIMEFRAMES = [
  { key: '1H',   label: '1小時', points: 24,  volatility: 0.003 },
  { key: '4H',   label: '4小時', points: 42,  volatility: 0.006 },
  { key: 'D',    label: '日線',  points: 90,  volatility: 0.015 },
  { key: 'W',    label: '週線',  points: 52,  volatility: 0.03  },
]

// ─── 根據基準價和時間框架產生假歷史資料 ──────────────────────────
function generateChartData(basePrice, timeframeKey, symbol) {
  const tf = TIMEFRAMES.find(t => t.key === timeframeKey)
  if (!tf || !basePrice) return []

  const now    = new Date()
  const points = []
  // 用股票代號當種子讓同一支股票每次形狀一致
  let seed = symbol.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const rng = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }

  // 從最終價往回推算
  let price = basePrice
  const raw = [price]
  for (let i = 1; i < tf.points; i++) {
    price = price / (1 + (rng() - 0.48) * tf.volatility)
    raw.unshift(price)
  }

  // 產生日期標籤
  for (let i = 0; i < tf.points; i++) {
    const d = new Date(now)
    let label = ''

    if (timeframeKey === '1H') {
      d.setHours(d.getHours() - (tf.points - 1 - i))
      label = `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:00`
    } else if (timeframeKey === '4H') {
      d.setHours(d.getHours() - (tf.points - 1 - i) * 4)
      label = `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:00`
    } else if (timeframeKey === 'D') {
      d.setDate(d.getDate() - (tf.points - 1 - i))
      label = `${d.getMonth()+1}/${d.getDate()}`
    } else {
      d.setDate(d.getDate() - (tf.points - 1 - i) * 7)
      label = `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`
    }

    points.push({ date: label, price: Math.round(raw[i] * 10) / 10 })
  }

  return points
}

// ─── 小元件 ──────────────────────────────────────────────────────
function StatBox({ label, value }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-center">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  )
}

function CustomTooltip({ active, payload, label }) {
  if (active && payload?.length) {
    return (
      <div className="bg-gray-800 text-white text-xs px-3 py-2 rounded-lg shadow-lg">
        <p className="text-gray-400 mb-0.5">{label}</p>
        <p className="font-semibold">{payload[0].value?.toLocaleString()}</p>
      </div>
    )
  }
  return null
}

// ─── 主頁面 ──────────────────────────────────────────────────────
export default function Stocks() {
  const [searchParams] = useSearchParams()
  const navigate       = useNavigate()
  const urlTicker      = searchParams.get('ticker')

  const [selectedSymbol, setSelectedSymbol] = useState(urlTicker || mockStockList[0].symbol)
  const [liveData,       setLiveData]       = useState(null)
  const [loadingLive,    setLoadingLive]    = useState(false)
  const [timeframe,      setTimeframe]      = useState('D')   // 預設日線

  // URL ticker 變動時同步
  useEffect(() => {
    if (urlTicker) setSelectedSymbol(urlTicker)
  }, [urlTicker])

  // 切換股票時打 API 取即時價格
  useEffect(() => {
    if (!selectedSymbol) return
    setLoadingLive(true)
    setLiveData(null)
    const ticker = selectedSymbol.includes('.') ? selectedSymbol : `${selectedSymbol}.TW`
    fetchStockInfo(ticker)
      .then(setLiveData)
      .catch(() => setLiveData(null))
      .finally(() => setLoadingLive(false))
  }, [selectedSymbol])

  // 依即時收盤價 + 時間框架產生線圖資料（symbol 或 timeframe 變時重算）
  const chartData = useMemo(() => {
    const base = liveData?.current_price
                 || mockStockDetail[selectedSymbol]?.close
                 || null
    if (!base) return []
    return generateChartData(base, timeframe, selectedSymbol)
  }, [liveData, timeframe, selectedSymbol])

  const detail    = mockStockDetail[selectedSymbol]
  const stockName = mockStockList.find(s => s.symbol === selectedSymbol)?.name
                 || getStockName(selectedSymbol, liveData?.company_name)
                 || selectedSymbol
  const relatedNews = mockNews.filter(n => n.relatedStocks?.includes(selectedSymbol))
  const isUp = (liveData?.change_pct ?? 0) >= 0

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Stocks</h1>

      <div className="flex gap-4">

        {/* ── 左側：股票清單 ── */}
        <div className="w-40 shrink-0 bg-white rounded-xl border border-gray-200 overflow-hidden">
          {mockStockList.map((stock, idx) => (
            <div key={stock.symbol}>
              <button
                onClick={() => {
                  setSelectedSymbol(stock.symbol)
                  navigate(`/stocks?ticker=${stock.symbol}`)
                }}
                className={`w-full text-left px-4 py-3.5 text-sm transition-colors ${
                  selectedSymbol === stock.symbol
                    ? 'text-blue-500 font-semibold bg-blue-50'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <p>{stock.symbol}</p>
                <p className="text-xs text-gray-400 font-normal truncate">{stock.name}</p>
              </button>
              {idx < mockStockList.length - 1 && <div className="h-px bg-gray-100" />}
            </div>
          ))}
        </div>

        {/* ── 右側：股票詳情 ── */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 p-6 overflow-y-auto">

          {/* 股票名稱 + 即時價格 + 漲跌 */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{selectedSymbol}</h2>
              <p className="text-sm text-gray-500">{stockName}</p>
            </div>
            <div className="text-right">
              {loadingLive && <p className="text-sm text-gray-400 mt-2">載入中...</p>}
              {liveData && (
                <>
                  <p className="text-2xl font-bold text-gray-900">
                    {liveData.current_price?.toLocaleString()}
                  </p>
                  <p className={`text-sm font-medium mt-0.5 ${isUp ? 'text-red-500' : 'text-emerald-500'}`}>
                    {isUp ? '▲' : '▼'} {Math.abs(liveData.change ?? 0).toFixed(2)}&nbsp;
                    ({Math.abs(liveData.change_pct ?? 0).toFixed(2)}%)
                  </p>
                  <p className="text-xs text-gray-400">{liveData.currency}</p>
                </>
              )}
            </div>
          </div>

          {/* 數據小卡 */}
          <div className="grid grid-cols-5 gap-2 mb-4">
            <StatBox label="開盤"   value={detail ? `$${detail.open.toLocaleString()}`  : liveData?.prev_close ? `$${liveData.prev_close.toLocaleString()}` : '--'} />
            <StatBox label="最高"   value={detail ? `$${detail.high.toLocaleString()}`  : '--'} />
            <StatBox label="最低"   value={detail ? `$${detail.low.toLocaleString()}`   : '--'} />
            <StatBox label="收"     value={detail ? `$${detail.close.toLocaleString()}` : liveData ? `$${liveData.current_price.toLocaleString()}` : '--'} />
            <StatBox label="成交量" value={detail ? detail.volume.toLocaleString()      : liveData?.volume ? liveData.volume.toLocaleString() : '--'} />
          </div>

          {/* 時間框架切換 + 線圖 */}
          <div className="bg-gray-900 rounded-xl p-4 mb-5">
            {/* Tab 切換列 */}
            <div className="flex gap-1 mb-3">
              {TIMEFRAMES.map(tf => (
                <button
                  key={tf.key}
                  onClick={() => setTimeframe(tf.key)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    timeframe === tf.key
                      ? 'bg-gray-600 text-white'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            {/* 線圖 */}
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#f87171" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#f87171" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#6b7280', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: '#6b7280', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    domain={['auto', 'auto']}
                    width={58}
                    tickFormatter={v => v.toLocaleString()}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="#f87171"
                    strokeWidth={2}
                    fill="url(#priceGrad)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#f87171', strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-60 flex items-center justify-center text-gray-600 text-sm">
                {loadingLive ? '載入中...' : '無法取得資料'}
              </div>
            )}
          </div>

          {/* 基本資料 */}
          {detail && (
            <div className="grid grid-cols-3 gap-x-8 gap-y-2 text-sm mb-6 pb-6 border-b border-gray-100">
              {[
                ['市值',    detail.marketCap],
                ['P/E',     detail.pe],
                ['殖利率',  detail.dividend],
                ['季配息',  detail.qtrDiv],
                ['52週高',  detail.high52w?.toLocaleString()],
                ['52週低',  detail.low52w?.toLocaleString()],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-gray-500">{label}</span>
                  <span className="text-gray-900 font-medium">{value}</span>
                </div>
              ))}
            </div>
          )}

          {/* 相關新聞 + AI 分析 */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">相關新聞</h3>
              {relatedNews.length > 0 ? (
                <div className="space-y-2">
                  {relatedNews.map(news => (
                    <p
                      key={news.id}
                      onClick={() => navigate('/news', { state: { selectedId: news.id } })}
                      className="text-sm text-gray-600 hover:text-blue-500 cursor-pointer transition-colors line-clamp-2"
                    >
                      {news.title}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">尚無相關新聞</p>
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">AI 分析</h3>
              <p className="text-sm text-gray-400">AI 分析功能開發中，敬請期待。</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
