// 股票選擇列：常用股票快速切換＋輸入代號；選擇結果寫進網址 ?ticker=，各分析頁共用同一支股票
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { mockStockList } from '../../data/mockData'
import { searchStocks } from '../../data/stockNames'

export default function StockPicker({ symbol }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [input, setInput] = useState('')

  const go = (code) => navigate(`${pathname}?ticker=${code}`)
  const submit = (e) => {
    e.preventDefault()
    // 可以打代號或名稱（例如「長榮」），有符合的名稱就用第一筆，否則當代號查
    const q = input.trim()
    const code = searchStocks(q)[0]?.code ?? q.toUpperCase()
    if (code) go(code)
    setInput('')
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {mockStockList.map((s) => (
        <button
          key={s.symbol}
          type="button"
          onClick={() => go(s.symbol)}
          aria-pressed={symbol === s.symbol}
          className={`px-3 py-1.5 rounded-full text-[13px] border ${
            symbol === s.symbol ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          {s.name} <span className="text-gray-500">{s.symbol}</span>
        </button>
      ))}
      <form onSubmit={submit} className="flex items-center gap-1">
        <label className="sr-only" htmlFor="stock-picker-input">輸入股票代號或名稱</label>
        <input
          id="stock-picker-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="代號或名稱"
          className="w-24 px-2.5 py-1.5 text-[13px] border border-gray-200 rounded-full outline-none focus:border-blue-300"
        />
      </form>
    </div>
  )
}
