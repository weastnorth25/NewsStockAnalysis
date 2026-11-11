// 首頁的新聞情緒走勢：專業版是情緒分數＋加權指數雙軸折線，新手版是最近兩週每天一格的心情色塊
// 情緒分數 0～100 是每天新聞 AI 情緒分數的平均；後端還沒做之前用示意資料
import { useState } from 'react'
import { ComposedChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceArea, ResponsiveContainer } from 'recharts'
import useAsync from '../../hooks/useAsync'
import { fetchSentimentTrend } from '../../api/sentiment'
import { mockIndexHistory } from '../../data/homeMock'
import { sentimentLevel, SENTIMENT_NEUTRAL, fmtNum } from '../../utils/market'

const RANGES = [{ key: '1M', days: 22 }, { key: '3M', days: 66 }]

const MockBadge = () => <span className="text-[11px] text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">示意</span>

function TrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const lv = sentimentLevel(d.score)
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2 text-xs">
      <p className="text-gray-500 mb-1">{label}・{d.count} 則新聞</p>
      <p>情緒 <b className={lv.textClass}>{d.score}（{lv.label}）</b></p>
      {d.close != null && <p className="text-gray-600">加權指數 {fmtNum(d.close)}</p>}
    </div>
  )
}

// 專業版：lastClose 有值才疊加權指數（示意走勢以最新收盤價往回推）
export function SentimentTrendPro({ lastClose }) {
  const [range, setRange] = useState(RANGES[0])
  const trend = useAsync(range.key, () => fetchSentimentTrend(range.days))
  const rows = trend.data?.data ?? []

  // 用日期把指數收盤價併進情緒資料
  const closeByDate = lastClose
    ? Object.fromEntries(mockIndexHistory(lastClose, range.days).map((r) => [r.date, r.close]))
    : {}
  const data = rows.map((r) => ({ ...r, close: closeByDate[r.date] }))

  const last = rows.at(-1)?.score
  const prev = rows.at(-6)?.score
  const lv = sentimentLevel(last)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 min-w-0 flex flex-col gap-3">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-gray-900">新聞情緒走勢</p>
          {trend.data?.isMock && <MockBadge />}
          {last != null && (
            <span className="text-[13px] text-gray-600">
              今日 <b className={lv.textClass}>{last}（{lv.label}）</b>
              {prev != null && <>・較 5 日前 {last - prev > 0 ? '+' : ''}{last - prev}</>}
            </span>
          )}
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRange(r)}
              aria-pressed={range.key === r.key}
              className={`px-3 py-1 rounded-md text-[13px] ${range.key === r.key ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'}`}
            >
              {r.key}
            </button>
          ))}
        </div>
      </div>

      {trend.loading ? (
        <p className="text-sm text-gray-400 h-[220px] flex items-center justify-center">載入中...</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#f3f4f6" vertical={false} />
            <ReferenceArea yAxisId="s" y1={SENTIMENT_NEUTRAL[0]} y2={SENTIMENT_NEUTRAL[1]} fill="#f1f5f9" fillOpacity={0.8} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis yAxisId="s" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false} axisLine={false} width={32} />
            {lastClose && (
              <YAxis yAxisId="i" orientation="right" domain={['auto', 'auto']} tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false} axisLine={false} width={52} tickFormatter={(v) => v.toLocaleString('en-US', { maximumFractionDigits: 0 })} />
            )}
            <Tooltip content={<TrendTooltip />} />
            {lastClose && <Line yAxisId="i" type="monotone" dataKey="close" stroke="#cbd5e1" strokeWidth={1.5} dot={false} />}
            <Line yAxisId="s" type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </ComposedChart>
        </ResponsiveContainer>
      )}

      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-600" />情緒分數（左軸）</span>
        {lastClose && <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-slate-300" />加權指數（右軸）</span>}
        <span className="flex items-center gap-1.5"><span className="w-3 h-2.5 bg-slate-100 rounded-sm" />中性區間 40～60</span>
        <span>每日新聞 AI 情緒分數平均</span>
      </div>
    </div>
  )
}

// 新手版：最近 10 個交易日，每天一格，顏色＝當天心情；比較前後 5 天說出趨勢
function trendSentence(rows) {
  if (rows.length < 10) return null
  const avg = (a) => a.reduce((s, r) => s + r.score, 0) / a.length
  const diff = avg(rows.slice(5)) - avg(rows.slice(0, 5))
  if (diff > 5) return { text: '這兩週大家越來越樂觀', className: 'text-red-600' }
  if (diff < -5) return { text: '這兩週大家越來越悲觀', className: 'text-emerald-600' }
  return { text: '這兩週大家的心情差不多', className: 'text-slate-600' }
}

export function SentimentTrendBeginner() {
  const trend = useAsync('10d', () => fetchSentimentTrend(10))
  const rows = trend.data?.data ?? []
  const sentence = trendSentence(rows)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3 min-w-0">
      <div className="flex items-center gap-2">
        <p className="text-base font-bold text-gray-900">最近兩週的市場心情</p>
        {trend.data?.isMock && <MockBadge />}
      </div>
      {sentence && <p className={`text-[15px] font-medium ${sentence.className}`}>{sentence.text}</p>}
      {trend.loading && <p className="text-sm text-gray-400">載入中...</p>}

      <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
        {rows.map((r) => {
          const lv = sentimentLevel(r.score)
          return (
            <div key={r.date} className="flex flex-col items-center gap-1">
              <div
                className="w-full aspect-square max-w-14 rounded-lg flex flex-col items-center justify-center"
                style={{ background: lv.bg, color: lv.fg }}
                title={`${r.date} ${lv.label}`}
              >
                <span className="text-sm font-bold leading-none">{r.score}</span>
                <span className="text-[10px] leading-tight mt-0.5">{lv.label}</span>
              </div>
              <span className="text-[11px] text-gray-500">{r.date}</span>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-gray-500">分數是每天新聞的 AI 情緒平均：越高代表新聞越樂觀，紅＝樂觀、綠＝悲觀・非投資建議</p>
    </div>
  )
}
