// 總經日曆・橫向時間軸：兩週 10 個交易日，事件掛在每天下方；今天以前的節點與線段填滿藍色
import EventChip from './EventChip'
import { WEEKDAYS, weekdayOf, formatMD } from '../../utils/macroDate'

export default function TimelineView({ days, eventsByDay, todayKey, selectedId, onSelect }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-2 pt-4 pb-2 overflow-x-auto">
      <div className="grid grid-cols-10 min-w-[1100px]">
        {days.map((day) => {
          const isToday = day === todayKey
          const past = day < todayKey
          const lineColor = past || isToday ? '#2563eb' : '#d1d5db'
          const events = eventsByDay[day] ?? []

          return (
            <div key={day} className={`flex flex-col gap-1.5 px-1 rounded-lg ${isToday ? 'bg-blue-50' : ''}`}>
              <div className="text-center pt-1.5">
                <span className={`block text-[11px] ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
                  {isToday ? '今天' : `週${WEEKDAYS[weekdayOf(day)]}`}
                </span>
                <span className={`block text-base font-bold ${isToday ? 'text-blue-600' : past ? 'text-gray-500' : 'text-gray-900'}`}>
                  {formatMD(day)}
                </span>
              </div>

              {/* 時間軸的線與節點 */}
              <div className="relative h-4" aria-hidden="true">
                <span className="absolute -left-1 -right-1 top-[7px] h-0.5" style={{ background: lineColor }} />
                <span
                  className="absolute left-1/2 top-0.5 -ml-1.5 w-3 h-3 rounded-full border-2"
                  style={{ borderColor: lineColor, background: past ? '#2563eb' : '#fff' }}
                />
              </div>

              <div className="flex flex-col gap-1 min-h-40 pb-2">
                {events.map((e) => (
                  <EventChip
                    key={e.id}
                    event={e}
                    selected={e.id === selectedId}
                    past={past}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
