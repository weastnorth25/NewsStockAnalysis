// 頂部搜尋框：可以打代號（2330）或中文名稱（台積電、台積），輸入時跳出建議清單
// 鍵盤：↑↓ 選擇、Enter 前往、Esc 關閉；沒有符合的名稱時，Enter 直接把輸入當代號查
import { useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { searchStocks } from '../../data/stockNames'

// 這幾頁都是看單一股票：在這些頁搜尋就留在原頁換股票，其他頁一律去股票頁
const STOCK_PAGES = ['/stocks', '/peers', '/financials', '/chips', '/institutions']

export default function StockSearch() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const boxRef = useRef(null)

  const hits = searchStocks(query)
  const showList = open && query.trim() !== '' && hits.length > 0

  const go = (code) => {
    navigate(`${STOCK_PAGES.includes(pathname) ? pathname : '/stocks'}?ticker=${code}`)
    setQuery('')
    setOpen(false)
  }

  const submit = (e) => {
    e.preventDefault()
    const q = query.trim().toUpperCase()
    if (!q) return
    // 有建議就去選中的那一支；沒有建議、看起來像代號（英數字）就直接查
    if (hits.length) go(hits[Math.min(active, hits.length - 1)].code)
    else if (/^[0-9A-Z.^=-]+$/.test(q)) go(q)
  }

  const onKeyDown = (e) => {
    if (!showList) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => (i + 1) % hits.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => (i - 1 + hits.length) % hits.length) }
    else if (e.key === 'Escape') setOpen(false)
  }

  return (
    <form onSubmit={submit} className="relative w-36 sm:w-72 min-w-0 shrink" ref={boxRef}
      onBlur={(e) => { if (!boxRef.current?.contains(e.relatedTarget)) setOpen(false) }}>
      <div className="flex items-center bg-gray-100 rounded-full px-3 py-1.5 gap-2">
        <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <label htmlFor="stock-search" className="sr-only">搜尋股票代號或名稱</label>
        <input
          id="stock-search"
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls="stock-search-list"
          aria-activedescendant={showList ? `stock-search-${hits[active]?.code}` : undefined}
          autoComplete="off"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(0) }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="搜尋代號或名稱..."
          className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none w-full"
        />
      </div>
      {showList && (
        <ul id="stock-search-list" role="listbox"
          className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-40 min-w-56">
          {hits.map((h, i) => (
            <li key={h.code} id={`stock-search-${h.code}`} role="option" aria-selected={i === active}>
              <button type="button" tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={() => go(h.code)}
                onMouseEnter={() => setActive(i)}
                className={`w-full text-left px-3 py-2 text-sm flex gap-2 ${i === active ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}>
                <span className="font-medium">{h.name}</span>
                <span className="text-gray-500">{h.code}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  )
}
