// 頂部列：左側搜尋欄（輸入股票代號跳轉）、中間顯示今日日期、右側顯示帳戶狀態
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

// 格式化今天日期：2026年5月25日 週一
function getTodayString() {
  const now = new Date()
  const weekdays = ['週日', '週一', '週二', '週三', '週四', '週五', '週六']
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  const d = now.getDate()
  const w = weekdays[now.getDay()]
  return `${y}年${m}月${d}日 ${w}`
}

export default function Topbar() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  // 讀取帳戶顯示名稱
  const displayName = localStorage.getItem('displayName') || '使用者'
  const isGuest     = localStorage.getItem('token') === 'guest'

  const handleSearch = (e) => {
    e.preventDefault()
    const ticker = query.trim().toUpperCase()
    if (!ticker) return
    navigate(`/stocks?ticker=${ticker}`)
    setQuery('')
  }

  return (
    <header className="fixed top-0 left-48 right-0 h-14 bg-white border-b border-gray-200 flex items-center px-6 z-10 gap-4">

      {/* 左：搜尋欄（1/3 寬度） */}
      <form onSubmit={handleSearch} className="w-1/3">
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

      {/* 中：今日日期 */}
      <div className="flex-1 text-center">
        <span className="text-sm text-gray-500">{getTodayString()}</span>
      </div>

      {/* 右：帳戶顯示 */}
      <div className="flex items-center gap-2">
        {/* 頭像圓圈 */}
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-white ${
          isGuest ? 'bg-gray-400' : 'bg-blue-500'
        }`}>
          {isGuest ? '客' : displayName[0]?.toUpperCase()}
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-gray-700 leading-none">{isGuest ? '遊客模式' : displayName}</p>
          {isGuest && <p className="text-xs text-gray-400 mt-0.5">未登入</p>}
        </div>
      </div>

    </header>
  )
}
