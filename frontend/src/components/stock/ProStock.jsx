// 個股・專業模式（草稿 A）：KPI 列 → 股價＋成交量、AI 分析 → 國際同業走勢 → 財報、籌碼 → 新聞、總經、法人績效
import { useNavigate } from 'react-router-dom'
import { changeClass, fmtPct, fmtUnit } from '../../utils/market'
import { buildProsCons, streak } from '../../utils/stockInsights'
import { toPctRows } from '../../utils/series'
import { PriceVolumeChart, PeerChart, EpsBarChart, InstitutionalBarChart } from './StockCharts'
import { MockBadge } from './StockHeader'
import MacroUpcomingCard from '../macro/MacroUpcomingCard'

const Card = ({ className = '', children }) => (
  <div className={`bg-white rounded-xl border border-gray-200 p-4 min-w-0 flex flex-col gap-2.5 ${className}`}>{children}</div>
)

const CardTitle = ({ children, mock, link }) => (
  <div className="flex justify-between items-center gap-2">
    <div className="flex items-center gap-2">
      <p className="text-sm font-bold text-gray-900">{children}</p>
      <MockBadge show={!!mock} />
    </div>
    {link}
  </div>
)

const Loading = ({ h = 150 }) => <div className="flex items-center justify-center text-sm text-gray-400" style={{ height: h }}>載入中...</div>

function Kpi({ label, value, sub, valueClass = 'text-gray-900' }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 min-w-0">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-[20px] font-bold mt-0.5 ${valueClass}`}>{value ?? '--'}</p>
      <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
    </div>
  )
}

export default function ProStock({ d }) {
  const navigate = useNavigate()
  const f = d.fund.data?.data
  const inst = d.inst.data?.data
  const perf = d.perf.data?.data
  const history = d.history.data?.data
  const peerSeries = d.peers.data?.data?.series
  const avgSent = d.news.length ? d.news.reduce((s, n) => s + n.sentiment, 0) / d.news.length : null
  const { pros, cons } = buildProsCons(f, inst, avgSent)
  const foreignStreak = inst ? streak(inst.map((r) => r.foreign)) : 0
  const foreign10 = inst ? inst.reduce((s, r) => s + r.foreign, 0) : 0
  const lastPct = peerSeries ? toPctRows(peerSeries).at(-1) : null

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        <Kpi label="本益比" value={f ? fmtUnit(f.pe) : null} sub={f?.peerPe != null ? `同業平均 ${f.peerPe}` : ''} />
        <Kpi label="EPS（近四季）" value={f?.eps4q} sub={f ? `年增 ${fmtPct(f.epsYoY, 0)}` : ''} />
        <Kpi label="營收年增率" value={f ? fmtPct(f.revYoY, 1) : null} sub={f?.revStreak ? `連 ${f.revStreak} 月正成長` : ''} valueClass={f ? changeClass(f.revYoY) : ''} />
        {/* 金融股沒有毛利率，改顯示 ROE */}
        {f && f.grossMargin == null
          ? <Kpi label="ROE（近四季）" value={fmtUnit(f.roe, '%')} sub="股東權益報酬率" />
          : <Kpi label="毛利率" value={f ? `${f.grossMargin}%` : null} sub={f?.grossMarginChg != null ? `較上季 ${f.grossMarginChg > 0 ? '+' : ''}${f.grossMarginChg}pt` : ''} />}
        <Kpi label="外資動向" value={inst ? (foreignStreak > 0 ? `連買 ${foreignStreak} 日` : foreignStreak < 0 ? `連賣 ${-foreignStreak} 日` : '買賣互見') : null}
          sub={inst ? `10 日 ${foreign10 > 0 ? '+' : ''}${foreign10.toLocaleString()} 張` : ''} valueClass={changeClass(foreignStreak)} />
        <Kpi label="新聞情緒" value={avgSent != null ? avgSent.toFixed(2) : '—'} sub={`近期 ${d.news.length} 則`} valueClass={avgSent == null ? 'text-gray-400' : avgSent >= 0.7 ? 'text-red-500' : avgSent < 0.5 ? 'text-emerald-500' : ''} />
      </div>
      {(d.fund.data?.isMock || d.inst.data?.isMock) && <p className="text-xs text-gray-500 -mt-2">財報、籌碼為示意資料，待後端 API 完成</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardTitle mock={d.history.data?.isMock}>股價與成交量</CardTitle>
          <div className="flex gap-3 text-xs text-gray-600">
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-600" />收盤價</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-orange-600" />20 日均線</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-slate-300" />成交量</span>
          </div>
          {history ? <PriceVolumeChart history={history} /> : <Loading h={260} />}
        </Card>

        <Card className="bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">重點整理</span>
            <span className="text-xs text-gray-500">依財報、籌碼、新聞自動整理</span>
          </div>
          <p className="text-xs font-bold text-red-800 mt-1">正面因素</p>
          {pros.length ? pros.map((p) => <p key={p} className="text-[13px] leading-relaxed">・{p}</p>) : <p className="text-[13px] text-gray-400">—</p>}
          <p className="text-xs font-bold text-orange-800 mt-1">風險因素</p>
          {cons.length ? cons.map((c) => <p key={c} className="text-[13px] leading-relaxed">・{c}</p>) : <p className="text-[13px] text-gray-400">—</p>}
          <p className="text-xs text-gray-500 mt-auto pt-2">AI 分析開發中・非投資建議</p>
        </Card>
      </div>

      <Card className="p-5">
        <CardTitle mock={d.peers.data?.isMock} link={<button type="button" onClick={() => navigate(`/peers?ticker=${d.symbol}`)} className="text-xs text-blue-600">調整比較對象</button>}>
          國際同業股價走勢（漲跌幅 %）
        </CardTitle>
        <p className="text-xs text-gray-500 -mt-1">以區間第一天為 0% 起點・與上方區間（{d.range}）連動・滑鼠移到圖上看當天股價</p>
        {!d.peerLines.length || d.peerLines.length === 1 ? (
          <p className="text-sm text-gray-400 py-8 text-center">這支股票的產業還沒有建立國際同業名單</p>
        ) : (
          <div className="flex flex-wrap gap-5">
            <div className="flex-[999_1_520px] min-w-0">
              {peerSeries ? <PeerChart series={peerSeries} lines={d.peerLines} /> : <Loading h={260} />}
            </div>
            <div className="flex-[1_1_240px] min-w-0 flex flex-col gap-2">
              <p className="text-xs text-gray-500">區間漲跌</p>
              {d.peerLines.map((l, i) => (
                <div key={l.ticker} className={`grid grid-cols-[14px_1fr_auto] gap-2.5 items-center px-3 py-2 rounded-lg ${i === 0 ? 'bg-blue-50' : 'bg-gray-50'}`}>
                  <span className="h-[3px] rounded" style={{ background: l.color }} />
                  <span className={`text-sm ${i === 0 ? 'font-bold' : ''}`}>{l.name}</span>
                  <span className={`text-[15px] font-bold ${changeClass(lastPct?.[l.ticker])}`}>{lastPct ? fmtPct(lastPct[l.ticker], 1) : '--'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardTitle mock={d.fund.data?.isMock} link={<button type="button" onClick={() => navigate(`/financials?ticker=${d.symbol}`)} className="text-xs text-blue-600">財報分析</button>}>財報摘要・每季 EPS</CardTitle>
          {f ? <EpsBarChart quarters={f.quarters} values={f.quarterlyEps} /> : <Loading />}
          {f && (
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div><p className="text-gray-500">營收年增</p><p className={`font-bold ${changeClass(f.revYoY)}`}>{fmtPct(f.revYoY, 1)}</p></div>
              <div><p className="text-gray-500">營業利益率</p><p className="font-bold">{fmtUnit(f.opMargin, '%')}</p></div>
              <div><p className="text-gray-500">ROE</p><p className="font-bold">{fmtUnit(f.roe, '%')}</p></div>
            </div>
          )}
        </Card>
        <Card>
          <CardTitle mock={d.inst.data?.isMock}>法人籌碼・近 10 日外資</CardTitle>
          {inst ? <InstitutionalBarChart rows={inst} /> : <Loading />}
          {inst && (
            <div className="grid grid-cols-3 gap-2 text-xs">
              {[['外資', 'foreign'], ['投信', 'trust'], ['自營商', 'dealer']].map(([label, key]) => {
                const v = inst.reduce((s, r) => s + r[key], 0)
                return <div key={key}><p className="text-gray-500">{label} 10 日</p><p className={`font-bold ${changeClass(v)}`}>{v > 0 ? '+' : ''}{v.toLocaleString()} 張</p></div>
              })}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardTitle link={<button type="button" onClick={() => navigate('/news')} className="text-xs text-blue-600">全部新聞</button>}>相關新聞・情緒</CardTitle>
          {d.news.length === 0 && <p className="text-sm text-gray-400">尚無相關新聞</p>}
          {d.news.slice(0, 4).map((n) => (
            <button key={n.id} type="button" onClick={() => navigate('/news', { state: { selectedId: n.id } })}
              className="grid grid-cols-[1fr_44px] gap-2.5 items-center text-left pb-2 border-b border-gray-100 last:border-0 group">
              <span className="text-[13px] leading-relaxed group-hover:text-blue-600 line-clamp-2">{n.title}</span>
              <span className={`text-right text-[13px] font-bold ${n.sentiment >= 0.7 ? 'text-red-500' : n.sentiment < 0.5 ? 'text-emerald-500' : 'text-gray-600'}`}>{n.sentiment.toFixed(2)}</span>
            </button>
          ))}
        </Card>

        <MacroUpcomingCard variant="pro" limit={3} />

        <Card>
          <CardTitle mock={d.perf.data?.isMock}>法人買超後績效（本股）</CardTitle>
          {!perf ? <Loading h={100} /> : (
            <table className="w-full text-[13px]">
              <thead><tr className="text-gray-500"><th className="font-normal text-left py-1.5">法人</th><th className="font-normal text-right">5 日勝率</th><th className="font-normal text-right">20 日均報酬</th></tr></thead>
              <tbody>
                {perf.map((p) => (
                  <tr key={p.name} className="border-t border-gray-100">
                    <td className="py-2">{p.name}</td>
                    <td className="text-right">{p.winRate5d}%</td>
                    <td className={`text-right font-medium ${changeClass(p.avgReturn20d)}`}>{fmtPct(p.avgReturn20d, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="text-xs text-gray-500">統計區間：近 3 年</p>
        </Card>
      </div>
    </div>
  )
}
