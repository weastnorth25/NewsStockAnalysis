// 路由設定中心，定義所有頁面路徑與Auth Guard（未登入自動跳轉登入頁）
import { lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './components/Layout/MainLayout'
import Login from './pages/Login'
import { pageLoaders } from './pages/loaders'
// 各頁面用 lazy 載入：打開哪一頁才下載那一頁的程式，第一次開網站要下載的檔案比較小
// 載入中的畫面放在 MainLayout 的 Suspense（頂部列和側邊欄不會跟著消失）
// 進網站後 utils/prefetch.js 會在背景把其他頁面先下載好
const Dashboard       = lazy(pageLoaders.Dashboard)
const News            = lazy(pageLoaders.News)
const Stocks          = lazy(pageLoaders.Stocks)
const Favourites      = lazy(pageLoaders.Favourites)
const Settings        = lazy(pageLoaders.Settings)
const Macro           = lazy(pageLoaders.Macro)
const Peers           = lazy(pageLoaders.Peers)
const Financials      = lazy(pageLoaders.Financials)
const Chips           = lazy(pageLoaders.Chips)
const InstitutionPerf = lazy(pageLoaders.InstitutionPerf)
import { getSetting } from './utils/settings'
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
            <Route index element={<Navigate to={getSetting('landingPage')} replace />} />
            <Route path="dashboard"  element={<Dashboard />} />
            <Route path="news"       element={<News />} />
            <Route path="stocks"     element={<Stocks />} />
            <Route path="favourites" element={<Favourites />} />
            <Route path="settings"   element={<Settings />} />

            {/* 分析工具 */}
            <Route path="macro"         element={<Macro />} />
            <Route path="peers"         element={<Peers />} />
            <Route path="financials"    element={<Financials />} />
            <Route path="chips"         element={<Chips />} />
            <Route path="institutions"  element={<InstitutionPerf />} />
          </Route>

          {/* 其他路徑一律跳 dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </ModeProvider>
  )
}
