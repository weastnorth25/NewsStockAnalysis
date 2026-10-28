// 總經日曆・月曆檢視（類似蘋果行事曆）：週日開頭、6 週 42 格，今天以紅色圓圈標示
import EventChip from './EventChip'
import { WEEKDAYS, weekdayOf } from '../../utils/macroDate'

export default function MonthView({ cells, month, eventsByDay, todayKey, selectedId, onSelect }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
      <div className="min-w-[900px]">
        <div className="grid grid-cols-7 border-b border-gray-200">
          {WEEKDAYS.map((w, i) => (
            <span key={w} className={`px-3 py-2.5 text-xs text-right ${i === 0 || i === 6 ? 'text-gray-400' : 'text-gray-600'}`}>
              週{w}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((day) => {
            const inMonth = Number(day.slice(5, 7)) === month
            const isToday = day === todayKey
            const weekend = weekdayOf(day) % 6 === 0
            const date = Number(day.slice(8, 10))
            const label = date === 1 ? `${Number(day.slice(5, 7))}月1日` : date
            const events = eventsByDay[day] ?? []

            return (
              <div
                key={day}
                className={`min-h-28 p-1.5 flex flex-col gap-[3px] border-r border-b border-gray-100 ${
                  !inMonth ? 'bg-gray-50' : weekend ? 'bg-neutral-50' : 'bg-white'
                }`}
              >
                <div className="flex justify-end">
                  <span
                    className={`min-w-[26px] h-[26px] px-1 rounded-full flex items-center justify-center text-[13px] ${
                      isToday ? 'bg-red-600 text-white font-bold'
                        : !inMonth ? 'text-gray-400'
                        : weekend ? 'text-gray-500' : 'text-gray-900'
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {events.map((e) => (
                  <EventChip
                    key={e.id}
                    event={e}
                    variant="pill"
                    selected={e.id === selectedId}
                    past={day < todayKey}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
