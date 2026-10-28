// 問號說明：滑鼠移過去、鍵盤 Tab 到、或點一下都會顯示「這個數據和股價的關係」；點一下會固定，再點一次關閉
import { useState } from 'react'
import { CATEGORY_RELATION } from '../../data/macroEvents'

export default function RelationTip({ category }) {
  const [hover, setHover] = useState(false)
  const [pinned, setPinned] = useState(false)
  const open = hover || pinned
  const rel = CATEGORY_RELATION[category]
  if (!rel) return null

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="這個數據和股價的關係"
        aria-expanded={open}
        onClick={() => setPinned((p) => !p)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocus={() => setHover(true)}
        onBlur={() => { setHover(false); setPinned(false) }}
        className={`w-7 h-7 rounded-full border text-sm font-bold cursor-help ${
          open ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-300'
        }`}
      >
        ?
      </button>

      {open && (
        <div role="tooltip" className="absolute -left-3 top-10 z-20 w-[340px] max-w-[80vw] bg-gray-900 text-gray-50 rounded-xl px-4 py-3.5 shadow-xl flex flex-col gap-2">
          <span className="absolute left-5 -top-1.5 w-3 h-3 bg-gray-900 rotate-45" />
          <span className="text-[13px] font-bold">這個數據和股價的關係</span>
          <span className="text-[13px] leading-relaxed text-gray-200">{rel.text}</span>
          <span className="text-xs leading-relaxed text-gray-300 border-t border-gray-700 pt-2">最敏感的族群：{rel.sensitive}</span>
        </div>
      )}
    </div>
  )
}
