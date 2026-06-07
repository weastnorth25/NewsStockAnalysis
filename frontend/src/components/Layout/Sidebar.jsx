// 左側導覽列：顯示所有頁面連結，目前選中的頁面會標藍，底部有 Settings 與登出按鈕
import { NavLink, useNavigate } from 'react-router-dom'
import Logo from '../Logo'

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/news',      label: 'News' },
  { to: '/stocks',    label: 'Stocks' },
  { to: '/favourites',label: 'Favourites' },
]

export default function Sidebar() {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  return (
    <aside className="w-48 min-h-screen bg-white border-r border-gray-200 flex flex-col fixed left-0 top-0">

      {/* Logo 區域 */}
      <div className="px-3 py-4 border-b border-gray-100">
        <Logo />
      </div>

      {/* 主選單 */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'text-blue-500 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* 底部：Settings + Logout */}
      <div className="px-3 py-4 border-t border-gray-100 space-y-1">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActive ? 'text-blue-500 bg-blue-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`
          }
        >
          Settings
        </NavLink>
        <button
          onClick={handleLogout}
          className="w-full text-left px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
        >
          Logout
        </button>
      </div>
    </aside>
  )
}
