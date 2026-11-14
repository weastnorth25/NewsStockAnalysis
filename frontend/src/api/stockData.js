// 個股 dashboard 用的資料 API：先呼叫後端，後端還沒做（404）或失敗就改用示意資料
// 每支 API 一個工作階段只試一次，失敗後直接用示意資料，不會一直重打
// 回傳 { data, isMock }，畫面依 isMock 顯示「示意」標籤
import api, { toFullTicker } from './stock'
import {
  mockHistory, mockFundamentals, mockInstitutional, mockChips, mockInstitutionalPerf, MOCK_LAST_CLOSE,
} from '../data/stockMock'

const PERIODS = { '1M': '1mo', '3M': '3mo', '6M': '6mo', '1Y': '1y' }
const unavailable = new Set()

export async function tryReal(name, request, fallback) {
  if (!unavailable.has(name)) {
    try {
      const res = await request()
      return { data: res.data, isMock: false }
    } catch {
      unavailable.add(name)
    }
  }
  return { data: fallback(), isMock: true }
}

// 歷史股價：[{ date, open, high, low, close, volume }]
// lastClose 只給示意資料用（讓假走勢的最後一點對齊真實收盤價）
export const fetchHistory = (symbol, range, lastClose) =>
  tryReal(
    'history',
    () => api.get(`/api/stock/${toFullTicker(symbol)}/history`, { params: { period: PERIODS[range] } }),
    () => mockHistory(symbol, lastClose ?? 100, range),
  )

// 國際同業：{ series: [{ ticker, name, currency, points: [{ date, close }] }] }，第一個是主角
// 比較對象由前端決定（產業預設或使用者自選），用 ?peers=NVDA,AMD,^GSPC 傳給後端
export const fetchPeers = (symbol, range, { peers, benchmarks }, lastClose) =>
  tryReal(
    'peers',
    () => api.get(`/api/peers/${toFullTicker(symbol)}`, {
      params: { period: PERIODS[range], peers: [...peers, ...benchmarks].map((p) => p.ticker).join(',') },
    }),
    () => ({
      series: [
        { ticker: toFullTicker(symbol), name: symbol, points: mockHistory(symbol, lastClose ?? 100, range) },
        ...[...peers, ...benchmarks].map((p) => ({
          ticker: p.ticker,
          name: p.name,
          points: mockHistory(p.ticker, MOCK_LAST_CLOSE[p.ticker] ?? 100, range),
        })),
      ],
    }),
  )

// 財報摘要：本益比、EPS、營收年增、毛利率、每季 EPS…
export const fetchFundamentals = (symbol) =>
  tryReal('financials', () => api.get(`/api/stock/${symbol}/financials`), () => mockFundamentals(symbol))

// 近 10 日三大法人買賣超（張）：[{ date, foreign, trust, dealer }]
export const fetchInstitutional = (symbol) =>
  tryReal('institutional', () => api.get(`/api/stock/${symbol}/institutional`, { params: { days: 10 } }), () => mockInstitutional(symbol))

// 法人籌碼頁：近 60 日每天的三大法人＋收盤價 → [{ date, foreign, trust, dealer, close, foreignRatio?, margin? }]
// 後端 /institutional 只有三大法人，收盤價另外從歷史股價用日期併進來
// 外資持股比例（%）、融資餘額（張）後端還沒提供，沒有這兩個欄位時畫面會把相關卡片藏起來
export const fetchChips = (symbol, lastClose) =>
  tryReal(
    'chips',
    async () => {
      const [inst, hist] = await Promise.all([
        api.get(`/api/stock/${symbol}/institutional`, { params: { days: 60 } }),
        api.get(`/api/stock/${toFullTicker(symbol)}/history`, { params: { period: '3mo' } }),
      ])
      const closeOf = Object.fromEntries(hist.data.map((r) => [r.date, r.close]))
      const rows = inst.data.filter((r) => closeOf[r.date] != null).map((r) => ({ ...r, close: closeOf[r.date] }))
      if (!rows.length) throw new Error('no chips data')
      return { data: rows }
    },
    () => mockChips(symbol, lastClose ?? 100),
  )

// 法人買超後績效，後端目前回傳摘要：[{ name, winRate5d, avgReturn20d, samples, baselineWinRate5d, baselineAvgReturn20d }]
// 法人績效頁需要的完整格式（統計交給 utils/perfStats.js）：
// { signal, years, events: [{ investor: 'foreign'|'trust'|'dealer', date, amount, returns: { 1, 5, 10, 20, 60 }, market: {…} }] }
// 兩種都可能拿到，用 Array.isArray 分辨
export const fetchInstitutionalPerf = (symbol) =>
  tryReal('institutional-perf', () => api.get(`/api/stock/${symbol}/institutional-performance`), () => mockInstitutionalPerf(symbol))
