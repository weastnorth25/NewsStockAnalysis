// 所有後端 API 呼叫集中在這裡，包含登入、註冊、股票查詢、自選股，並自動附加 JWT token
import axios from 'axios'

// Axios 實例，baseURL 從 VITE_API_URL 讀取（生產環境連 Render，未設定則走 vite proxy）
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
})

// 自動帶上 JWT token（登入後存在 localStorage），遊客 token 不送
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token && token !== 'guest') {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

const round2 = (v) => Math.round(v * 100) / 100

// ─── 上市（.TW）／上櫃（.TWO）────────────────────────────────────
// 只看代號分不出是上市還是上櫃，先當上市（.TW）查；查不到再試上櫃（.TWO），成功就記在瀏覽器，下次直接用 .TWO
const OTC_KEY = 'otcSymbols'
const otc = (() => {
  try { return new Set(JSON.parse(localStorage.getItem(OTC_KEY)) ?? []) } catch { return new Set() }
})()
function rememberOtc(code) {
  otc.add(code)
  try { localStorage.setItem(OTC_KEY, JSON.stringify([...otc])) } catch { /* 存不了就只記在這次 */ }
}

// request(ticker) 失敗、而且 ticker 是「數字代號.TW」時，換成 .TWO 再試一次
export async function withTwSuffix(ticker, request) {
  try {
    return await request(ticker)
  } catch (err) {
    const m = ticker.match(/^(\d[0-9A-Z]*)\.TW$/)
    if (!m) throw err
    const res = await request(`${m[1]}.TWO`)
    rememberOtc(m[1])
    return res
  }
}

// 取得單一股票即時資訊
// 即時報價 API 用到 yfinance 的 info，常被 Yahoo 限流（400）；失敗時改用歷史股價最後兩天的收盤價算出價格與漲跌
// 回傳多兩個欄位：from_history（true 代表是收盤價，不是即時）、as_of（那天的日期）
export const fetchStockInfo = (ticker) => withTwSuffix(ticker, quoteOrLastClose)

async function quoteOrLastClose(ticker) {
  try {
    const res = await api.get(`/api/stock/${ticker}`)
    return res.data
  } catch (err) {
    const res = await api.get(`/api/stock/${ticker}/history`, { params: { period: '1mo' } }).catch(() => null)
    const rows = res?.data
    if (!rows?.length) throw err
    const last = rows.at(-1)
    const prev = rows.at(-2) ?? last
    const change = round2(last.close - prev.close)
    return {
      symbol: ticker,
      current_price: last.close,
      prev_close: prev.close,
      change,
      change_pct: prev.close ? round2((change / prev.close) * 100) : 0,
      // 歷史股價的台股成交量是「張」，即時報價是「股」，這裡換回股，跟即時報價一致
      volume: /\.TWO?$/.test(ticker) ? last.volume * 1000 : last.volume,
      from_history: true,
      as_of: last.date,
    }
  }
}

// 登入
export const loginUser = async (email, password) => {
  const res = await api.post('/api/login', { email, password })
  return res.data  // { access_token, token_type }
}

// 註冊
export const registerUser = async (username, email, password) => {
  const res = await api.post('/api/register', { username, email, password })
  return res.data  // { id, username, email, created_at }
}

// 取得目前登入使用者資訊
export const fetchCurrentUser = async () => {
  const res = await api.get('/api/users/me')
  return res.data  // { id, username, email, created_at }
}

// 把顯示用 symbol 轉成 yfinance 完整 ticker：台股（數字開頭）加 .TW，已知是上櫃的加 .TWO，指數/美股原樣
// 後端目前不會自動加後綴，所以前端統一補上後再送
export const toFullTicker = (symbol) =>
  /^\d[0-9A-Z]*$/.test(symbol) ? `${symbol}${otc.has(symbol) ? '.TWO' : '.TW'}` : symbol

// 把後端回來的完整 ticker 轉成顯示用 symbol（去掉 .TW／.TWO）
export const toDisplaySymbol = (symbol) => symbol.replace(/\.TWO?$/, '')

// 取得使用者自選股（含即時價格）
export const fetchWatchlist = async () => {
  const res = await api.get('/api/watchlist')
  return res.data  // [{ id, symbol, company_name, current_price }, ...]
}

// 加入自選股
export const addToWatchlist = async (symbol) => {
  const res = await api.post('/api/watchlist', { symbol })
  return res.data
}

// 移除自選股
export const removeFromWatchlist = async (symbol) => {
  const res = await api.delete(`/api/watchlist/${symbol}`)
  return res.data
}

export default api
