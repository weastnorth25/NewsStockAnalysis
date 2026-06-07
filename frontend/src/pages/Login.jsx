// 登入 / 註冊頁面：使用者輸入帳密後打後端 API，登入成功則將 JWT token 存入 localStorage
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginUser, registerUser } from '../api/stock'

export default function Login() {
  const navigate = useNavigate()
  const [isRegister, setIsRegister] = useState(false)
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  // 遊客登入：存假 token 與顯示名稱，繞過後端直接進入系統
  const handleGuestLogin = () => {
    localStorage.setItem('token', 'guest')
    localStorage.setItem('displayName', '遊客模式')
    navigate('/dashboard')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (isRegister) {
        await registerUser(form.username, form.email, form.password)
        // 註冊成功後自動切換到登入
        setIsRegister(false)
        setForm({ ...form, password: '' })
      } else {
        const data = await loginUser(form.email, form.password)
        localStorage.setItem('token', data.access_token)
        localStorage.setItem('displayName', form.email)   // 先存 email，等 /api/users/me 做好再換
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err.response?.data?.detail || '發生錯誤，請再試一次')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-md p-8">

        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">
            <span className="text-blue-500">Dash</span>
            <span className="text-gray-800">Stack</span>
          </h1>
          <p className="text-sm text-gray-500 mt-2">新聞股票分析系統</p>
        </div>

        {/* 切換 登入 / 註冊 */}
        <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
          <button
            onClick={() => setIsRegister(false)}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              !isRegister ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            登入
          </button>
          <button
            onClick={() => setIsRegister(true)}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              isRegister ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            註冊
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 只有註冊才顯示姓名 */}
          {isRegister && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                required
                placeholder="請輸入姓名"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              placeholder="請輸入 Email"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">密碼</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              placeholder="請輸入密碼"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
            />
          </div>

          {/* 錯誤訊息 */}
          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '處理中...' : isRegister ? '建立帳號' : '登入'}
          </button>
        </form>

        {/* 分隔線 */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">或</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* 遊客登入（繞過後端，方便開發測試用） */}
        <button
          onClick={handleGuestLogin}
          className="w-full py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-600 text-sm font-medium rounded-lg transition"
        >
          以遊客身份瀏覽
        </button>
      </div>
    </div>
  )
}
