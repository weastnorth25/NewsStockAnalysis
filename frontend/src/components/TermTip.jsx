// 名詞解釋小問號：滑鼠移過去、Tab 到或點一下顯示說明，點一下會固定
import { useState } from 'react'

export default function TermTip({ text }) {
  const [hover, setHover] = useState(false)
  const [pinned, setPinned] = useState(false)
  const open = hover || pinned
  return (
    <span className="relative">
      <button
        type="button"
        aria-label="名詞解釋"
        aria-expanded={open}
        onClick={() => setPinned((p) => !p)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocus={() => setHover(true)}
        onBlur={() => { setHover(false); setPinned(false) }}
        className={`w-7 h-7 rounded-full border text-[13px] ${open ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-300'}`}
      >
        ?
      </button>
      {open && (
        <span role="tooltip" className="absolute right-0 bottom-9 z-20 w-60 bg-gray-900 text-gray-100 text-xs leading-relaxed rounded-lg px-3 py-2.5 shadow-xl">
          {text}
        </span>
      )}
    </span>
  )
}
