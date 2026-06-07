// 所有後端 API 呼叫集中在這裡，包含登入、註冊、股票查詢，並自動附加 JWT token
import axios from 'axios'

// Axios 實例，所有 API 請求從這裡出去
const api = axios.create({
  baseURL: '',  // vite proxy 會幫你轉發到 localhost:8000
})

// 自動帶上 JWT token（登入後存在 localStorage）
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 取得單一股票即時資訊（已有的後端 API）
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
  return res.data
}

export default api
