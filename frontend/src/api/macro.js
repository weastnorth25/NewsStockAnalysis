// 總經日曆 API：/api/macro/events，時間是 UTC，格式跟 data/macroEvents.js 的示意資料相同
// 一次抓今天前後 4 個月，月曆往前往後翻都有資料；日曆頁和首頁小卡共用同一個請求（存在 cached）
import api from './stock'

// 日期用本地時間組，不能用 toISOString()（台灣 UTC+8 會差一天）
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const shiftDays = (n) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return ymd(d)
}

let cached = null

export const fetchMacroEvents = () => {
  if (!cached) {
    cached = api
      .get('/api/macro/events', { params: { from: shiftDays(-120), to: shiftDays(120) } })
      .then((res) => res.data)
      .catch((err) => {
        cached = null // 失敗不要快取，下次進頁面再試
        throw err
      })
  }
  return cached
}
