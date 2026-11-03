// 個股標題列：自選星星（名稱前）、名稱、代號、產業、股價漲跌；專業版右側放時間區間切換
import { changeClass, fmtNum } from '../../utils/market'
import { RANGES_PRO } from './constants'

export function RangeTabs({ value, onChange, options }) {
  return (
    <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
      {options.map((o) => {
        const [key, label] = Array.isArray(o) ? o : [o, o]
        return (
          <button
            key={key}
            type="button"
            aria-pressed={value === key}
            onClick={() => onChange(key)}
            className={`px-3 py-1 rounded-md text-[13px] ${value === key ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'}`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

export const MockBadge = ({ show = true }) =>
  show ? <span className="text-[11px] text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">示意</span> : null

export default function StockHeader({ symbol, name, industry, quote, watch, range, onRange }) {
  const d = quote.data
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex flex-wrap items-center gap-4">
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {watch.visible && (
            <button
              type="button"
              onClick={watch.toggle}
              disabled={watch.busy}
              aria-pressed={watch.active}
              aria-label={watch.active ? '從自選移除' : '加入自選'}
              title={watch.active ? '從自選移除' : '加入自選'}
              className="w-9 h-9 rounded-lg border border-gray-200 bg-white flex items-center justify-center hover:bg-amber-50 disabled:opacity-50"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill={watch.active ? '#f59e0b' : 'none'} stroke="#f59e0b" strokeWidth="2" aria-hidden="true">
                <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
              </svg>
            </button>
          )}
          <h1 className="text-[22px] font-bold text-gray-900">{name}</h1>
          <span className="text-sm text-gray-500">{symbol}</span>
          {industry && <span className="text-[11px] text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">{industry}</span>}
        </div>
        {quote.loading && <p className="text-sm text-gray-400">載入中...</p>}
        {quote.error && <p className="text-sm text-gray-400">無法取得即時報價</p>}
        {d && (
          <p className="flex items-baseline gap-2.5">
            <span className="text-3xl font-bold text-gray-900">{fmtNum(d.current_price)}</span>
            <span className={`text-[15px] font-medium ${changeClass(d.change_pct)}`}>
              {d.change > 0 ? '+' : ''}{fmtNum(d.change)}（{d.change_pct > 0 ? '+' : ''}{d.change_pct}%）
            </span>
          </p>
        )}
      </div>
      {onRange && (
        <>
          <div className="flex-1" />
          <RangeTabs value={range} onChange={onRange} options={RANGES_PRO} />
        </>
      )}
    </div>
  )
}
