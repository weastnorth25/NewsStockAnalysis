// 頂部列：漢堡選單 + 搜尋欄 + 置中 Logo + 右側帳戶下拉選單（含 Settings / Logout）
import { useState, useRef, useEffect } from 'react'
import { useNavigate, NavLink } from 'react-router-dom'
import Logo from '../Logo'

export default function Topbar({ onToggleSidebar }) {
  const [query, setQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const navigate = useNavigate()

  const displayName = localStorage.getItem('displayName') || '使用者'
  const isGuest     = localStorage.getItem('token') === 'guest'

  // 點選單外面就關掉
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    const ticker = query.trim().toUpperCase()
    if (!ticker) return
    navigate(`/stocks?ticker=${ticker}`)
    setQuery('')
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('displayName')
    setMenuOpen(false)
    navigate('/login')
  }

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 flex items-center px-4 z-20 gap-4">

      {/* 漢堡：切換 Sidebar */}
      <button
        onClick={onToggleSidebar}
        className="p-2 rounded-md hover:bg-gray-100 text-gray-600 shrink-0"
        aria-label="切換選單"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* 搜尋股票 */}
      <form onSubmit={handleSearch} className="w-72 shrink-0">
        <div className="flex items-center bg-gray-100 rounded-full px-3 py-1.5 gap-2">
          <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜尋股票代號..."
            className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none w-full"
          />
        </div>
      </form>

      {/* 置中 Logo（絕對定位，跟其他元素獨立） */}
      <div className="absolute left-1/2 -translate-x-1/2">
        <Logo />
      </div>

      {/* 推到右邊 */}
      <div className="flex-1" />

      {/* 帳戶下拉選單 */}
      <div className="relative shrink-0" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors"
        >
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-white ${
            isGuest ? 'bg-gray-400' : 'bg-blue-500'
          }`}>
            {isGuest ? '客' : displayName[0]?.toUpperCase()}
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-xs font-medium text-gray-700 leading-none">{isGuest ? '遊客模式' : displayName}</p>
            {isGuest && <p className="text-xs text-gray-400 mt-0.5">未登入</p>}
          </div>
          <svg className={`w-3 h-3 text-gray-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
            {!isGuest && (
              <div className="px-4 py-2.5 border-b border-gray-100">
                <p className="text-xs text-gray-400">已登入</p>
                <p className="text-sm font-medium text-gray-700 truncate">{displayName}</p>
              </div>
            )}
            <NavLink
              to="/settings"
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              設定
            </NavLink>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 border-t border-gray-100 transition-colors"
            >
              {isGuest ? '前往登入' : '登出'}
            </button>
          </div>
        )}
      </div>

    </header>
  )
}
