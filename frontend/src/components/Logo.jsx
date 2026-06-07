// MoneyATM Logo：深色漸層底 + 走勢圖示 + 雙色字（點擊回首頁）
import { Link } from 'react-router-dom'

export default function Logo() {
  return (
    <Link
      to="/dashboard"
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl shadow-sm hover:opacity-90 transition-opacity"
      style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}
    >
      {/* 走勢圖示 */}
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" aria-hidden="true">
        {/* 上升趨勢線 */}
        <path
          d="M3 17l5-5 4 4 8-9"
          stroke="#F59E0B"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* 右上箭頭 */}
        <path
          d="M16 7h4v4"
          stroke="#F59E0B"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* 高點圓點 */}
        <circle cx="20" cy="7" r="1.5" fill="#FCD34D" />
      </svg>

      {/* 文字 */}
      <div className="flex items-baseline" style={{ letterSpacing: '-0.02em' }}>
        <span className="text-[15px] font-black text-white">Money</span>
        <span className="text-[15px] font-black" style={{ color: '#F59E0B' }}>ATM</span>
      </div>
    </Link>
  )
}
