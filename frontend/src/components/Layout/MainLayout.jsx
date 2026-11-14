// 主版型：頂部列（Topbar）跨滿全寬，Sidebar 可由 Topbar 的漢堡按鈕展開/收合
// 桌機：側邊欄預設展開，把內容往右推；手機（< 768px）：預設收合，展開時蓋在內容上面，點旁邊或點選項就收起來
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import useMediaQuery from '../../hooks/useMediaQuery'

export default function MainLayout() {
  const isMobile = useMediaQuery('(max-width: 767px)')
  // 桌機、手機各記各的開關，從桌機縮成手機寬度時不會突然蓋住內容
  const [desktopOpen, setDesktopOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const open = isMobile ? mobileOpen : desktopOpen

  const toggle = () => (isMobile ? setMobileOpen((o) => !o) : setDesktopOpen((o) => !o))

  return (
    <div className="min-h-screen bg-gray-100">
      <Topbar onToggleSidebar={toggle} sidebarOpen={open} />
      {isMobile && mobileOpen && (
        <div className="fixed inset-0 top-14 z-20 bg-black/30" onClick={() => setMobileOpen(false)} aria-hidden="true" />
      )}
      <Sidebar open={open} onNavigate={isMobile ? () => setMobileOpen(false) : undefined} />
      <main className={`pt-14 p-4 md:p-6 transition-[margin] duration-200 ${!isMobile && desktopOpen ? 'ml-48' : 'ml-0'}`}>
        <Outlet />
      </main>
    </div>
  )
}
