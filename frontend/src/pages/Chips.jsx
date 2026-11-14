// 法人籌碼頁面：專業模式看三大法人每日買賣超＋股價、外資持股比例、融資餘額與每日明細；新手模式看「大戶在買還是賣」的白話整理
// 資料一次抓 60 天，切換 5／20／60 日只在前端切片，不重打 API
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMode } from '../context/mode'
import { fetchChips } from '../api/stockData'
import { mockStockList, mockStockDetail } from '../data/mockData'
import { getStockName } from '../data/stockNames'
import useAsync from '../hooks/useAsync'
import { changeClass } from '../utils/market'
import { INST_KEYS, fmtLots, actionOf, streakOf, beginnerSummary, foreignPriceSentence, proBullets, md } from '../utils/chipsInsights'
import StockPicker from '../components/stock/StockPicker'
import { MockBadge } from '../components/stock/StockHeader'
import { InstStackChart, ForeignPriceChart, SeriesLineChart } from '../components/chips/ChipsCharts'

const DAY_OPTIONS = [5, 20, 60]
const BEGINNER_DAYS = 20

const TIPS = [
  { title: '連續買比一天買更重要', text: '大戶連續好幾天買，代表他們真的看好；只買一天可能只是短線操作。' },
  { title: '土洋同買最有力', text: '外資（洋）和投信（土）一起買，代表國內外的大型基金看法一致。' },
  { title: '自營商參考就好', text: '自營商很多買賣是為了避險，短線進出多，方向比較不準。' },
]

const Card = ({ className = '', children }) => (
  <div className={`bg-white rounded-xl border border-gray-200 p-4 min-w-0 flex flex-col gap-2.5 ${className}`}>{children}</div>
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

const signed = (v, digits) => `${v > 0 ? '+' : ''}${v.toFixed(digits)}`
// 明細表一律顯示完整張數，不換成「萬張」，欄位才對得齊
const signedInt = (v) => `${v > 0 ? '+' : ''}${v.toLocaleString()}`

function ProView({ all, days }) {
  const rows = all.slice(-days)
  const first = rows[0]
  const last = rows.at(-1)
  const nets = Object.fromEntries(INST_KEYS.map((k) => [k.key, actionOf(rows, k.key).net]))
  const total = nets.foreign + nets.trust + nets.dealer
  // 張 × 1000 股 × 平均股價 → 億元
  const avgClose = rows.reduce((s, r) => s + r.close, 0) / rows.length
  const totalYi = (total * 1000 * avgClose) / 1e8
  // 外資持股比例、融資餘額後端還沒提供時是 undefined，相關卡片整個不顯示
  const hasRatio = last.foreignRatio != null && first.foreignRatio != null
  const hasMargin = last.margin != null && first.margin != null
  const ratioChg = hasRatio ? last.foreignRatio - first.foreignRatio : 0
  const marginChg = hasMargin ? (last.margin / first.margin - 1) * 100 : 0
  const offset = all.length - rows.length

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        {INST_KEYS.map((k) => (
          <Kpi key={k.key} label={`${k.name} ${days} 日`} value={fmtLots(nets[k.key])} sub={streakOf(rows, k.key)} valueClass={changeClass(nets[k.key])} />
        ))}
        <Kpi label="三大法人合計" value={fmtLots(total)} sub={`約 ${totalYi > 0 ? '+' : ''}${totalYi.toLocaleString('en-US', { maximumFractionDigits: 1 })} 億元`} valueClass={changeClass(total)} />
        {hasRatio && <Kpi label="外資持股比例" value={`${last.foreignRatio.toFixed(2)}%`} sub={`${days} 日 ${signed(ratioChg, 2)} 個百分點`} />}
        {hasMargin && <Kpi label="融資餘額" value={fmtLots(last.margin, false)} sub={`${days} 日 ${signed(marginChg, 1)}%`} />}
      </div>

      <Card>
        <div className="flex flex-wrap justify-between items-center gap-2">
          <p className="text-sm font-bold text-gray-900">三大法人每日買賣超（張）與股價</p>
          <div className="flex flex-wrap gap-3.5 text-xs text-gray-600">
            {INST_KEYS.map((k) => (
              <span key={k.key} className="flex items-center gap-1"><span className="w-2.5 h-2.5" style={{ background: k.color }} />{k.name}</span>
            ))}
            <span className="flex items-center gap-1"><span className="w-3.5 h-0.5 bg-gray-900" />收盤價（右軸）</span>
          </div>
        </div>
        <InstStackChart rows={rows} />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {hasRatio && <Card>
          <p className="text-sm font-bold text-gray-900">外資持股比例</p>
          <SeriesLineChart rows={rows} dataKey="foreignRatio" color="#2563eb" format={(v) => `${v.toFixed(2)}%`} />
          <p className="text-[13px] text-gray-700">
            {days} 日前 {first.foreignRatio.toFixed(2)}% → 現在 <b>{last.foreignRatio.toFixed(2)}%</b>（{signed(ratioChg, 2)} 個百分點）
          </p>
        </Card>}
        {hasMargin && <Card>
          <p className="text-sm font-bold text-gray-900">融資餘額（張）</p>
          <SeriesLineChart rows={rows} dataKey="margin" color="#7c3aed" format={(v) => v.toLocaleString()} />
          <p className="text-[13px] text-gray-700">
            融資是散戶借錢買股，增加代表散戶加碼；{days} 日 <b>{signed(marginChg, 1)}%</b>
          </p>
        </Card>}
        <Card className={`bg-slate-50 ${!hasRatio && !hasMargin ? 'lg:col-span-3' : !hasRatio || !hasMargin ? 'lg:col-span-2' : ''}`}>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">重點整理</span>
            <span className="text-xs text-gray-500">依籌碼數字自動整理</span>
          </div>
          {proBullets(rows, days).map((b) => <p key={b} className="text-[13px] leading-relaxed">・{b}</p>)}
          <p className="text-xs text-gray-500 mt-auto">AI 分析開發中・非投資建議</p>
        </Card>
      </div>

      <Card>
        <p className="text-sm font-bold text-gray-900">每日明細</p>
        <div className="overflow-auto max-h-[420px]">
          <table className="w-full text-[13px] min-w-[640px]">
            <thead className="sticky top-0 bg-white">
              <tr className="text-gray-500">
                <th className="font-normal text-left py-2">日期</th>
                {INST_KEYS.map((k) => <th key={k.key} className="font-normal text-right">{k.name}</th>)}
                <th className="font-normal text-right">三大合計</th>
                <th className="font-normal text-right">收盤</th>
                <th className="font-normal text-right">漲跌</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => ({ r, prev: all[offset + i - 1] })).reverse().map(({ r, prev }) => {
                const s = r.foreign + r.trust + r.dealer
                const chg = prev ? r.close - prev.close : null
                return (
                  <tr key={r.date} className="border-t border-gray-100">
                    <td className="py-2">{md(r.date)}</td>
                    {INST_KEYS.map((k) => <td key={k.key} className={`text-right ${changeClass(r[k.key])}`}>{signedInt(r[k.key])}</td>)}
                    <td className={`text-right font-bold ${changeClass(s)}`}>{signedInt(s)}</td>
                    <td className="text-right">{r.close.toLocaleString()}</td>
                    <td className={`text-right ${changeClass(chg)}`}>{chg == null ? '--' : signed(chg, 2)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

const WHO_BG = { 1: 'bg-red-50', '-1': 'bg-emerald-50', 0: 'bg-gray-50' }
const WHO_FG = { 1: 'text-red-600', '-1': 'text-emerald-600', 0: 'text-gray-600' }

function BeginnerView({ all }) {
  const rows = all.slice(-BEGINNER_DAYS)
  const s = beginnerSummary(rows, BEGINNER_DAYS)

  return (
    <div className="flex flex-col gap-4 max-w-[1180px]">
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">重點</span>
          <p className="text-base font-bold text-gray-900">大戶最近在買還是賣？</p>
        </div>
        <p className="text-[17px] leading-relaxed">
          {s.lead}<b className={WHO_FG[s.who.dir]}>{s.who.text}</b>{s.rest}
        </p>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
          {INST_KEYS.map((k) => {
            const a = actionOf(rows, k.key)
            return (
              <div key={k.key} className={`flex flex-col gap-2 p-4 rounded-xl ${WHO_BG[a.dir]}`}>
                <div className="flex justify-between items-baseline">
                  <span className="text-[15px] font-bold">{k.name}</span>
                  <span className={`text-[22px] font-bold ${WHO_FG[a.dir]}`}>{a.word}</span>
                </div>
                <span className="text-xs text-gray-600">{k.desc}</span>
                <span className="text-sm">最近 {BEGINNER_DAYS} 天{a.net >= 0 ? '買' : '賣'}了約 {fmtLots(Math.abs(a.net), false)}</span>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-500">最近 10 天（紅＝買、綠＝賣）</span>
                  <div className="flex gap-1" role="img" aria-label={`${k.name}最近 10 天：${rows.slice(-10).map((r) => (r[k.key] > 0 ? '買' : r[k.key] < 0 ? '賣' : '平')).join('')}`}>
                    {rows.slice(-10).map((r) => (
                      <span key={r.date} title={`${md(r.date)} ${fmtLots(r[k.key])}`}
                        className={`w-4 h-4 rounded ${r[k.key] > 0 ? 'bg-red-400' : r[k.key] < 0 ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-2.5">
        <p className="text-base font-bold text-gray-900">外資每天買多少、股價怎麼走？</p>
        <ForeignPriceChart rows={rows} />
        <div className="flex gap-4 text-xs text-gray-600">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-600" />外資買</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-600" />外資賣</span>
          <span className="flex items-center gap-1"><span className="w-3.5 h-0.5 bg-gray-900" />股價（右軸）</span>
        </div>
        <p className="text-sm text-gray-700">{foreignPriceSentence(rows)}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3">
        <p className="text-base font-bold text-gray-900">怎麼看籌碼？</p>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
          {TIPS.map((t) => (
            <div key={t.title} className="p-3.5 rounded-lg bg-gray-50">
              <p className="font-bold text-sm mb-1.5">{t.title}</p>
              <p className="text-[13px] text-gray-600 leading-relaxed">{t.text}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500">大戶買進不代表股價一定會漲，非投資建議。</p>
      </div>
    </div>
  )
}

export default function Chips() {
  const { isPro } = useMode()
  const [searchParams] = useSearchParams()
  const symbol = searchParams.get('ticker') || mockStockList[0].symbol
  const name = mockStockList.find((s) => s.symbol === symbol)?.name || getStockName(symbol) || symbol
  const [days, setDays] = useState(20)
  const chips = useAsync(symbol, () => fetchChips(symbol, mockStockDetail[symbol]?.close))
  const all = chips.data?.data

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-gray-900">法人籌碼</h1>
        <span className="text-base text-gray-700">{name} <span className="text-gray-500">{symbol}</span></span>
        <MockBadge show={chips.data?.isMock} />
        <div className="flex-1" />
        {isPro && (
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
            {DAY_OPTIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                aria-pressed={days === d}
                className={`px-3 py-1 rounded-md text-[13px] ${days === d ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'}`}
              >
                {d} 日
              </button>
            ))}
          </div>
        )}
      </div>
      <StockPicker symbol={symbol} />
      {chips.loading && <p className="text-sm text-gray-400">載入中...</p>}
      {chips.error && <p className="text-sm text-gray-400">無法取得籌碼資料</p>}
      {all?.length > 0 && (isPro ? <ProView all={all} days={days} /> : <BeginnerView all={all} />)}
    </div>
  )
}
