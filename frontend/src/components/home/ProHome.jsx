// 首頁・專業模式（草稿 A）：KPI 列 → 加權指數走勢＋市場強弱／三大法人 → 新聞情緒走勢＋今日重點新聞 → 漲跌幅排行＋近期總經事件 → 上市公司月營收
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts'
import { changeClass, fmtPct, fmtNum, calcSentiment } from '../../utils/market'
import { fetchMarketInstitutional, fetchMarketMovers } from '../../api/market'
import { fetchHistory } from '../../api/stockData'
import useAsync from '../../hooks/useAsync'
import { fetchNews } from '../../api/news'
import { TONE } from '../../utils/news'
import MacroUpcomingCard from '../macro/MacroUpcomingCard'
import { SentimentTrendPro } from './SentimentTrend'
import { MarketRevenuePro } from './MarketRevenue'

const PRO_KPIS = [
  { ticker: '^TWII', label: '加權指數' },
  { ticker: '^GSPC', label: 'S&P 500' },
  { ticker: '^IXIC', label: 'NASDAQ' },
  { ticker: '^SOX',  label: '費城半導體' },
  { ticker: 'TWD=X', label: '美元 / 台幣', digits: 3 },
]

const RANGES = ['1W', '1M', '3M', '6M']

const Card = ({ className = '', children }) => (
  <div className={`bg-white rounded-xl border border-gray-200 p-4 min-w-0 ${className}`}>{children}</div>
)

const MockBadge = () => <span className="text-[11px] text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">示意</span>

function KpiCard({ label, quote, digits = 2 }) {
  const d = quote?.data
  return (
    <Card className="flex flex-col gap-1">
      <div className="flex justify-between items-baseline gap-1">
        <p className="text-xs text-gray-500">{label}</p>
        {/* 顯示的是瀏覽器存的上次報價，背景還在抓新的 */}
        {quote?.stale && <span className="text-[11px] text-amber-700">{quote.error ? '上次資料' : '更新中…'}</span>}
      </div>
      {quote?.loading && <p className="text-sm text-gray-400 py-1">載入中...</p>}
      {quote?.error && !d && <p className="text-sm text-gray-400 py-1">無法取得</p>}
      {d && (
        <>
          <span className="text-[22px] font-bold text-gray-900">{fmtNum(d.current_price, digits)}</span>
          <span className={`text-[13px] font-medium ${changeClass(d.change_pct)}`}>
            {d.change > 0 ? '+' : ''}{fmtNum(d.change, digits)}（{fmtPct(d.change_pct)}）
          </span>
        </>
      )}
    </Card>
  )
}

// 1W 沒有對應的後端區間，抓 1M 再取最後 5 天
const RANGE_QUERY = { '1W': '1M', '1M': '1M', '3M': '3M', '6M': '6M' }
const md = (iso) => `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`

function IndexTrendCard({ quote }) {
  const [range, setRange] = useState('1M')
  const last = quote?.data?.current_price
  // 真的歷史股價（/history），後端失敗才用示意資料
  const hist = useAsync(range, () => fetchHistory('^TWII', RANGE_QUERY[range], last ?? 20000), { cache: 'twii' })
  const rows = hist.data?.data ?? []
  const data = (range === '1W' ? rows.slice(-5) : rows).map((r) => ({ date: md(r.date), close: r.close }))
  const up = data.length > 1 && data.at(-1).close >= data[0].close
  const color = up ? '#dc2626' : '#16a34a'

  return (
    <Card className="lg:col-span-2 flex flex-col gap-3">
      <div className="flex justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-gray-900">加權指數走勢</p>
          {hist.data?.isMock && <MockBadge />}
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              aria-pressed={range === r}
              className={`px-3 py-1 rounded-md text-[13px] ${range === r ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      {!data.length ? (
        <p className="text-sm text-gray-400 h-[220px] flex items-center justify-center">{hist.error ? '無法取得資料' : '載入中...'}</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="twiiFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.18} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} width={56}
              tickFormatter={(v) => v.toLocaleString('en-US', { maximumFractionDigits: 0 })} />
            <Tooltip formatter={(v) => [fmtNum(v), '收盤']} labelStyle={{ color: '#6b7280' }} />
            <Area type="monotone" dataKey="close" stroke={color} strokeWidth={2} fill="url(#twiiFill)" />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Card>
  )
}

const INST_ROWS = [['foreign', '外資'], ['trust', '投信'], ['dealer', '自營商']]

function StrengthCard({ score }) {
  const s = calcSentiment(score)
  const dash = Math.round((s.temp / 100) * 314)
  // 全市場三大法人：取最新一天（收盤後才有當天資料，盤中顯示的是前一個交易日）
  const inst = useAsync('market-inst', () => fetchMarketInstitutional(1), { cache: 'mktinst' })
  const day = inst.data?.at(-1)
  const maxAbs = day ? Math.max(...INST_ROWS.map(([k]) => Math.abs(day[k] ?? 0)), 1) : 1

  return (
    <Card className="flex flex-col gap-3.5">
      <p className="text-sm font-bold text-gray-900">市場強弱</p>
      <div className="flex items-center gap-4">
        <svg width="96" height="96" viewBox="0 0 120 120" role="img" aria-label={`市場強弱：${s.label}`}>
          <circle cx="60" cy="60" r="50" fill="none" stroke="#e5e7eb" strokeWidth="12" />
          <circle cx="60" cy="60" r="50" fill="none" stroke={s.color} strokeWidth="12" strokeDasharray={`${dash} 314`}
            strokeLinecap="round" transform="rotate(-90 60 60)" style={{ transition: 'stroke-dasharray .8s ease' }} />
          <text x="60" y="68" textAnchor="middle" fontSize="26" fontWeight="700" fill="#111827">{score === null ? '--' : s.temp}</text>
        </svg>
        <div>
          <p className={`text-lg font-bold ${s.textClass}`}>{s.label}</p>
          <p className="text-xs text-gray-500 mt-1">加權指數 50% ＋ S&amp;P 500 30% ＋ NASDAQ 20%</p>
          {score !== null && <p className={`text-xs mt-0.5 ${changeClass(score)}`}>加權漲跌 {fmtPct(score)}</p>}
        </div>
      </div>
      <div className="border-t border-gray-100 pt-3 flex flex-col gap-2.5">
        <p className="text-xs text-gray-500">三大法人買賣超（億）{day && `・${md(day.date)}`}</p>
        {inst.loading && <p className="text-sm text-gray-400">載入中...</p>}
        {!day && !inst.loading && <p className="text-sm text-gray-400">暫時無法取得</p>}
        {day && INST_ROWS.map(([k, name]) => (
          <div key={k} className="grid grid-cols-[52px_1fr_64px] items-center gap-2 text-[13px]">
            <span>{name}</span>
            <div className="h-2 bg-gray-100 rounded">
              <div className={`h-2 rounded ${day[k] >= 0 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${(Math.abs(day[k] ?? 0) / maxAbs) * 100}%` }} />
            </div>
            <span className={`text-right font-medium ${changeClass(day[k])}`}>{day[k] > 0 ? '+' : ''}{day[k]?.toLocaleString() ?? '--'}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

// 跟新聞情緒走勢並排，放 7 則高度剛好
function NewsCard() {
  const navigate = useNavigate()
  const news = useAsync('home-news-7', () => fetchNews({ limit: 7 }), { cache: 'news' })
  return (
    <Card className="flex flex-col gap-2.5">
      <div className="flex justify-between items-center">
        <p className="text-sm font-bold text-gray-900">今日重點新聞</p>
        <button type="button" onClick={() => navigate('/news')} className="text-xs text-blue-600 hover:text-blue-700">全部新聞</button>
      </div>
      {news.loading && <p className="text-sm text-gray-400">載入中...</p>}
      {news.error && !news.data && <p className="text-sm text-gray-400">暫時無法取得新聞</p>}
      {news.data?.items.map((n) => (
        <button
          key={n.id}
          type="button"
          onClick={() => navigate('/news', { state: { news: n } })}
          className="flex gap-2.5 items-start text-left pb-2 border-b border-gray-100 last:border-0 group"
        >
          {n.tone && <span className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full ${TONE[n.tone].tag}`}>{TONE[n.tone].label}</span>}
          <span className="text-[13px] leading-relaxed text-gray-800 group-hover:text-blue-600">{n.title}</span>
        </button>
      ))}
    </Card>
  )
}

// 漲幅前 5、跌幅前 5 分兩欄（窄螢幕上下排），點股票進個股頁
function MoversCard() {
  const navigate = useNavigate()
  const movers = useAsync('market-movers', () => fetchMarketMovers(5), { cache: 'movers' })
  const d = movers.data
  const list = (title, rows) => (
    <div className="min-w-0">
      <p className="text-xs text-gray-500 mb-1">{title}</p>
      <table className="w-full text-[13px]">
        <tbody>
          {rows.map((m) => (
            <tr key={m.code} onClick={() => navigate(`/stocks?ticker=${m.code}`)} className="border-t border-gray-100 cursor-pointer hover:bg-gray-50">
              <td className="py-2 truncate max-w-0 w-full">{m.name} <span className="text-gray-500">{m.code}</span></td>
              <td className="text-right px-2">{fmtNum(m.price, m.price >= 100 ? 1 : 2)}</td>
              <td className={`text-right font-medium ${changeClass(m.changePct)}`}>{fmtPct(m.changePct, 1)}</td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td className="py-2 text-gray-400">今天沒有</td></tr>}
        </tbody>
      </table>
    </div>
  )
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <p className="text-sm font-bold text-gray-900">漲跌幅排行</p>
        {d?.date && <span className="text-xs text-gray-500">{md(d.date)}・上市股票</span>}
      </div>
      {movers.loading && <p className="text-sm text-gray-400">載入中...</p>}
      {!d && !movers.loading && <p className="text-sm text-gray-400">暫時無法取得</p>}
      {d && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">
          {list('漲幅前 5 名', d.gainers)}
          {list('跌幅前 5 名', d.losers)}
        </div>
      )}
      <p className="text-xs text-gray-500 mt-auto">已排除成交量太小的股票</p>
    </Card>
  )
}

// 版面：指數 KPI → 加權指數走勢｜市場強弱 → 新聞情緒走勢｜今日重點新聞 → 漲跌幅排行｜近期總經事件 → 上市公司月營收
export default function ProHome({ quotes, score }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-4">
        {PRO_KPIS.map((k) => <KpiCard key={k.ticker} label={k.label} quote={quotes[k.ticker]} digits={k.digits} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <IndexTrendCard quote={quotes['^TWII']} />
        <StrengthCard score={score} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SentimentTrendPro lastClose={quotes['^TWII']?.data?.current_price} />
        <NewsCard />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MoversCard />
        <MacroUpcomingCard variant="pro" limit={4} />
      </div>

      <MarketRevenuePro />
    </div>
  )
}
