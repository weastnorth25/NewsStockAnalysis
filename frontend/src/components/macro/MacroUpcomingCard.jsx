// 「近期總經事件」小卡：首頁、個股頁共用；variant="pro" 顯示預期／前值，variant="beginner" 顯示白話說明
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchMacroEvents } from '../../api/macro'
import { MACRO_CATEGORIES, IMPORTANCE } from '../../data/macroEvents'
import { toDayKey, formatTime, formatMD, WEEKDAYS, weekdayOf } from '../../utils/macroDate'

export default function MacroUpcomingCard({ variant = 'pro', limit = 4, title }) {
  const [events, setEvents] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetchMacroEvents()
      .then((data) => {
        if (cancelled) return
        const now = new Date().toISOString()
        setEvents(data.filter((e) => e.datetime >= now).slice(0, limit))
      })
      .catch(() => { if (!cancelled) setEvents([]) })
    return () => { cancelled = true }
  }, [limit])

  const beginner = variant === 'beginner'

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3 min-w-0">
      <div className="flex justify-between items-center">
        <p className={`font-bold text-gray-900 ${beginner ? 'text-base' : 'text-sm'}`}>{title ?? (beginner ? '這週要注意' : '近期總經事件')}</p>
        <Link to="/macro" className="text-xs text-blue-600 hover:text-blue-700">{beginner ? '完整日曆' : '看日曆'}</Link>
      </div>

      {events === null && <p className="text-sm text-gray-400">載入中...</p>}
      {events?.length === 0 && <p className="text-sm text-gray-400">近期沒有重要事件</p>}

      {events?.map((e) => {
        const day = toDayKey(e.datetime)
        const cat = MACRO_CATEGORIES[e.category]
        const high = e.importance === 'high'

        return (
          <Link
            key={e.id}
            to="/macro"
            className={`grid gap-3 items-center pb-2.5 border-b border-gray-100 last:border-0 hover:bg-gray-50 rounded-md ${beginner ? 'grid-cols-[52px_1fr]' : 'grid-cols-[52px_1fr_auto]'}`}
          >
            <div className="text-center rounded-md py-1" style={{ background: high ? cat.tagBg : '#f9fafb', color: high ? cat.tagFg : '#111827' }}>
              <span className="block text-[11px] opacity-80">週{WEEKDAYS[weekdayOf(day)]}</span>
              <span className="block text-base font-bold">{formatMD(day)}</span>
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-gray-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: cat.color }} />
                <span className="truncate">{e.name}</span>
                <span className="text-xs text-gray-500 font-normal shrink-0">{formatTime(e.datetime)}</span>
              </p>
              {beginner ? (
                <p className="text-xs text-gray-600 leading-relaxed mt-0.5">{e.aiSummary}</p>
              ) : (
                <p className="text-xs text-gray-500 mt-0.5">預期 {e.expected ?? '—'}・前值 {e.previous ?? '—'}</p>
              )}
            </div>
            {!beginner && (
              <span className={`text-[11px] px-2 py-0.5 rounded-full ${IMPORTANCE[e.importance].className}`}>{IMPORTANCE[e.importance].label}</span>
            )}
          </Link>
        )
      })}
    </div>
  )
}
