// 總經事件小卡：時間軸用 variant="card"，月曆格子用 variant="pill"；顏色依類別，重要性高的加粗框
import { MACRO_CATEGORIES, COUNTRIES } from '../../data/macroEvents'
import { formatTime } from '../../utils/macroDate'

export default function EventChip({ event, variant = 'card', selected, past, onSelect }) {
  const cat = MACRO_CATEGORIES[event.category]
  const high = event.importance === 'high'
  const ring = selected ? '0 0 0 3px rgba(37,99,235,.35)' : 'none'

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={() => onSelect(event.id)}
        aria-pressed={selected}
        title={event.name}
        className={`flex items-center gap-1.5 w-full text-left rounded px-1.5 py-0.5 text-xs truncate hover:brightness-95 ${high ? 'font-bold' : ''} ${past ? 'opacity-60' : ''}`}
        style={{ background: cat.tagBg, color: cat.tagFg, boxShadow: ring }}
      >
        <span className="shrink-0 w-[3px] h-3 rounded-sm" style={{ background: cat.color }} />
        <span className="truncate">{formatTime(event.datetime)} {event.short}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(event.id)}
      aria-pressed={selected}
      className={`flex flex-col gap-0.5 text-left rounded-lg px-2 py-1.5 hover:brightness-95 ${past ? 'opacity-60' : ''}`}
      style={{ background: cat.light, border: `${high ? 2 : 1}px solid ${high ? cat.color : '#e5e7eb'}`, boxShadow: ring }}
    >
      <span className="flex items-center gap-1.5 text-[11px] text-gray-600">
        <span className="w-2 h-2 rounded-sm" style={{ background: cat.color }} />
        {formatTime(event.datetime)}・{COUNTRIES[event.country] ?? event.country}
      </span>
      <span className={`text-[13px] leading-snug text-gray-900 ${high ? 'font-bold' : 'font-medium'}`}>{event.short}</span>
    </button>
  )
}
