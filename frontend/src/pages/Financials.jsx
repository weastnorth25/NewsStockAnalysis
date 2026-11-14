// 財報分析頁面：專業模式看估值、月營收、三率、每季 EPS 與完整財報表；新手模式看健檢燈號與白話說明
import { useSearchParams } from 'react-router-dom'
import { useMode } from '../context/mode'
import { fetchFundamentals } from '../api/stockData'
import { mockStockList } from '../data/mockData'
import { getStockName } from '../data/stockNames'
import useAsync from '../hooks/useAsync'
import { buildChecks, buildSummary, buildProsCons } from '../utils/stockInsights'
import { nextMonthlyRevenue, nextQuarterlyReport } from '../utils/reportDates'
import { changeClass, fmtPct, fmtUnit } from '../utils/market'
import StockPicker from '../components/stock/StockPicker'
import { MonthlyRevenueChart, MarginTrendChart, EpsBarChart } from '../components/stock/StockCharts'
import { MockBadge } from '../components/stock/StockHeader'
import { MARGIN_LINES } from '../components/stock/constants'
import TermTip from '../components/TermTip'

const TERMS = [
  { name: 'EPS（每股盈餘）', text: '公司賺的錢平均分給每一股，代表每一張股票幫你賺了多少。' },
  { name: '毛利率', text: '營收扣掉直接成本後剩下的比例，越高代表產品越有競爭力、越不怕削價。' },
  { name: '營業利益率', text: '再扣掉管銷、研發等營運費用後剩下的比例，代表本業賺錢的能力。' },
  { name: '本益比', text: '股價除以每股盈餘，代表用現在的獲利要幾年回本；越高代表市場越看好，也越貴。' },
  { name: 'ROE（股東權益報酬率）', text: '公司用股東的錢一年能賺多少比例，巴菲特很重視的指標，通常 15% 以上算優秀。' },
  { name: '營收年增率', text: '和去年同一個月比，營收增加或減少多少，可以避開季節性的影響。' },
]

const Card = ({ className = '', children }) => (
  <div className={`bg-white rounded-xl border border-gray-200 p-5 min-w-0 flex flex-col gap-3 ${className}`}>{children}</div>
)

function Kpi({ label, value, sub, valueClass = 'text-gray-900' }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 min-w-0">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-[20px] font-bold mt-0.5 ${valueClass}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
    </div>
  )
}

function ReportDates() {
  const m = nextMonthlyRevenue()
  const q = nextQuarterlyReport()
  return (
    <div className="flex flex-wrap gap-2 text-[13px]">
      {[m, q].map((r) => (
        <span key={r.label} className="px-3 py-1.5 rounded-full bg-white border border-gray-200">
          下次公布：<b>{r.label}</b> {r.date} 前
          <span className="text-gray-500">（{r.daysLeft === 0 ? '今天' : `還有 ${r.daysLeft} 天`}）</span>
        </span>
      ))}
    </div>
  )
}

function ProView({ f }) {
  const { pros, cons } = buildProsCons(f, null, null)
  const latestMonth = f.monthly.at(-1)
  // 金融股沒有毛利率、營益率（後端回 null），三率圖改顯示說明
  const hasMargins = f.quarterly.some((q) => q.grossMargin != null)
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        {/* peerPe 是 null（上櫃股或算不出同業）時不顯示同業比較 */}
        <Kpi label="本益比" value={fmtUnit(f.pe)} sub={f.peerPe != null ? `同業平均 ${f.peerPe}` : '股價 ÷ 每股盈餘'}
          valueClass={f.pe != null && f.peerPe != null && f.pe > f.peerPe * 1.1 ? 'text-orange-700' : 'text-gray-900'} />
        <Kpi label="股價淨值比" value={fmtUnit(f.pb)} sub="股價 ÷ 每股淨值" />
        <Kpi label="殖利率" value={fmtUnit(f.dividendYield, '%')} sub="近一年股利 ÷ 股價" />
        <Kpi label="EPS（近四季）" value={fmtUnit(f.eps4q)} sub={`年增 ${fmtPct(f.epsYoY, 0)}`} />
        <Kpi label="ROE（近四季）" value={fmtUnit(f.roe, '%')} sub="股東權益報酬率" />
        <Kpi label="最新月營收年增" value={fmtPct(latestMonth.yoy, 1)} sub={`${latestMonth.month}`} valueClass={changeClass(latestMonth.yoy)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <div className="flex items-center gap-3 text-xs text-gray-600">
            <p className="text-sm font-bold text-gray-900 mr-1">月營收（近 12 個月）</p>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-blue-200" />營收（億，左軸）</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-red-600" />年增率（右軸）</span>
          </div>
          <MonthlyRevenueChart monthly={f.monthly} />
        </Card>
        <Card className="bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">重點整理</span>
            <span className="text-xs text-gray-500">依財報數字自動整理</span>
          </div>
          <p className="text-xs font-bold text-red-800">正面因素</p>
          {pros.length ? pros.map((p) => <p key={p} className="text-[13px] leading-relaxed">・{p}</p>) : <p className="text-[13px] text-gray-400">—</p>}
          <p className="text-xs font-bold text-orange-800">風險因素</p>
          {cons.length ? cons.map((c) => <p key={c} className="text-[13px] leading-relaxed">・{c}</p>) : <p className="text-[13px] text-gray-400">—</p>}
          <p className="text-xs text-gray-500 mt-auto pt-2">AI 分析開發中・非投資建議</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center gap-3 text-xs text-gray-600 flex-wrap">
            <p className="text-sm font-bold text-gray-900 mr-1">三率走勢</p>
            {hasMargins && MARGIN_LINES.map((m) => <span key={m.key} className="flex items-center gap-1"><span className="w-3 h-0.5" style={{ background: m.color }} />{m.label}</span>)}
          </div>
          {hasMargins
            ? <MarginTrendChart quarterly={f.quarterly} />
            : <p className="text-sm text-gray-500 leading-relaxed h-[220px] flex items-center justify-center text-center px-6">金融業的收入是利息和手續費，沒有「毛利率」「營業利益率」，<br />可以改看每季 EPS 和下方財報表的 ROE。</p>}
        </Card>
        <Card>
          <p className="text-sm font-bold text-gray-900">每季 EPS（元）</p>
          <EpsBarChart quarters={f.quarters} values={f.quarterlyEps} height={220} />
        </Card>
      </div>

      <Card>
        <p className="text-sm font-bold text-gray-900">每季財報</p>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[760px]">
            <thead>
              <tr className="text-gray-500">
                <th className="font-normal text-left py-2 w-32">項目</th>
                {f.quarterly.map((q) => <th key={q.q} className="font-normal text-right">{q.q}</th>)}
              </tr>
            </thead>
            <tbody>
              {[
                ['營收（億）', (q) => q.revenue?.toLocaleString() ?? '--'],
                ['毛利率', (q) => fmtUnit(q.grossMargin, '%')],
                ['營業利益率', (q) => fmtUnit(q.opMargin, '%')],
                ['淨利率', (q) => fmtUnit(q.netMargin, '%')],
                ['稅後淨利（億）', (q) => q.netIncome?.toLocaleString() ?? '--'],
                ['EPS（元）', (q) => fmtUnit(q.eps)],
                ['ROE（單季）', (q) => fmtUnit(q.roe, '%')],
              ].map(([label, cell]) => (
                <tr key={label} className="border-t border-gray-100">
                  <td className="py-2.5 text-gray-700">{label}</td>
                  {f.quarterly.map((q, i) => (
                    <td key={q.q} className={`text-right ${i === f.quarterly.length - 1 ? 'font-bold text-gray-900' : 'text-gray-700'}`}>{cell(q)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function BeginnerView({ f, name }) {
  const checks = buildChecks(f, null)
  const growMonths = f.monthly.filter((m) => m.yoy > 0).length
  const latest = f.monthly.at(-1)
  const lastEps = f.quarterlyEps.at(-1)
  const yearAgoEps = f.quarterlyEps.at(-5)
  const epsChange = yearAgoEps ? ((lastEps / yearAgoEps) - 1) * 100 : null

  return (
    <div className="flex flex-col gap-4 max-w-[1180px]">
      <Card className="p-6">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">健檢</span>
          <p className="text-base font-bold text-gray-900">{name} 的財報健康嗎？</p>
        </div>
        <p className="text-[17px] leading-relaxed">{buildSummary(checks)}</p>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
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
        <p className="text-xs text-gray-500">依財報數字自動判斷，AI 分析開發中・非投資建議</p>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <p className="text-base font-bold text-gray-900">每個月賣了多少？（營收，億元）</p>
          <MonthlyRevenueChart monthly={f.monthly} height={200} showYoY={false} />
          <p className="text-sm text-gray-700 leading-relaxed">
            最近 12 個月，有 <b>{growMonths} 個月</b>比去年同一個月賣得多。
            最新的 {Number(latest.month.slice(5, 7))} 月營收 {latest.revenue.toLocaleString()} 億，
            比去年同期<b className={changeClass(latest.yoy)}>{latest.yoy >= 0 ? '多' : '少'} {Math.abs(latest.yoy)}%</b>。
          </p>
        </Card>
        <Card>
          <p className="text-base font-bold text-gray-900">每一股幫你賺多少？（EPS，元）</p>
          <EpsBarChart quarters={f.quarters} values={f.quarterlyEps} height={200} />
          {epsChange != null && (
            <p className="text-sm text-gray-700 leading-relaxed">
              最近一季每股賺 <b>{lastEps} 元</b>，比一年前的同一季
              <b className={changeClass(epsChange)}>{epsChange >= 0 ? '多' : '少'} {Math.abs(epsChange).toFixed(0)}%</b>。
            </p>
          )}
        </Card>
      </div>

      <Card>
        <p className="text-base font-bold text-gray-900">財報名詞小教室</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          {TERMS.map((t) => (
            <div key={t.name}>
              <p className="text-sm font-bold text-gray-900">{t.name}</p>
              <p className="text-[13px] text-gray-600 leading-relaxed">{t.text}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

export default function Financials() {
  const { isPro } = useMode()
  const [searchParams] = useSearchParams()
  const symbol = searchParams.get('ticker') || mockStockList[0].symbol
  const name = mockStockList.find((s) => s.symbol === symbol)?.name || getStockName(symbol) || symbol
  const fund = useAsync(symbol, () => fetchFundamentals(symbol))
  const f = fund.data?.data

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-gray-900">財報分析</h1>
        <span className="text-base text-gray-700">{name} <span className="text-gray-500">{symbol}</span></span>
        <MockBadge show={fund.data?.isMock} />
        <div className="flex-1" />
        <ReportDates />
      </div>
      <StockPicker symbol={symbol} />
      {fund.loading && <p className="text-sm text-gray-400">載入中...</p>}
      {fund.error && <p className="text-sm text-gray-400">無法取得財報資料</p>}
      {f && (isPro ? <ProView f={f} /> : <BeginnerView f={f} name={name} />)}
    </div>
  )
}
