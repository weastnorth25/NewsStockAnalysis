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

// 取得單一股票即時資訊
export const fetchStockInfo = async (ticker) => {
  const res = await api.get(`/api/stock/${ticker}`)
  return res.data
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

// 把顯示用 symbol 轉成 yfinance 完整 ticker（台股加 .TW，指數/美股原樣）
// 後端目前不會自動加 .TW，所以前端統一補上後再送
export const toFullTicker = (symbol) =>
  symbol.includes('.') || symbol.startsWith('^') ? symbol : `${symbol}.TW`

// 把後端回來的完整 ticker 轉成顯示用 symbol（strip .TW）
export const toDisplaySymbol = (symbol) =>
  symbol.endsWith('.TW') ? symbol.slice(0, -3) : symbol

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
