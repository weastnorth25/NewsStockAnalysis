// 股票頁面：左側為股票列表，右側顯示選中股票的即時價格、線圖（1H/4H/日線/週線）、基本資料、相關新聞
import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { AreaChart, Area, LineChart, Line, CartesianGrid, ReferenceLine, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { fetchStockInfo, fetchWatchlist, addToWatchlist, removeFromWatchlist, toFullTicker, toDisplaySymbol } from '../api/stock'
import { mockStockList, mockStockDetail, mockNews, mockCompanyInfo, getSentimentHistory } from '../data/mockData'
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

function SentimentTrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-gray-800 text-white text-xs px-3 py-2 rounded-lg shadow-lg max-w-xs">
      <p className="text-gray-400 mb-1">{label}・{d.count} 篇新聞</p>
      <p className="font-semibold mb-1.5">情緒分數 {(d.sentiment * 100).toFixed(0)}</p>
      {d.items.slice(0, 3).map(item => (
        <p key={item.id} className="text-gray-300 mt-0.5 truncate">
          ・{item.title}
        </p>
      ))}
    </div>
  )
}

function SentimentTrendChart({ data }) {
  if (!data.length) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl h-48 flex items-center justify-center text-sm text-gray-400">
        過去 30 天內無相關新聞，暫無情緒走勢
      </div>
    )
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 1]}
            ticks={[0, 0.5, 0.7, 1]}
            tickFormatter={v => Math.round(v * 100)}
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <ReferenceLine y={0.7} stroke="#f87171" strokeDasharray="3 3" />
          <ReferenceLine y={0.5} stroke="#fbbf24" strokeDasharray="3 3" />
          <Tooltip content={<SentimentTrendTooltip />} />
          <Line
            type="monotone"
            dataKey="sentiment"
            stroke="#6366f1"
            strokeWidth={2}
            dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 px-1">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-0.5 bg-red-400" />正向門檻 70
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-0.5 bg-yellow-400" />中性門檻 50
        </span>
      </div>
    </div>
  )
}

function SentimentBlock({ news, navigate }) {
  if (!news.length) return <p className="text-sm text-gray-400">尚無相關新聞可分析</p>

  const avg      = news.reduce((s, n) => s + n.sentiment, 0) / news.length
  const positive = news.filter(n => n.sentiment >= 0.7).length
  const neutral  = news.filter(n => n.sentiment >= 0.5 && n.sentiment < 0.7).length
  const negative = news.filter(n => n.sentiment < 0.5).length

  const label      = avg >= 0.7 ? '偏多' : avg >= 0.5 ? '觀望' : '偏空'
  const labelColor = avg >= 0.7 ? 'text-red-500' : avg >= 0.5 ? 'text-yellow-600' : 'text-emerald-600'
  const barColor   = avg >= 0.7 ? 'bg-red-400'   : avg >= 0.5 ? 'bg-yellow-400'   : 'bg-emerald-400'

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
        <span className={`text-base font-bold shrink-0 ${labelColor}`}>{label}</span>
        <div className="flex-1">
          <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${avg * 100}%` }} />
            <div className="absolute left-1/2 top-0 h-full w-px bg-gray-400 -translate-x-1/2" />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            綜合分數 {(avg * 100).toFixed(0)}%・共 {news.length} 篇新聞
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="py-2 bg-red-50 rounded-lg">
          <p className="text-base font-bold text-red-500">{positive}</p>
          <p className="text-xs text-gray-500">正向</p>
        </div>
        <div className="py-2 bg-yellow-50 rounded-lg">
          <p className="text-base font-bold text-yellow-600">{neutral}</p>
          <p className="text-xs text-gray-500">中性</p>
        </div>
        <div className="py-2 bg-emerald-50 rounded-lg">
          <p className="text-base font-bold text-emerald-600">{negative}</p>
          <p className="text-xs text-gray-500">負向</p>
        </div>
      </div>

      <div className="space-y-2">
        {news.slice(0, 3).map(n => (
          <div
            key={n.id}
            onClick={() => navigate('/news', { state: { selectedId: n.id } })}
            className="flex items-start gap-2 cursor-pointer group"
          >
            <span className={`mt-0.5 shrink-0 text-xs px-1.5 py-0.5 rounded-full ${
              n.sentiment >= 0.7 ? 'bg-red-50 text-red-500'
              : n.sentiment >= 0.5 ? 'bg-yellow-50 text-yellow-600'
              : 'bg-emerald-50 text-emerald-600'
            }`}>
              {n.sentiment >= 0.7 ? '正向' : n.sentiment >= 0.5 ? '中性' : '負向'}
            </span>
            <p className="text-xs text-gray-600 group-hover:text-blue-500 transition-colors line-clamp-2">
              {n.title}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
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
  const sentimentHistory = useMemo(
    () => getSentimentHistory(selectedSymbol, 30),
    [selectedSymbol]
  )
  const companyInfo = mockCompanyInfo[selectedSymbol]
  const isUp = (liveData?.change_pct ?? 0) >= 0

  // 自選股狀態（用 Set 存所有 symbol，本地判斷 + 切換）
  const [watchlistSymbols, setWatchlistSymbols] = useState(new Set())
  const [watchlistBusy,    setWatchlistBusy]    = useState(false)
  const isGuest    = localStorage.getItem('token') === 'guest'
  const inWatchlist = watchlistSymbols.has(selectedSymbol)

  // 載入一次自選股清單（後端存的是 .TW 格式，前端統一 strip 後存）
  useEffect(() => {
    if (isGuest) return
    fetchWatchlist()
      .then(items => setWatchlistSymbols(new Set(items.map(i => toDisplaySymbol(i.symbol)))))
      .catch(() => {})
  }, [])

  const handleToggleWatchlist = async () => {
    setWatchlistBusy(true)
    try {
      if (inWatchlist) {
        await removeFromWatchlist(toFullTicker(selectedSymbol))
        setWatchlistSymbols(prev => { const n = new Set(prev); n.delete(selectedSymbol); return n })
      } else {
        await addToWatchlist(toFullTicker(selectedSymbol))
        setWatchlistSymbols(prev => new Set(prev).add(selectedSymbol))
      }
    } catch (err) {
      alert('操作失敗：' + (err.response?.data?.detail || err.message))
    } finally {
      setWatchlistBusy(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">股票</h1>

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
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-gray-900">{selectedSymbol}</h2>
                {!isGuest && (
                  <button
                    onClick={handleToggleWatchlist}
                    disabled={watchlistBusy}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors disabled:opacity-50 ${
                      inWatchlist
                        ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100 border border-yellow-200'
                        : 'bg-gray-50 text-gray-600 hover:bg-blue-50 hover:text-blue-500 border border-gray-200'
                    }`}
                  >
                    {watchlistBusy ? '處理中...' : inWatchlist ? '★ 已加入自選' : '☆ 加入自選'}
                  </button>
                )}
              </div>
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

          {/* 情緒走勢圖 */}
          <div className="mb-6">
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">情緒走勢（過去 30 天）</h3>
              <span className="text-xs text-gray-400">
                {sentimentHistory.length > 0
                  ? `共 ${sentimentHistory.reduce((s, d) => s + d.count, 0)} 篇新聞・${sentimentHistory.length} 個有效日期`
                  : ''}
              </span>
            </div>
            <SentimentTrendChart data={sentimentHistory} />
          </div>

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
              <h3 className="text-sm font-semibold text-gray-900 mb-3">AI 情緒分析</h3>
              <SentimentBlock news={relatedNews} navigate={navigate} />
            </div>
          </div>

          {/* 公司基本資料 */}
          {companyInfo && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">公司基本資料</h3>
              <div className="bg-gray-50 rounded-xl p-5">
                <p className="text-sm font-semibold text-gray-900 mb-1.5">{companyInfo.fullName}</p>
                <p className="text-sm text-gray-600 leading-relaxed mb-4">{companyInfo.description}</p>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">創立</span>
                    <span className="text-gray-900 font-medium">{companyInfo.founded}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">員工人數</span>
                    <span className="text-gray-900 font-medium">{companyInfo.employees}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">董事長</span>
                    <span className="text-gray-900 font-medium">{companyInfo.chairman}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">產業</span>
                    <span className="text-gray-900 font-medium">{liveData?.sector || '—'}</span>
                  </div>
                  <div className="flex justify-between col-span-2">
                    <span className="text-gray-500">總部</span>
                    <span className="text-gray-900 font-medium">{companyInfo.address}</span>
                  </div>
                  <div className="flex justify-between col-span-2">
                    <span className="text-gray-500">官網</span>
                    <a
                      href={`https://${companyInfo.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-600 hover:underline"
                    >
                      {companyInfo.website}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
