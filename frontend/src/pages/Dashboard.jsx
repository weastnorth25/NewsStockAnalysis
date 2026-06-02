// 首頁：顯示三大市場指數、市場強弱圓圈、今日重點新聞摘要
import { useEffect, useState } from 'react'
import { fetchStockInfo } from '../api/stock'
import { mockNews } from '../data/mockData'
import { useNavigate } from 'react-router-dom'

// ─── 市場指數設定（權重總和 = 1）────────────────────────────────
const INDICES = [
  { label: '台灣加權指數', ticker: '^TWII', weight: 0.5 },
  { label: 'S&P 500',     ticker: '^GSPC', weight: 0.3 },
  { label: 'NASDAQ',      ticker: '^IXIC', weight: 0.2 },
]

// ─── 三大指數加權分數 → 市場強弱 ────────────────────────────────
// 閾值設得保守，避免單日爆量或單一市場異動造成誤判
// 等 AI 情緒分析完成後，這裡換成 sentiment_score 平均值即可
function calcSentiment(score) {
  if (score === null) return { label: '計算中', ringColor: '#e2e8f0', dash: 0,   textColor: 'text-gray-400' }
  if (score >  2.0)  return { label: '大買',   ringColor: '#f87171', dash: 310,  textColor: 'text-red-400' }
  if (score >  0.5)  return { label: '偏多',   ringColor: '#34d399', dash: 230,  textColor: 'text-emerald-500' }
  if (score >= -0.5) return { label: '觀望',   ringColor: '#94a3b8', dash: 176,  textColor: 'text-slate-400' }
  if (score >= -2.0) return { label: '偏空',   ringColor: '#60a5fa', dash: 120,  textColor: 'text-blue-400' }
  return               { label: '大賣',   ringColor: '#818cf8', dash: 60,   textColor: 'text-indigo-400' }
}

// ─── 單一指數卡片（會把 data 回傳給父層算加權）──────────────────
function IndexCard({ label, ticker, weight, onData }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)

  useEffect(() => {
    fetchStockInfo(ticker)
      .then(d => { setData(d); onData(ticker, d.change_pct, weight) })
      .catch(() => { setError(true); onData(ticker, null, weight) })
      .finally(() => setLoading(false))
  }, [ticker])

  const isUp = (data?.change_pct ?? 0) >= 0

  return (
    <div className="py-4 border-b border-gray-100 last:border-0">
      <p className="text-sm text-gray-500">{label}</p>
      {loading && <p className="text-gray-400 text-sm mt-1">載入中...</p>}
      {error   && <p className="text-gray-400 text-sm mt-1">無法取得資料</p>}
      {data && (
        <div className="flex items-center justify-between mt-1">
          <p className="text-2xl font-semibold text-gray-900">
            {data.current_price?.toLocaleString()}
          </p>
          <span className={`text-sm flex items-center gap-1 font-medium ${isUp ? 'text-red-500' : 'text-emerald-500'}`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d={isUp ? 'M5 10l7-7m0 0l7 7m-7-7v18' : 'M19 14l-7 7m0 0l-7-7m7 7V3'} />
            </svg>
            {data.change_pct != null ? `${Math.abs(data.change_pct)}%` : '--'}
          </span>
        </div>
      )}
    </div>
  )
}

// ─── 市場強弱圓圈 ────────────────────────────────────────────────
function SentimentRing({ score }) {
  const s = calcSentiment(score)
  // 圓周 ≈ 352，dash 代表填滿程度
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-center justify-center">
      <p className="text-sm font-medium text-gray-700 mb-6">市場強弱</p>

      <div className="relative flex items-center justify-center w-36 h-36">
        <svg className="absolute" width="144" height="144" viewBox="0 0 144 144">
          <circle cx="72" cy="72" r="56" fill="none" stroke="#f1f5f9" strokeWidth="12" />
          <circle
            cx="72" cy="72" r="56"
            fill="none"
            stroke={s.ringColor}
            strokeWidth="12"
            strokeDasharray={`${s.dash} 352`}
            strokeLinecap="round"
            transform="rotate(-90 72 72)"
            style={{ transition: 'stroke-dasharray 0.8s ease, stroke 0.8s ease' }}
          />
        </svg>
        <span className={`text-xl font-semibold ${s.textColor}`}>{s.label}</span>
      </div>

      {/* 分數說明 */}
      <div className="mt-4 text-center">
        {score !== null ? (
          <>
            <p className="text-xs text-gray-400">
              加權分數：
              <span className={`font-medium ${score >= 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                {score >= 0 ? '+' : ''}{score.toFixed(2)}%
              </span>
            </p>
            <p className="text-xs text-gray-300 mt-1">
              加權指數 50% ＋ S&P 500 30% ＋ NASDAQ 20%
            </p>
          </>
        ) : (
          <p className="text-xs text-gray-400">資料載入中...</p>
        )}
      </div>
    </div>
  )
}

// ─── 主頁面 ──────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate()

  // 收集各指數回傳的 change_pct，算加權分數
  const [indexResults, setIndexResults] = useState({})

  const handleData = (ticker, changePct, weight) => {
    setIndexResults(prev => ({ ...prev, [ticker]: { changePct, weight } }))
  }

  // 三個都回來才算（有任一個失敗就顯示可用的部分）
  const weightedScore = (() => {
    const entries = Object.values(indexResults)
    if (entries.length === 0) return null
    const validEntries = entries.filter(e => e.changePct !== null)
    if (validEntries.length === 0) return null
    // 重新正規化權重（避免有指數失敗時分母不足1）
    const totalWeight = validEntries.reduce((s, e) => s + e.weight, 0)
    const score = validEntries.reduce((s, e) => s + (e.changePct * e.weight), 0) / totalWeight
    return Math.round(score * 100) / 100
  })()

  const topNews = mockNews.slice(0, 3)

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 mb-4">

        {/* 市場指數 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-xs text-gray-400 mb-2">市場指數</p>
          {INDICES.map(idx => (
            <IndexCard key={idx.ticker} {...idx} onData={handleData} />
          ))}
        </div>

        {/* 市場強弱 */}
        <SentimentRing score={weightedScore} />
      </div>

      {/* 今日重點新聞 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">📰 今日重點新聞</h2>
        <div className="space-y-5">
          {topNews.map((news) => (
            <div
              key={news.id}
              onClick={() => navigate('/news', { state: { selectedId: news.id } })}
              className="cursor-pointer group"
            >
              <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-500 transition-colors">
                {news.title}
              </p>
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{news.summary}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs text-gray-400">{news.source}</span>
                <span className="text-gray-300">·</span>
                <span className="text-xs text-gray-400">{news.date}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  news.sentiment >= 0.7 ? 'bg-red-50 text-red-500'
                  : news.sentiment >= 0.5 ? 'bg-yellow-50 text-yellow-600'
                  : 'bg-emerald-50 text-emerald-600'
                }`}>
                  {news.sentiment >= 0.7 ? '正向' : news.sentiment >= 0.5 ? '中性' : '負向'}
                </span>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() => navigate('/news')}
          className="mt-5 text-sm text-blue-500 hover:text-blue-600 font-medium"
        >
          查看所有新聞 →
        </button>
      </div>
    </div>
  )
}
