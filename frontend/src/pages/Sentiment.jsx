// 市場情緒：收集各論壇貼文，分析散戶情緒並排行熱門股票（目前使用假資料）
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, CartesianGrid, ReferenceLine, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { mockForumPosts, mockStockList, FORUM_SOURCES } from '../data/mockData'

// ─── 情緒判讀 ────────────────────────────────────────────────────
function sentimentLabel(s) {
  if (s >= 0.7)  return { text: '偏多', color: 'text-red-500',     bg: 'bg-red-50',     bar: 'bg-red-400'     }
  if (s >= 0.5)  return { text: '觀望', color: 'text-yellow-600',  bg: 'bg-yellow-50',  bar: 'bg-yellow-400'  }
  return            { text: '偏空', color: 'text-emerald-600', bg: 'bg-emerald-50', bar: 'bg-emerald-400' }
}

// ─── 大盤情緒走勢圖 ──────────────────────────────────────────────
function MarketTrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const lbl = sentimentLabel(d.sentiment)
  return (
    <div className="bg-gray-800 text-white text-xs px-3 py-2 rounded-lg shadow-lg">
      <p className="text-gray-400 mb-1">{label}・{d.count} 篇貼文</p>
      <p className="font-semibold">
        情緒分數 {(d.sentiment * 100).toFixed(0)}
        <span className={`ml-2 ${
          d.sentiment >= 0.7 ? 'text-red-400'
          : d.sentiment >= 0.5 ? 'text-yellow-400'
          : 'text-emerald-400'
        }`}>
          {lbl.text}
        </span>
      </p>
    </div>
  )
}

function MarketTrendChart({ data }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">大盤情緒走勢</h3>
        <span className="text-xs text-gray-400">近 {data.length} 天每日加權平均</span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 1]}
            ticks={[0, 0.5, 0.7, 1]}
            tickFormatter={v => Math.round(v * 100)}
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <ReferenceLine y={0.7} stroke="#f87171" strokeDasharray="3 3" />
          <ReferenceLine y={0.5} stroke="#fbbf24" strokeDasharray="3 3" />
          <Tooltip content={<MarketTrendTooltip />} />
          <Line
            type="monotone"
            dataKey="sentiment"
            stroke="#6366f1"
            strokeWidth={2.5}
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

// ─── 整體情緒圓圈 ────────────────────────────────────────────────
function SentimentGauge({ score, total }) {
  const s = sentimentLabel(score)
  const ringColor = score >= 0.7 ? '#f87171' : score >= 0.5 ? '#fbbf24' : '#34d399'
  const circumference = 352
  const dash = Math.max(20, score * circumference)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-center justify-center">
      <p className="text-sm font-medium text-gray-700 mb-2">整體論壇情緒</p>
      <p className="text-xs text-gray-400 mb-6">近 7 天・{total} 篇貼文</p>

      <div className="relative flex items-center justify-center w-44 h-44">
        <svg className="absolute" width="176" height="176" viewBox="0 0 176 176">
          <circle cx="88" cy="88" r="68" fill="none" stroke="#f1f5f9" strokeWidth="14" />
          <circle
            cx="88" cy="88" r="68"
            fill="none"
            stroke={ringColor}
            strokeWidth="14"
            strokeDasharray={`${dash} ${circumference}`}
            strokeLinecap="round"
            transform="rotate(-90 88 88)"
            style={{ transition: 'stroke-dasharray 0.8s ease, stroke 0.8s ease' }}
          />
        </svg>
        <div className="text-center">
          <p className={`text-2xl font-bold ${s.color}`}>{s.text}</p>
          <p className="text-xs text-gray-500 mt-1">{(score * 100).toFixed(0)} 分</p>
        </div>
      </div>
    </div>
  )
}

// ─── 各論壇情緒分布 ──────────────────────────────────────────────
function ForumBreakdown({ stats }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <p className="text-sm font-medium text-gray-700 mb-1">論壇來源</p>
      <p className="text-xs text-gray-400 mb-5">各論壇平均情緒分數</p>

      <div className="grid grid-cols-2 gap-3">
        {FORUM_SOURCES.map(src => {
          const stat = stats[src.key] || { avg: 0, count: 0 }
          const lbl  = sentimentLabel(stat.avg)
          return (
            <div key={src.key} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full" style={{ background: src.color }} />
                <span className="text-xs font-medium text-gray-700">{src.label}</span>
              </div>
              <div className="flex items-baseline justify-between mb-1.5">
                <span className={`text-base font-bold ${lbl.color}`}>{lbl.text}</span>
                <span className="text-xs text-gray-500">{stat.count} 篇</span>
              </div>
              <div className="relative h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className={`h-full ${lbl.bar}`} style={{ width: `${stat.avg * 100}%` }} />
                <div className="absolute left-1/2 top-0 h-full w-px bg-gray-400 -translate-x-1/2" />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── 熱門股票排行 ────────────────────────────────────────────────
function HotStocksRanking({ ranking, navigate }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">熱門股票排行</h3>
        <span className="text-xs text-gray-400">依討論篇數</span>
      </div>
      <div className="space-y-2">
        {ranking.map((r, idx) => {
          const lbl = sentimentLabel(r.avg)
          return (
            <div
              key={r.symbol}
              onClick={() => navigate(`/stocks?ticker=${r.symbol}`)}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <span className={`w-6 text-center text-sm font-bold ${
                idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-gray-400' : idx === 2 ? 'text-orange-400' : 'text-gray-300'
              }`}>
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{r.symbol}</p>
                <p className="text-xs text-gray-500 truncate">{r.name}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-medium text-gray-900">{r.count} 篇</p>
                <span className={`inline-block text-xs px-1.5 py-0.5 rounded-full mt-0.5 ${lbl.bg} ${lbl.color}`}>
                  {lbl.text} {(r.avg * 100).toFixed(0)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── 熱門貼文 ────────────────────────────────────────────────────
function HotPosts({ posts, navigate }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">熱門貼文</h3>
        <span className="text-xs text-gray-400">依讚數 + 回覆數</span>
      </div>
      <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
        {posts.map(p => {
          const src = FORUM_SOURCES.find(s => s.key === p.source)
          const lbl = sentimentLabel(p.sentiment)
          return (
            <div key={p.id} className="border border-gray-100 rounded-lg p-3 hover:border-gray-200 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                  style={{ background: src?.color || '#9ca3af' }}
                >
                  {src?.label}
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${lbl.bg} ${lbl.color}`}>
                  {lbl.text}
                </span>
                <span className="text-xs text-gray-400 ml-auto">{p.postedAt}</span>
              </div>
              <p className="text-sm font-semibold text-gray-900 leading-snug mb-1">{p.title}</p>
              <p className="text-xs text-gray-500 line-clamp-2 mb-2">{p.excerpt}</p>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span>@{p.author}</span>
                <span>·</span>
                <span>👍 {p.likes}</span>
                <span>💬 {p.replies}</span>
                {p.mentionedStocks?.length > 0 && (
                  <>
                    <span>·</span>
                    <div className="flex gap-1">
                      {p.mentionedStocks.map(s => (
                        <button
                          key={s}
                          onClick={(e) => { e.stopPropagation(); navigate(`/stocks?ticker=${s}`) }}
                          className="text-blue-500 hover:underline"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── 主頁面 ──────────────────────────────────────────────────────
export default function Sentiment() {
  const navigate = useNavigate()

  // 整體情緒（所有貼文加權平均，用按讚數當權重）
  const overall = useMemo(() => {
    const totalWeight = mockForumPosts.reduce((s, p) => s + p.likes, 0)
    const weighted    = mockForumPosts.reduce((s, p) => s + p.sentiment * p.likes, 0)
    return { score: weighted / totalWeight, total: mockForumPosts.length }
  }, [])

  // 每個論壇來源的平均情緒
  const forumStats = useMemo(() => {
    const buckets = {}
    mockForumPosts.forEach(p => {
      if (!buckets[p.source]) buckets[p.source] = { sum: 0, count: 0 }
      buckets[p.source].sum   += p.sentiment
      buckets[p.source].count += 1
    })
    return Object.fromEntries(
      Object.entries(buckets).map(([k, v]) => [k, { avg: v.sum / v.count, count: v.count }])
    )
  }, [])

  // 熱門股票排行（依被提及篇數，並算平均情緒）
  const stockRanking = useMemo(() => {
    const buckets = {}
    mockForumPosts.forEach(p => {
      p.mentionedStocks?.forEach(symbol => {
        if (!buckets[symbol]) buckets[symbol] = { sum: 0, count: 0 }
        buckets[symbol].sum   += p.sentiment
        buckets[symbol].count += 1
      })
    })
    return Object.entries(buckets)
      .map(([symbol, v]) => ({
        symbol,
        name: mockStockList.find(s => s.symbol === symbol)?.name || symbol,
        avg: v.sum / v.count,
        count: v.count,
      }))
      .sort((a, b) => b.count - a.count)
  }, [])

  // 熱門貼文（依互動度排序）
  const hotPosts = useMemo(
    () => [...mockForumPosts].sort((a, b) => (b.likes + b.replies) - (a.likes + a.replies)),
    []
  )

  // 大盤情緒走勢：按日分組，每日用按讚數加權平均
  const marketTrend = useMemo(() => {
    const buckets = {}
    mockForumPosts.forEach(p => {
      const day = p.postedAt.split(' ')[0]  // '2026/6/3 14:32' → '2026/6/3'
      if (!buckets[day]) buckets[day] = { weighted: 0, weight: 0, count: 0 }
      buckets[day].weighted += p.sentiment * p.likes
      buckets[day].weight   += p.likes
      buckets[day].count    += 1
    })
    return Object.entries(buckets)
      .map(([day, v]) => {
        const [, m, d] = day.split('/')
        return {
          _sort:     parseInt(m) * 100 + parseInt(d),
          date:      `${m}/${d}`,
          sentiment: Math.round((v.weighted / v.weight) * 100) / 100,
          count:     v.count,
        }
      })
      .sort((a, b) => a._sort - b._sort)
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">市場情緒</h1>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <SentimentGauge score={overall.score} total={overall.total} />
        <div className="col-span-2">
          <ForumBreakdown stats={forumStats} />
        </div>
      </div>

      <div className="mb-4">
        <MarketTrendChart data={marketTrend} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <HotStocksRanking ranking={stockRanking} navigate={navigate} />
        <HotPosts posts={hotPosts} navigate={navigate} />
      </div>
    </div>
  )
}
