// 法人績效統計：後端（或示意資料）給每一次訊號的報酬，這裡算勝率、平均報酬、超額報酬、分布
// 還沒滿 N 天的訊號（null）不列入該天數的統計
import { PERF_HORIZONS } from '../data/stockMock'
import { INST_KEYS } from './chipsInsights'

export { PERF_HORIZONS }

const avg = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null)
const round1 = (v) => (v == null ? null : Math.round(v * 10) / 10)

// 20 日報酬分布的區間
export const DIST_BUCKETS = [
  { label: '<-6%', max: -6 }, { label: '-6~-3', max: -3 }, { label: '-3~0', max: 0 }, { label: '0~3', max: 3 },
  { label: '3~6', max: 6 }, { label: '6~9', max: 9 }, { label: '9~12', max: 12 }, { label: '>12%', max: Infinity },
]

export function statsFor(events, investor) {
  const evs = events.filter((e) => e.investor === investor)
  const horizons = PERF_HORIZONS.map((h) => {
    const done = evs.filter((e) => e.returns[h] != null)
    const vals = done.map((e) => e.returns[h])
    const mkt = avg(done.map((e) => e.market[h]))
    const mean = avg(vals)
    return {
      days: h,
      n: vals.length,
      winRate: vals.length ? Math.round((vals.filter((v) => v > 0).length / vals.length) * 100) : null,
      avgReturn: round1(mean),
      market: round1(mkt),
      excess: mean == null ? null : round1(mean - mkt),
    }
  })
  const h20 = evs.filter((e) => e.returns[20] != null)
  const worst = h20.reduce((w, e) => (w == null || e.returns[20] < w.returns[20] ? e : w), null)
  const dist = DIST_BUCKETS.map((b, i) => ({
    ...b,
    count: h20.filter((e) => e.returns[20] < b.max && (i === 0 || e.returns[20] >= DIST_BUCKETS[i - 1].max)).length,
    positive: b.max > 0,
  }))
  return {
    investor,
    name: INST_KEYS.find((k) => k.key === investor)?.name,
    signals: evs.length,
    horizons,
    at: (d) => horizons.find((h) => h.days === d),
    maxLoss20: worst ? { value: worst.returns[20], date: worst.date } : null,
    dist,
    recent: evs.slice(-5).reverse(),
  }
}

export const allStats = (events) => INST_KEYS.map((k) => statsFor(events, k.key))

// 個股頁小卡用的摘要：後端摘要格式直接用，完整格式（events）就自己算
export function perfSummary(data) {
  if (Array.isArray(data)) return data
  return allStats(data.events).map((s) => ({ name: s.name, winRate5d: s.at(5).winRate, avgReturn20d: s.at(20).avgReturn }))
}
