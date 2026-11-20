// 首頁假資料（示意用）：加權指數歷史走勢、新聞情緒走勢（後端失敗時的備援）
// 等後端對應的 API 完成後逐步替換

// 加權指數歷史走勢（示意）：以最新收盤價往回推，種子固定讓每次形狀一致
const RANGE_DAYS = { '1W': 5, '1M': 22, '3M': 66, '6M': 130 }

// range 可以是 '1M' 這類區間，也可以直接給天數
export function mockIndexHistory(lastClose, range) {
  const n = typeof range === 'number' ? range : RANGE_DAYS[range] ?? 22
  let seed = 7
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  const prices = [lastClose]
  for (let i = 1; i < n; i++) prices.unshift(prices[0] / (1 + (rand() - 0.47) * 0.018))

  const out = []
  const d = new Date()
  for (let i = n - 1; i >= 0; ) {
    if (d.getDay() % 6 !== 0) {
      out.unshift({ date: `${d.getMonth() + 1}/${d.getDate()}`, close: Math.round(prices[i] * 100) / 100 })
      i--
    }
    d.setDate(d.getDate() - 1)
  }
  return out
}

// 新聞情緒走勢（示意）：0～100，跟著示意加權指數的漲跌變動，前一天的情緒會延續（慣性 0.6）
// 格式跟之後的 /api/sentiment/trend 一樣：[{ date, score, count }]
// 固定先算 130 天再取最後 days 天，專業版（1M/3M）和新手版（10 天）同一天才會是同一個分數
export function mockSentimentTrend(days) {
  const index = mockIndexHistory(20000, 131)
  let seed = 11
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  let score = 55
  return index.slice(1).map((row, i) => {
    const pct = row.close / index[i].close - 1
    score = Math.max(5, Math.min(95, 50 + (score - 50) * 0.6 + pct * 2600 + (rand() - 0.5) * 16))
    return { date: row.date, score: Math.round(score), count: 20 + Math.round(rand() * 40) }
  }).slice(-days)
}
