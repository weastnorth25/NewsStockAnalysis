// 路由設定中心，定義所有頁面路徑與 Auth Guard（未登入自動跳轉登入頁）
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './components/Layout/MainLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import News from './pages/News'
import Stocks from './pages/Stocks'
import Favourites from './pages/Favourites'
import Settings from './pages/Settings'

// 簡單的 Auth Guard：沒有 token 就跳回登入頁
function RequireAuth({ children }) {
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 公開路由 */}
        <Route path="/login" element={<Login />} />

        {/* 需要登入的路由 */}
        <Route
          path="/"
          element={
            <RequireAuth>
              <MainLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"  element={<Dashboard />} />
          <Route path="news"       element={<News />} />
          <Route path="stocks"     element={<Stocks />} />
          <Route path="favourites" element={<Favourites />} />
          <Route path="settings"   element={<Settings />} />
        </Route>

        {/* 其他路徑一律跳 dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
