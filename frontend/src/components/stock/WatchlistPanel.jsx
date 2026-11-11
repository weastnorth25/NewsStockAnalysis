// 股票頁左側的自選股抽屜：預設收合，按「自選股」才展開；寬度用 transition 做滑出效果（跟主側邊欄一樣）
import { getStockName } from '../../data/stockNames'

export function WatchlistToggle({ open, count, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls="watchlist-panel"
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
        open ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
      }`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
      </svg>
      自選股{count > 0 && <span className="text-gray-500">（{count}）</span>}
      <svg
        width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"
        className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      >
        <path d="M9 6l6 6-6 6" />
      </svg>
    </button>
  )
}

// status：'guest' | 'loading' | 'error' | 'ok'
export default function WatchlistPanel({ open, items, status, current, onSelect }) {
  const hint = {
    guest: '登入後才能使用自選股',
    loading: '載入中…',
    error: '自選股載入失敗',
  }[status] ?? (items.length === 0 ? '還沒有自選股，按股票名稱前的 ☆ 加入' : null)

  return (
    <div
      id="watchlist-panel"
      hidden={!open}
      className="w-36 shrink-0 mr-4 bg-white rounded-xl border border-gray-200 overflow-hidden"
    >
      {hint ? (
        <p className="px-4 py-3 text-xs text-gray-500 leading-relaxed">{hint}</p>
      ) : (
        items.map((s) => (
          <button
            key={s.symbol}
            type="button"
            onClick={() => onSelect(s.symbol)}
            aria-current={current === s.symbol ? 'true' : undefined}
            className={`w-full text-left px-4 py-3 text-sm border-b border-gray-100 last:border-0 transition-colors ${
              current === s.symbol ? 'text-blue-600 font-semibold bg-blue-50' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <p>{s.symbol}</p>
            <p className="text-xs text-gray-500 font-normal truncate">{getStockName(s.symbol, s.name) || s.symbol}</p>
          </button>
        ))
      )}
    </div>
  )
}
