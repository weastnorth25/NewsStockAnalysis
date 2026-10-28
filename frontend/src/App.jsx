// 路由設定中心，定義所有頁面路徑與Auth Guard（未登入自動跳轉登入頁）
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './components/Layout/MainLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import News from './pages/News'
import Stocks from './pages/Stocks'
import Favourites from './pages/Favourites'
import Sentiment from './pages/Sentiment'
import Settings from './pages/Settings'
import Macro from './pages/Macro'
import Peers from './pages/Peers'
import Financials from './pages/Financials'
import Chips from './pages/Chips'
import InstitutionPerf from './pages/InstitutionPerf'
import PaperTrading from './pages/PaperTrading'
import Portfolio from './pages/Portfolio'
import { ModeProvider } from './context/ModeProvider'

// 簡單的 Auth Guard：沒有 token 就跳回登入頁
function RequireAuth({ children }) {
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <ModeProvider>
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
            <Route path="sentiment"  element={<Sentiment />} />
            <Route path="settings"   element={<Settings />} />

            {/* 分析工具 */}
            <Route path="macro"         element={<Macro />} />
            <Route path="peers"         element={<Peers />} />
            <Route path="financials"    element={<Financials />} />
            <Route path="chips"         element={<Chips />} />
            <Route path="institutions"  element={<InstitutionPerf />} />
            <Route path="paper-trading" element={<PaperTrading />} />
            <Route path="portfolio"     element={<Portfolio />} />
          </Route>

          {/* 其他路徑一律跳 dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </ModeProvider>
  )
}
