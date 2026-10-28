// 總經日曆頁面：橫向兩週時間軸／月曆兩種檢視，依類別上色與篩選，點事件在下方看詳細與 AI 解讀
import { useEffect, useMemo, useState } from 'react'
import { useMode } from '../context/mode'
import { fetchMacroEvents } from '../api/macro'
import { MACRO_CATEGORIES } from '../data/macroEvents'
import { toDayKey, addDays, startOfWeek, buildTradingDays, buildMonthGrid, groupByDay, formatMD } from '../utils/macroDate'
import TimelineView from '../components/macro/TimelineView'
import MonthView from '../components/macro/MonthView'
import EventDetail from '../components/macro/EventDetail'

// 預設選中：下一個「重要性高」的事件，沒有就選下一個事件，再沒有就選最後一個
function pickDefault(events) {
  const now = new Date().toISOString()
  const upcoming = events.filter((e) => e.datetime >= now)
  return (upcoming.find((e) => e.importance === 'high') ?? upcoming[0] ?? events.at(-1))?.id ?? null
}

export default function Macro() {
  const { isPro } = useMode()
  const todayKey = toDayKey(new Date())

  const [events, setEvents]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(false)
  const [view, setView]             = useState('timeline')   // 'timeline' | 'month'
  const [hidden, setHidden]         = useState(() => new Set())
  const [selectedId, setSelectedId] = useState(null)
  const [weekStart, setWeekStart]   = useState(() => startOfWeek(todayKey))
  const [month, setMonth]           = useState(() => ({ y: Number(todayKey.slice(0, 4)), m: Number(todayKey.slice(5, 7)) }))

  // 第一次進頁面載入事件
  useEffect(() => {
    let cancelled = false
    fetchMacroEvents()
      .then((data) => {
        if (cancelled) return
        setEvents(data)
        setSelectedId(pickDefault(data))
      })
      .catch(() => { if (!cancelled) setError(true) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const eventsByDay = useMemo(
    () => groupByDay(events.filter((e) => !hidden.has(e.category))),
    [events, hidden],
  )
  const selected = events.find((e) => e.id === selectedId)

  const isTimeline = view === 'timeline'
  const days  = buildTradingDays(weekStart, 2)
  const cells = buildMonthGrid(month.y, month.m)
  const rangeLabel = isTimeline ? `${formatMD(days[0])} – ${formatMD(days.at(-1))}` : `${month.y} 年 ${month.m} 月`

  const shift = (dir) => {
    if (isTimeline) setWeekStart((w) => addDays(w, dir * 7))
    else setMonth(({ y, m }) => {
      const n = m + dir
      return n < 1 ? { y: y - 1, m: 12 } : n > 12 ? { y: y + 1, m: 1 } : { y, m: n }
    })
  }

  const goToday = () => {
    setWeekStart(startOfWeek(todayKey))
    setMonth({ y: Number(todayKey.slice(0, 4)), m: Number(todayKey.slice(5, 7)) })
  }

  const toggleCategory = (id) => setHidden((prev) => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  return (
    <div className="flex flex-col gap-4">
      {/* 標題列 */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-gray-900">總經日曆</h1>
        <span className="text-xs text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">示意數據</span>
        <span className="text-xs text-gray-500">時間皆為台灣時間・點選事件看詳細</span>
        <div className="flex-1" />

        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5">
          <button type="button" aria-label={isTimeline ? '上一週' : '上個月'} onClick={() => shift(-1)} className="w-8 h-8 rounded-md text-gray-600 hover:bg-gray-100">‹</button>
          <span className="text-[13px] font-medium px-1.5 min-w-[96px] text-center">{rangeLabel}</span>
          <button type="button" aria-label={isTimeline ? '下一週' : '下個月'} onClick={() => shift(1)} className="w-8 h-8 rounded-md text-gray-600 hover:bg-gray-100">›</button>
        </div>
        <button type="button" onClick={goToday} className="border border-gray-200 bg-white rounded-lg px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50">今天</button>

        <div role="tablist" aria-label="檢視方式" className="flex gap-1 bg-gray-200 rounded-lg p-0.5">
          {[['timeline', '時間軸'], ['month', '月曆']].map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              onClick={() => setView(id)}
              className={`px-3 py-1.5 rounded-md text-[13px] ${view === id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 類別篩選 */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-500 mr-1">類別</span>
        {Object.entries(MACRO_CATEGORIES).map(([id, cat]) => {
          const off = hidden.has(id)
          return (
            <button
              key={id}
              type="button"
              aria-pressed={!off}
              onClick={() => toggleCategory(id)}
              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] border"
              style={{ background: off ? '#fff' : cat.light, borderColor: off ? '#e5e7eb' : cat.tagBg, color: off ? '#9ca3af' : '#111827' }}
            >
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: off ? '#d1d5db' : cat.color }} />
              {cat.label}
            </button>
          )
        })}
        <span className="text-xs text-gray-500 ml-2">粗框＝重要性高・點類別可篩選</span>
      </div>

      {loading && <p className="text-sm text-gray-400">載入中...</p>}
      {error && <p className="text-sm text-gray-400">無法取得總經資料</p>}

      {!loading && !error && (
        <>
          {isTimeline ? (
            <TimelineView days={days} eventsByDay={eventsByDay} todayKey={todayKey} selectedId={selectedId} onSelect={setSelectedId} />
          ) : (
            <MonthView cells={cells} month={month.m} eventsByDay={eventsByDay} todayKey={todayKey} selectedId={selectedId} onSelect={setSelectedId} />
          )}
          <EventDetail event={selected} isPro={isPro} />
          <p className="text-xs text-gray-500">AI 解讀僅供參考，非投資建議。</p>
        </>
      )}
    </div>
  )
}
