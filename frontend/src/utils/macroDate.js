// 總經日曆用的日期工具：事件時間存 UTC，一律換算成台灣時間顯示與分組
// 日期本身用 'YYYY-MM-DD' 字串表示，加減天數時固定在 UTC 中午運算，不受瀏覽器時區或夏令時間影響

const TZ = 'Asia/Taipei'
const dayKeyFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
const timeFmt   = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false })

export const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

// 任意時間 → 台灣時間的日期 'YYYY-MM-DD'
export const toDayKey = (date) => dayKeyFmt.format(new Date(date))

// 任意時間 → 台灣時間 'HH:mm'
export const formatTime = (date) => timeFmt.format(new Date(date))

const fromKey = (key) => new Date(`${key}T12:00:00Z`)
const toKey   = (d) => d.toISOString().slice(0, 10)

export const addDays = (key, n) => {
  const d = fromKey(key)
  d.setUTCDate(d.getUTCDate() + n)
  return toKey(d)
}

export const weekdayOf = (key) => fromKey(key).getUTCDay()

// '2026-10-29' → '10/29'
export const formatMD = (key) => `${Number(key.slice(5, 7))}/${Number(key.slice(8, 10))}`

// 該週的週一
export const startOfWeek = (key) => addDays(key, -((weekdayOf(key) + 6) % 7))

// 從某個週一開始的 N 週交易日（週一～五）
export function buildTradingDays(mondayKey, weeks = 2) {
  const days = []
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 5; d++) days.push(addDays(mondayKey, w * 7 + d))
  }
  return days
}

// 月曆格子：從當月 1 號所在那週的週日開始，固定 6 週 42 格
export function buildMonthGrid(year, month) {
  const first = `${year}-${String(month).padStart(2, '0')}-01`
  const start = addDays(first, -weekdayOf(first))
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
}

// 依台灣時間的日期分組，同一天內依時間排序
export function groupByDay(events) {
  const map = {}
  for (const e of events) {
    const key = toDayKey(e.datetime)
    ;(map[key] ||= []).push(e)
  }
  for (const key in map) map[key].sort((a, b) => a.datetime.localeCompare(b.datetime))
  return map
}
