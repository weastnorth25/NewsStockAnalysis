// 個股 dashboard 假資料（示意用）：歷史股價、同業、財報、籌碼、法人績效
// 以股票代號當亂數種子，同一支股票每次產生的形狀一致；後端對應 API 完成後由 src/api/stockData.js 自動改用真資料

export const RANGE_DAYS = { '1M': 22, '3M': 66, '6M': 130, '1Y': 250 }

// 可重現的亂數：同一個 seed 字串永遠得到同一串數字
export function seededRandom(seedText) {
  let seed = 0
  for (const c of seedText) seed = (seed * 31 + c.charCodeAt(0)) % 2147483647
  seed = seed || 7
  return () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
}

// 往回取 n 個交易日（週一～五），最後一天是今天
// 日期字串要用本地時間組，不能用 toISOString()：台灣是 UTC+8，轉 UTC 會往前跳一天，週一會變成週日
const localDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function tradingDays(n) {
  const out = []
  const d = new Date()
  while (out.length < n) {
    if (d.getDay() % 6 !== 0) out.unshift(localDate(d))
    d.setDate(d.getDate() - 1)
  }
  return out
}

// 歷史股價：從最新收盤價往回推，成交量也一起產生
export function mockHistory(ticker, lastClose, range) {
  const n = RANGE_DAYS[range] ?? 66
  const rand = seededRandom(ticker + range)
  const closes = [lastClose]
  for (let i = 1; i < n; i++) closes.unshift(closes[0] / (1 + (rand() - 0.47) * 0.022))
  const baseVol = 20000 + rand() * 40000
  return tradingDays(n).map((date, i) => {
    const close = Math.round(closes[i] * 100) / 100
    const swing = close * (0.004 + rand() * 0.01)
    return {
      date,
      open: Math.round((close + (rand() - 0.5) * swing) * 100) / 100,
      high: Math.round((close + swing) * 100) / 100,
      low: Math.round((close - swing) * 100) / 100,
      close,
      volume: Math.round(baseVol * (0.6 + rand() * 0.9)),
    }
  })
}

// 國際同業的示意收盤價（只用來讓 tooltip 顯示「當天股價」，真實數字待後端 API）
export const MOCK_LAST_CLOSE = {
  'NVDA': 190, 'AVGO': 340, '005930.KS': 98000, 'AMD': 230, 'QCOM': 170, 'INTC': 38,
  'APH': 130, 'TEL': 230, 'JBL': 220, 'FLEX': 60, 'DELL': 140, 'HPQ': 28, 'SMCI': 45,
  'MET': 80, 'PRU': 105, 'AFL': 108, 'MAERSK-B.CO': 12000, '1919.HK': 14, 'ZIM': 15,
  '^SOX': 11482, '^GSPC': 7722,
}

// ─── 財報 ────────────────────────────────────────────────────────
// 台積電寫實際一點的示意值，其他股票依代號產生
const FUNDAMENTALS_2330 = {
  pe: 24.8, peerPe: 21.3, eps4q: 48.4, epsYoY: 41, revYoY: 38.2, revStreak: 6,
  grossMargin: 59.0, grossMarginChg: 1.2, opMargin: 48.6, roe: 29.4,
  quarterlyEps: [7.8, 8.7, 9.6, 9.2, 10.4, 11.6, 12.5, 13.9],
}

// 回傳的欄位就是之後後端 /api/stock/{code}/financials 的格式
export function mockFundamentals(code) {
  const r = seededRandom('fund' + code)
  let f
  if (code === '2330') {
    f = { ...FUNDAMENTALS_2330, lastRevenue: 12620, shares: 259.3, pb: 7.1, dividendYield: 1.7 }
  } else {
    const base = 1 + r() * 6
    f = {
      pe: round1(8 + r() * 22),
      peerPe: round1(12 + r() * 10),
      epsYoY: Math.round(-20 + r() * 60),
      revYoY: round1(-15 + r() * 50),
      revStreak: Math.floor(r() * 8),
      grossMargin: round1(8 + r() * 45),
      grossMarginChg: round1(-2 + r() * 4),
      opMargin: round1(3 + r() * 30),
      roe: round1(4 + r() * 22),
      quarterlyEps: Array.from({ length: 8 }, (_, i) => round1(base * (0.8 + i * 0.04 + r() * 0.3))),
      lastRevenue: Math.round(80 + r() * 2500),
      shares: round1(5 + r() * 120),
      pb: round1(0.8 + r() * 4),
      dividendYield: round1(1 + r() * 5),
    }
    f.eps4q = round1(f.quarterlyEps.slice(-4).reduce((s, v) => s + v, 0))
  }
  return { ...f, quarters: quarterLabels(), quarterly: buildQuarterly(f, r), monthly: buildMonthly(f, r) }
}

function quarterLabels() {
  return ['24Q4', '25Q1', '25Q2', '25Q3', '25Q4', '26Q1', '26Q2', '26Q3']
}

// 每季明細：最後一季對齊上面的毛利率、營益率、EPS，往前每季微幅變動
function buildQuarterly(f, r) {
  const n = f.quarterlyEps.length
  return f.quarterlyEps.map((eps, i) => {
    const back = n - 1 - i
    const last = i === n - 1
    const prev = i === n - 2
    const grossMargin = last ? f.grossMargin : prev ? round1(f.grossMargin - f.grossMarginChg) : round1(f.grossMargin + (r() - 0.6) * 3)
    const opMargin = last ? f.opMargin : round1(f.opMargin + (r() - 0.55) * 3)
    const revenue = Math.round(f.lastRevenue / Math.pow(1 + f.revYoY / 400, back) * (0.97 + r() * 0.06))
    const netIncome = Math.round(eps * f.shares)
    return {
      q: quarterLabels()[i],
      revenue,
      grossMargin,
      opMargin,
      netMargin: round1((netIncome / revenue) * 100),
      netIncome,
      eps,
      roe: last ? round1(f.roe / 4) : round1((f.roe / 4) * (0.85 + r() * 0.25)),
    }
  })
}

// 每月營收（近 12 個月）：月營收在次月 10 日前公布，所以「最新一個月」要看今天是幾號
function buildMonthly(f, r) {
  const now = new Date()
  const latest = new Date(now.getFullYear(), now.getMonth() - (now.getDate() > 10 ? 1 : 2), 1)
  const monthRev = f.lastRevenue / 3
  const out = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(latest.getFullYear(), latest.getMonth() - i, 1)
    const yoy = i === 0 ? f.revYoY : round1(f.revYoY + (r() - 0.5) * 16)
    const revenue = Math.round(monthRev / Math.pow(1 + f.revYoY / 1200, i) * (0.93 + r() * 0.14))
    out.push({ month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, revenue, yoy })
  }
  return out.map((m, i) => ({ ...m, mom: i === 0 ? null : round1((m.revenue / out[i - 1].revenue - 1) * 100) }))
}

const round1 = (v) => Math.round(v * 10) / 10

// ─── 籌碼：近 10 日三大法人買賣超（張）───────────────────────────
export function mockInstitutional(code) {
  const r = seededRandom('inst' + code)
  const bias = code === '2330' ? 2200 : (r() - 0.4) * 2000
  return tradingDays(10).map((date, i) => ({
    date,
    foreign: Math.round(bias * (0.4 + i * 0.12) + (r() - 0.5) * 4000),
    trust:   Math.round((r() - 0.35) * 600),
    dealer:  Math.round((r() - 0.55) * 400),
  }))
}

// ─── 法人買超後績效（近 3 年統計）──────────────────────────────
export function mockInstitutionalPerf(code) {
  const r = seededRandom('perf' + code)
  return [
    { name: '外資',   winRate5d: Math.round(52 + r() * 14), avgReturn20d: round1(-1 + r() * 5) },
    { name: '投信',   winRate5d: Math.round(50 + r() * 12), avgReturn20d: round1(-1 + r() * 4) },
    { name: '自營商', winRate5d: Math.round(44 + r() * 10), avgReturn20d: round1(-2 + r() * 3) },
  ]
}
