// 個股・新手模式：AI 健檢燈號（附名詞解釋）→ 股價走勢一句話 → 大戶動向、跟國外對手比、這週要注意 → 白話新聞
import { useNavigate } from 'react-router-dom'
import { changeClass, fmtPct, fmtNum } from '../../utils/market'
import { buildChecks, buildSummary } from '../../utils/stockInsights'
import { toPctRows } from '../../utils/series'
import { SimplePriceChart, PeerChart } from './StockCharts'
import { RangeTabs, MockBadge } from './StockHeader'
import { RANGES_BEGINNER } from './constants'
import MacroUpcomingCard from '../macro/MacroUpcomingCard'
import TermTip from '../TermTip'

const RANGE_WORD = { '1M': '1 個月', '3M': '3 個月', '6M': '6 個月', '1Y': '1 年' }

const INST_LABELS = [
  ['foreign', '外資（國外大型基金）'],
  ['trust', '投信（國內基金）'],
  ['dealer', '自營商（券商自己）'],
]

function instWord(v) {
  if (v > 1000) return '買進'
  if (v > 0) return '小買'
  if (v < -1000) return '賣出'
  if (v < 0) return '小賣'
  return '持平'
}

export default function BeginnerStock({ d }) {
  const navigate = useNavigate()
  const f = d.fund.data?.data
  const inst = d.inst.data?.data
  const history = d.history.data?.data
  const peerSeries = d.peers.data?.data?.series
  const checks = buildChecks(f, inst)
  const summary = buildSummary(checks)

  // 新手版只比公司和 S&P 500，不放費城半導體
  const lines = d.peerLines.filter((l) => !l.ticker.startsWith('^') || l.ticker === '^GSPC')
  const series = peerSeries?.filter((s) => lines.some((l) => l.ticker === s.ticker))
  const lastPct = series ? toPctRows(series).at(-1) : null
  const base = lines[0]
  const others = lines.slice(1).filter((l) => lastPct?.[l.ticker] != null)
  const beatAll = lastPct && others.every((l) => lastPct[base.ticker] >= lastPct[l.ticker])

  const first = history?.[0]?.close
  const last = history?.at(-1)?.close
  const changePct = first ? ((last / first) - 1) * 100 : null

  return (
    <div className="flex flex-col gap-4 max-w-[1180px]">
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">健檢</span>
          <p className="text-base font-bold text-gray-900">這家公司現在怎麼樣？</p>
          <MockBadge show={d.fund.data?.isMock || d.inst.data?.isMock} />
        </div>
        <p className="text-[17px] leading-relaxed">{summary || '資料整理中...'}</p>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
          {checks.map((c) => (
            <div key={c.id} className={`flex flex-col gap-2 p-3.5 rounded-xl ${c.light.className}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">{c.name}</span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full bg-white ${c.light.tagClass}`}>{c.light.label}</span>
              </div>
              <span className="text-[13px] text-gray-700 leading-relaxed">{c.plain}</span>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-600">{c.metric}</span>
                <TermTip text={c.term} />
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500">依財報和籌碼數字自動判斷，AI 分析開發中・非投資建議</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-2.5">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <p className="text-base font-bold text-gray-900">最近 {RANGE_WORD[d.range]}的股價</p>
            <MockBadge show={d.history.data?.isMock} />
          </div>
          <RangeTabs value={d.range} onChange={d.setRange} options={RANGES_BEGINNER} />
        </div>
        {history ? <SimplePriceChart history={history} /> : <div className="h-[200px] flex items-center justify-center text-sm text-gray-400">載入中...</div>}
        {changePct != null && (
          <p className="text-sm text-gray-700">
            {RANGE_WORD[d.range]}前 {fmtNum(first)} 元 → 現在 {fmtNum(last)} 元，
            <b className={changeClass(changePct)}>{changePct >= 0 ? '上漲' : '下跌'} {Math.abs(changePct).toFixed(1)}%</b>
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-base font-bold text-gray-900">大戶在做什麼？</p>
            <MockBadge show={d.inst.data?.isMock} />
          </div>
          {!inst && <p className="text-sm text-gray-400">載入中...</p>}
          {inst && INST_LABELS.map(([key, label]) => {
            const v = inst.reduce((s, r) => s + r[key], 0)
            return (
              <div key={key} className="flex flex-col gap-0.5">
                <div className="flex justify-between text-sm">
                  <span>{label}</span>
                  <span className={`font-bold ${changeClass(v)}`}>{instWord(v)}</span>
                </div>
                <span className="text-xs text-gray-600">最近 10 天{v >= 0 ? '買了' : '賣了'}約 {Math.abs(v).toLocaleString()} 張</span>
              </div>
            )
          })}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-2.5 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-base font-bold text-gray-900">跟國外對手比</p>
            <MockBadge show={d.peers.data?.isMock} />
          </div>
          {lines.length <= 1 ? (
            <p className="text-sm text-gray-400">這支股票的產業還沒有國外對手名單</p>
          ) : (
            <>
              <p className="text-xs text-gray-500">近 {RANGE_WORD[d.range]}漲跌幅（從同一起點出發）</p>
              {series ? <PeerChart series={series} lines={lines} height={140} showAxis={false} /> : <div className="h-[140px] flex items-center justify-center text-sm text-gray-400">載入中...</div>}
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                {lines.map((l, i) => (
                  <div key={l.ticker} className="flex items-center gap-1.5 text-[13px]">
                    <span className="w-3 h-[3px] rounded" style={{ background: l.color }} />
                    <span className={i === 0 ? 'font-bold' : ''}>{l.name}</span>
                    <span className={`ml-auto font-bold ${changeClass(lastPct?.[l.ticker])}`}>{lastPct ? fmtPct(lastPct[l.ticker], 1) : '--'}</span>
                  </div>
                ))}
              </div>
              {lastPct && (
                <p className="text-[13px] text-gray-700">
                  {beatAll ? `${base.name}漲得最多，贏過國外對手，也贏過美國大盤（S&P 500）。` : `${base.name}沒有全部贏過，可以看看哪家表現比較好。`}
                </p>
              )}
            </>
          )}
        </div>

        <MacroUpcomingCard variant="beginner" limit={2} title="這週可能影響它的事" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3">
        <p className="text-base font-bold text-gray-900">最近的新聞</p>
        {d.news.length === 0 && <p className="text-sm text-gray-400">尚無相關新聞</p>}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3">
          {d.news.slice(0, 3).map((n) => {
            const good = n.sentiment >= 0.6
            return (
              <button key={n.id} type="button" onClick={() => navigate('/news', { state: { selectedId: n.id } })}
                className="flex flex-col gap-2 text-left p-3.5 border border-gray-200 rounded-lg hover:border-blue-300">
                <span className={`self-start text-[11px] px-2 py-0.5 rounded-full ${good ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>{good ? '利多' : '利空'}</span>
                <span className="text-sm font-medium leading-relaxed">{n.title}</span>
                <span className="text-[13px] text-gray-600 leading-relaxed line-clamp-2">{n.summary}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
