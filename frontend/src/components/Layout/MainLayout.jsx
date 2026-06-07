// 主版型：頂部列（Topbar）跨滿全寬，Sidebar 可由 Topbar 的漢堡按鈕展開/收合
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="min-h-screen bg-gray-100">
      <Topbar onToggleSidebar={() => setSidebarOpen(o => !o)} />
      <Sidebar open={sidebarOpen} />
      <main className={`pt-14 p-6 transition-[margin] duration-200 ${sidebarOpen ? 'ml-48' : 'ml-0'}`}>
        <Outlet />
      </main>
    </div>
  )
}
