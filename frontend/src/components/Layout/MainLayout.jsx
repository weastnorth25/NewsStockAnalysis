// 主版型：將側邊欄（Sidebar）、頂部列（Topbar）與各頁面內容（Outlet）組合在一起
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar />
      <Topbar />
      {/* 主內容區，讓開 sidebar(192px) + topbar(56px) 的空間 */}
      <main className="ml-48 pt-14 p-6">
        <Outlet />
      </main>
    </div>
  )
}
