// 左側導覽列：由 MainLayout 控制展開/收合，僅顯示主要頁面連結
import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/dashboard',  label: '首頁' },
  { to: '/news',       label: '新聞' },
  { to: '/stocks',     label: '股票' },
  { to: '/favourites', label: '自選' },
  { to: '/sentiment',  label: '市場情緒' },
]

export default function Sidebar({ open }) {
  return (
    <aside
      className={`w-48 bg-white border-r border-gray-200 fixed left-0 top-14 bottom-0 z-10 transition-transform duration-200 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <nav className="px-3 py-4 space-y-1">
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
    </aside>
  )
}
