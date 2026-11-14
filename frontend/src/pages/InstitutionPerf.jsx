// 法人績效頁面：法人出現「連續買超 3 日」訊號後，持有 N 天的股價表現（近 3 年回測）
// 專業模式看勝率、平均／超額報酬、報酬分布與三大法人比較；新手模式用「10 次有幾次賺錢」白話呈現
// 回測條件先固定，統計由 utils/perfStats.js 從每一次訊號算出來
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMode } from '../context/mode'
import { fetchInstitutionalPerf } from '../api/stockData'
import { mockStockList } from '../data/mockData'
import { getStockName } from '../data/stockNames'
import useAsync from '../hooks/useAsync'
import { changeClass, fmtPct } from '../utils/market'
import { INST_KEYS, md } from '../utils/chipsInsights'
import { allStats } from '../utils/perfStats'
import StockPicker from '../components/stock/StockPicker'
import { MockBadge } from '../components/stock/StockHeader'
import { HorizonChart, DistChart } from '../components/chips/PerfCharts'

const TIPS = [
  { title: '過去不代表未來', text: '這是用歷史資料統計的，市場變了結果也可能不一樣。' },
  { title: '次數太少要小心', text: '統計次數少於 20 次時，結果可能只是運氣。' },
  { title: '也要看大盤', text: '大盤一起漲的時候，跟誰買都容易賺，要比大盤多才算真的有用。' },
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

// 報酬格式：null 代表還沒滿 N 天
const ret = (v) => (v == null ? '進行中' : fmtPct(v, 1))
const retClass = (v) => (v == null ? 'text-gray-400' : changeClass(v))

function ProView({ stats, signal, years }) {
  const [who, setWho] = useState('foreign')
  const s = stats.find((x) => x.investor === who)
  const h5 = s.at(5)
  const h20 = s.at(20)

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <p className="basis-full text-xs text-gray-500">回測條件：法人出現「買超訊號」後，持有 N 天的股價表現</p>
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-gray-700">法人</span>
          <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
            {INST_KEYS.map((k) => (
              <button
                key={k.key}
                type="button"
                onClick={() => setWho(k.key)}
                aria-pressed={who === k.key}
                className={`px-3 py-1 rounded-md text-[13px] ${who === k.key ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'}`}
              >
                {k.name}
              </button>
            ))}
          </div>
        </div>
        <span className="text-[13px] text-gray-700">訊號 <b>{signal}</b>（第 3 天收盤買進）</span>
        <span className="text-[13px] text-gray-700">期間 <b>近 {years} 年</b></span>
        <span className="text-[13px] text-gray-700">比較基準 <b>加權指數</b></span>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        <Kpi label="訊號次數" value={`${s.signals} 次`} sub={`近 ${years} 年`} />
        <Kpi label="5 日勝率" value={`${h5.winRate}%`} sub="買進後 5 天上漲的比例" />
        <Kpi label="20 日勝率" value={`${h20.winRate}%`} sub="買進後 20 天上漲的比例" />
        <Kpi label="20 日平均報酬" value={fmtPct(h20.avgReturn, 1)} sub={`同期大盤 ${fmtPct(h20.market, 1)}`} valueClass={changeClass(h20.avgReturn)} />
        <Kpi label="超額報酬" value={fmtPct(h20.excess, 1)} sub="平均報酬 − 大盤" valueClass={changeClass(h20.excess)} />
        <Kpi label="20 日最大虧損" value={s.maxLoss20 ? fmtPct(s.maxLoss20.value, 1) : '--'}
          sub={s.maxLoss20 ? `${s.maxLoss20.date.slice(0, 7).replace('-', '/')} 那次` : ''} valueClass={changeClass(s.maxLoss20?.value)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <div className="flex flex-wrap justify-between items-center gap-2">
            <p className="text-sm font-bold text-gray-900">持有天數 vs 勝率、平均報酬</p>
            <div className="flex gap-3 text-xs text-gray-600">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-blue-200" />勝率（左軸）</span>
              <span className="flex items-center gap-1"><span className="w-3.5 h-0.5 bg-red-600" />平均報酬（右軸）</span>
            </div>
          </div>
          <HorizonChart horizons={s.horizons} />
          <div className="grid grid-cols-5 text-center text-xs">
            {s.horizons.map((h) => (
              <div key={h.days}>
                <p className="text-gray-500">{h.days} 日</p>
                <p className="font-bold mt-0.5">{h.winRate}%</p>
                <p className={changeClass(h.avgReturn)}>{fmtPct(h.avgReturn, 1)}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500">虛線＝勝率 50%</p>
        </Card>
        <Card>
          <p className="text-sm font-bold text-gray-900">持有 20 天的報酬分布（{h20.n} 次訊號）</p>
          <DistChart dist={s.dist} />
          <p className="text-xs text-gray-500">紅色＝賺錢的次數、綠色＝賠錢的次數</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <p className="text-sm font-bold text-gray-900">三大法人比較（同一條件）</p>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-gray-500">
                <th className="font-normal text-left py-1.5">法人</th>
                <th className="font-normal text-right">訊號數</th>
                <th className="font-normal text-right">5 日勝率</th>
                <th className="font-normal text-right">20 日勝率</th>
                <th className="font-normal text-right">20 日均報酬</th>
                <th className="font-normal text-right">超額報酬</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((x) => (
                <tr key={x.investor} className={`border-t border-gray-100 ${x.investor === who ? 'bg-blue-50 font-bold' : ''}`}>
                  <td className="py-2">{x.name}</td>
                  <td className="text-right">{x.signals}</td>
                  <td className="text-right">{x.at(5).winRate}%</td>
                  <td className="text-right">{x.at(20).winRate}%</td>
                  <td className={`text-right ${changeClass(x.at(20).avgReturn)}`}>{fmtPct(x.at(20).avgReturn, 1)}</td>
                  <td className={`text-right ${changeClass(x.at(20).excess)}`}>{fmtPct(x.at(20).excess, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-500">超額報酬＝跟著買的平均報酬減掉同一段時間的大盤</p>
        </Card>
        <Card>
          <p className="text-sm font-bold text-gray-900">最近的訊號（{s.name}）</p>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-gray-500">
                <th className="font-normal text-left py-1.5">訊號日</th>
                <th className="font-normal text-right">3 日買超</th>
                <th className="font-normal text-right">5 日後</th>
                <th className="font-normal text-right">20 日後</th>
              </tr>
            </thead>
            <tbody>
              {s.recent.map((e) => (
                <tr key={e.date + e.amount} className="border-t border-gray-100">
                  <td className="py-2">{e.date.replaceAll('-', '/')}</td>
                  <td className="text-right">+{e.amount.toLocaleString()} 張</td>
                  <td className={`text-right ${retClass(e.returns[5])}`}>{ret(e.returns[5])}</td>
                  <td className={`text-right ${retClass(e.returns[20])}`}>{ret(e.returns[20])}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-500">「進行中」＝還沒滿 N 天，不列入統計</p>
        </Card>
      </div>

      <p className="text-xs text-gray-600">過去的統計不代表未來表現，非投資建議。</p>
    </div>
  )
}

// 新手版標籤：次數太少優先提醒，其次看勝率和有沒有贏大盤
function tagOf(h20) {
  if (h20.n < 20) return { text: '次數太少', className: 'bg-amber-100 text-amber-800' }
  if (h20.winRate >= 55 && h20.excess > 0) return { text: '比較準', className: 'bg-red-100 text-red-800' }
  return { text: '參考就好', className: 'bg-gray-100 text-gray-700' }
}

function BeginnerView({ stats, name, years }) {
  const f = stats.find((x) => x.investor === 'foreign')
  const h20 = f.at(20)
  const wins = Math.round(h20.winRate / 10)
  const diff = h20.excess
  const vsMarket = Math.abs(diff) < 0.5 ? '跟大盤差不多' : diff > 0 ? '表現比大盤好一些' : '表現還輸給大盤'

  return (
    <div className="flex flex-col gap-4 max-w-[1180px]">
      <div className="bg-white rounded-xl border border-gray-200 p-7 flex flex-wrap gap-7 items-center">
        <div className="flex-[1_1_360px] min-w-0 flex flex-col gap-3">
          <p className="text-lg font-bold text-gray-900">跟著外資買{name}，會賺錢嗎？</p>
          <p className="text-[17px] leading-relaxed">
            過去 {years} 年，外資<b>連續買 3 天</b>之後再等 20 天，
            <b className="text-red-600">10 次裡大約有 {wins} 次會賺錢</b>，平均{h20.avgReturn >= 0 ? '賺' : '賠'} <b className={changeClass(h20.avgReturn)}>{Math.abs(h20.avgReturn)}%</b>。
          </p>
          <p className="text-sm text-gray-600 leading-relaxed">
            同一段時間大盤平均{h20.market >= 0 ? '漲' : '跌'} {Math.abs(h20.market)}%，所以跟著外資買，{vsMarket}。
          </p>
        </div>
        <div className="flex flex-col items-center gap-2 shrink-0">
          <div className="grid grid-cols-5 gap-2" role="img" aria-label={`10 次裡 ${wins} 次賺錢、${10 - wins} 次賠錢`}>
            {Array.from({ length: 10 }, (_, i) => (
              <span key={i} className={`w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold text-white ${i < wins ? 'bg-red-500' : 'bg-emerald-600'}`}>
                {i < wins ? '賺' : '賠'}
              </span>
            ))}
          </div>
          <span className="text-xs text-gray-500">紅＝賺錢・綠＝賠錢</span>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
        {stats.map((x) => {
          const h = x.at(20)
          const tag = tagOf(h)
          return (
            <div key={x.investor} className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-2.5">
              <div className="flex justify-between items-center">
                <p className="text-base font-bold text-gray-900">跟著{x.name}買</p>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${tag.className}`}>{tag.text}</span>
              </div>
              <p className="text-sm">20 天後 <b>10 次有 {Math.round(h.winRate / 10)} 次</b>賺錢</p>
              <div className="h-2.5 bg-emerald-100 rounded overflow-hidden">
                <div className="h-2.5 bg-red-400" style={{ width: `${h.winRate}%` }} />
              </div>
              <p className="text-[13px] text-gray-600">
                平均 <b className={changeClass(h.avgReturn)}>{fmtPct(h.avgReturn, 1)}</b>・統計了 {h.n} 次
              </p>
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3">
        <p className="text-base font-bold text-gray-900">最近幾次外資連續買進之後</p>
        {f.recent.slice(0, 4).map((e) => {
          const [d, v] = e.returns[20] != null ? [20, e.returns[20]] : e.returns[5] != null ? [5, e.returns[5]] : [null, null]
          return (
            <div key={e.date + e.amount} className="grid grid-cols-[64px_1fr_auto] gap-3.5 items-center px-3 py-2.5 rounded-lg bg-gray-50">
              <span className="text-[15px] font-bold">{md(e.date)}</span>
              <span className="text-sm">3 天買了 {e.amount.toLocaleString()} 張</span>
              <span className={`text-sm font-bold ${d ? changeClass(v) : 'text-gray-500'}`}>{d ? `${d} 天後 ${fmtPct(v, 1)}` : '還在觀察中'}</span>
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3">
        <p className="text-base font-bold text-gray-900">看這頁要注意</p>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
          {TIPS.map((t) => (
            <div key={t.title} className="p-3.5 rounded-lg bg-orange-50">
              <p className="font-bold text-sm mb-1.5">{t.title}</p>
              <p className="text-[13px] text-gray-600 leading-relaxed">{t.text}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500">非投資建議</p>
      </div>
    </div>
  )
}

export default function InstitutionPerf() {
  const { isPro } = useMode()
  const [searchParams] = useSearchParams()
  const symbol = searchParams.get('ticker') || mockStockList[0].symbol
  const name = mockStockList.find((s) => s.symbol === symbol)?.name || getStockName(symbol) || symbol
  const perf = useAsync(symbol, () => fetchInstitutionalPerf(symbol))
  const p = perf.data?.data
  const stats = p ? allStats(p.events) : null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-gray-900">法人績效</h1>
        <span className="text-base text-gray-700">{name} <span className="text-gray-500">{symbol}</span></span>
        <MockBadge show={perf.data?.isMock} />
      </div>
      <StockPicker symbol={symbol} />
      {perf.loading && <p className="text-sm text-gray-400">載入中...</p>}
      {perf.error && <p className="text-sm text-gray-400">無法取得法人績效資料</p>}
      {stats && (isPro
        ? <ProView stats={stats} signal={p.signal} years={p.years} />
        : <BeginnerView stats={stats} name={name} years={p.years} />)}
    </div>
  )
}
