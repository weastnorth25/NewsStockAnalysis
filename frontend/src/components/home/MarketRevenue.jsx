// 首頁的大盤月營收：上市公司當月營收合計、年增率、哪些產業貢獻最多，附 AI 一句話摘要，以及近 12 個月走勢
// 專業版看數字、產業貢獻表與營收／年增率雙軸圖；新手版用白話講「上個月整體賣得怎麼樣」「這一年是越來越好嗎」
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts'
import useAsync from '../../hooks/useAsync'
import { fetchMarketRevenue, fetchMarketRevenueTrend } from '../../api/market'
import { changeClass, fmtPct } from '../../utils/market'

// 千元 → 「6.36 兆」「3,250 億」
function fmtMoney(thousand) {
  const yuan = thousand * 1000
  return yuan >= 1e12 ? `${(yuan / 1e12).toFixed(2)} 兆` : `${Math.round(yuan / 1e8).toLocaleString()} 億`
}
const monthOf = (ym) => Number(ym.slice(5, 7))

function useRevenue() {
  return useAsync('market-revenue', fetchMarketRevenue)
}

const AXIS = { fontSize: 11, fill: '#6b7280' }
// 千元 → 兆元（圖表刻度用）
const toTrillion = (thousand) => Math.round((thousand / 1e9) * 100) / 100

function useTrend() {
  const r = useAsync('market-revenue-trend', () => fetchMarketRevenueTrend(12))
  const rows = (r.data ?? []).map((m) => ({
    label: `${monthOf(m.year_month)}月`,
    ym: m.year_month,
    revenue: toTrillion(m.revenue_total_thousand),
    yoy: m.yoy_pct,
  }))
  return { ...r, rows }
}

// 長條＝每月營收合計（兆，左軸），線＝年增率（%，右軸）
function TrendChart({ rows, showYoY = true, height = 200 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={rows} margin={{ top: 5, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#f3f4f6" vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} interval={0} />
        <YAxis yAxisId="rev" tick={AXIS} tickLine={false} axisLine={false} width={36} tickFormatter={(v) => `${v}兆`} />
        {showYoY && <YAxis yAxisId="yoy" orientation="right" tick={AXIS} tickLine={false} axisLine={false} width={40} tickFormatter={(v) => `${v}%`} />}
        <Tooltip
          formatter={(v, k) => (k === 'revenue' ? [`${v} 兆元`, '營收合計'] : [`${v > 0 ? '+' : ''}${v}%`, '年增率'])}
          labelFormatter={(_, p) => p?.[0]?.payload.ym.replace('-', '/') ?? ''}
          cursor={{ fill: '#f3f4f6' }}
        />
        <Bar yAxisId="rev" dataKey="revenue" fill="#bfdbfe" radius={[3, 3, 0, 0]} />
        {showYoY && <Line yAxisId="yoy" type="monotone" dataKey="yoy" stroke="#dc2626" strokeWidth={2} dot={{ r: 2.5 }} />}
      </ComposedChart>
    </ResponsiveContainer>
  )
}

// 新手版一句話：前 3 個月和後 3 個月的平均年增率比較
function trendSentence(rows) {
  if (rows.length < 6) return null
  const avg = (a) => a.reduce((s, r) => s + r.yoy, 0) / a.length
  const early = avg(rows.slice(0, 3))
  const late = avg(rows.slice(-3))
  const allUp = rows.every((r) => r.yoy > 0)
  const base = allUp ? `過去 ${rows.length} 個月，每個月都比前一年同月賣得多` : `過去 ${rows.length} 個月，有 ${rows.filter((r) => r.yoy > 0).length} 個月比前一年同月賣得多`
  if (late - early > 5) return `${base}，而且成長幅度從約 ${Math.round(early)}% 擴大到約 ${Math.round(late)}%，景氣在加溫。`
  if (early - late > 5) return `${base}，不過成長幅度從約 ${Math.round(early)}% 縮小到約 ${Math.round(late)}%，成長在放慢。`
  return `${base}，成長幅度大致維持在 ${Math.round(late)}% 左右。`
}

function Status({ r }) {
  if (r.loading || (!r.data && !r.error)) return <p className="text-sm text-gray-400 py-6 text-center">載入中...</p>
  return <p className="text-sm text-gray-400 py-6 text-center">暫時無法取得月營收資料</p>
}

function AiSummary({ text }) {
  if (!text) return null
  return (
    <div className="bg-slate-50 rounded-lg p-3 flex flex-col gap-1.5">
      <span className="self-start text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">AI 摘要</span>
      <p className="text-[13px] leading-relaxed text-gray-800">{text}</p>
    </div>
  )
}

export function MarketRevenuePro() {
  const r = useRevenue()
  const trend = useTrend()
  const d = r.data
  // 依「對整體年增率的貢獻」排，看成長主要從哪來
  const top = d ? [...d.industries].sort((a, b) => b.contribution_pts - a.contribution_pts).slice(0, 6) : []
  const maxPts = Math.max(...top.map((i) => Math.abs(i.contribution_pts)), 1)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 min-w-0 flex flex-col gap-3">
      <p className="text-sm font-bold text-gray-900">上市公司月營收{d && `（${d.year_month.replace('-', '/')}）`}</p>
      {!d ? <Status r={r} /> : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-5">
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <p className="text-xs text-gray-500">營收合計</p>
                <p className="text-[20px] font-bold">{fmtMoney(d.revenue_total_thousand)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">年增率</p>
                <p className={`text-[20px] font-bold ${changeClass(d.yoy_pct)}`}>{fmtPct(d.yoy_pct, 1)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">已公布</p>
                <p className="text-[20px] font-bold">{d.reported_companies.toLocaleString()} <span className="text-sm font-normal">家</span></p>
              </div>
            </div>
            <p className="text-xs text-gray-500">去年同月 {fmtMoney(d.year_ago_total_thousand)}・每月 10 日前公布上個月營收</p>
            <AiSummary text={d.summary} />
          </div>

          <div className="min-w-0 overflow-x-auto">
            <table className="w-full text-[13px] min-w-[420px]">
              <thead>
                <tr className="text-gray-500">
                  <th className="font-normal text-left py-1.5">產業（依成長貢獻）</th>
                  <th className="font-normal text-right">占比</th>
                  <th className="font-normal text-right">年增</th>
                  <th className="font-normal text-right w-36">貢獻</th>
                </tr>
              </thead>
              <tbody>
                {top.map((i) => (
                  <tr key={i.industry} className="border-t border-gray-100">
                    <td className="py-2">{i.industry}</td>
                    <td className="text-right text-gray-600">{i.share_pct}%</td>
                    <td className={`text-right ${changeClass(i.yoy_pct)}`}>{fmtPct(i.yoy_pct, 1)}</td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-gray-100 rounded">
                          <div className={`h-1.5 rounded ml-auto ${i.contribution_pts >= 0 ? 'bg-red-400' : 'bg-emerald-400'}`}
                            style={{ width: `${(Math.abs(i.contribution_pts) / maxPts) * 100}%` }} />
                        </div>
                        <span className="w-12">{i.contribution_pts > 0 ? '+' : ''}{i.contribution_pts}pt</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-gray-500 mt-1.5">貢獻＝這個產業讓整體年增率增加幾個百分點</p>
          </div>
        </div>
      )}
      {trend.rows.length > 0 && (
        <div className="border-t border-gray-100 pt-3 flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
            <p className="text-sm font-bold text-gray-900 mr-1">近 {trend.rows.length} 個月走勢</p>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-blue-200" />營收合計（兆，左軸）</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-red-600" />年增率（右軸）</span>
          </div>
          <TrendChart rows={trend.rows} />
        </div>
      )}
    </div>
  )
}

export function MarketRevenueBeginner() {
  const r = useRevenue()
  const trend = useTrend()
  const sentence = trendSentence(trend.rows)
  const d = r.data
  const up = d?.yoy_pct >= 0
  // 整體成長時列貢獻最多的產業，衰退時列拖累最多的
  const top = d ? [...d.industries].sort((a, b) => (up ? b.contribution_pts - a.contribution_pts : a.contribution_pts - b.contribution_pts)).slice(0, 3) : []

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3 min-w-0">
      <p className="text-base font-bold text-gray-900">上市公司{d ? ` ${monthOf(d.year_month)} 月` : '上個月'}賺得怎麼樣？</p>
      {!d ? <Status r={r} /> : (
        <>
          <p className="text-[15px] leading-relaxed">
            {d.reported_companies.toLocaleString()} 家上市公司 {monthOf(d.year_month)} 月一共賣了 <b>{fmtMoney(d.revenue_total_thousand)}元</b>，
            比去年同一個月<b className={changeClass(d.yoy_pct)}>{up ? '多' : '少'} {Math.abs(d.yoy_pct).toFixed(1)}%</b>。
          </p>
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <span className="text-gray-600">{up ? '主要靠' : '拖累最多'}：</span>
            {top.map((i) => (
              <span key={i.industry} className="px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200">
                {i.industry} <span className={changeClass(i.yoy_pct)}>{fmtPct(i.yoy_pct, 0)}</span>
              </span>
            ))}
          </div>
          <AiSummary text={d.summary} />
          {trend.rows.length > 0 && (
            <div className="flex flex-col gap-1.5 border-t border-gray-100 pt-3">
              <p className="text-sm font-bold text-gray-900">這一年是越來越好嗎？</p>
              {sentence && <p className="text-sm text-gray-700 leading-relaxed">{sentence}</p>}
              <TrendChart rows={trend.rows} showYoY={false} height={160} />
            </div>
          )}
          <p className="text-xs text-gray-500">月營收＝公司每個月賣東西收到的錢，每月 10 日前公布上個月的數字</p>
        </>
      )}
    </div>
  )
}
