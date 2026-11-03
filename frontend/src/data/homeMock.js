// 首頁假資料（示意用）：三大法人、漲跌幅排行、加權指數歷史走勢
// 等後端對應的 API 完成後逐步替換

// 今日三大法人買賣超（億元）
export const mockInstitutional = [
  { name: '外資',   value: 125.3 },
  { name: '投信',   value: 18.6 },
  { name: '自營商', value: -9.2 },
]

// 漲跌幅排行
export const mockMovers = [
  { code: '3231', name: '緯創',   price: 128.5, changePct: 9.8 },
  { code: '2382', name: '廣達',   price: 312.0, changePct: 6.2 },
  { code: '2330', name: '台積電', price: 1085,  changePct: 2.4 },
  { code: '2603', name: '長榮',   price: 186.5, changePct: -3.1 },
  { code: '2882', name: '國泰金', price: 61.2,  changePct: -1.5 },
]

// 加權指數歷史走勢（示意）：以最新收盤價往回推，種子固定讓每次形狀一致
const RANGE_DAYS = { '1W': 5, '1M': 22, '3M': 66, '6M': 130 }

export function mockIndexHistory(lastClose, range) {
  const n = RANGE_DAYS[range] ?? 22
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
