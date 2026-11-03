// 股票頁面（個股 dashboard）：左側股票列表，右側依選中股票顯示卡片網格
// 專業模式 ProStock、新手模式 BeginnerStock；資料在這層依序載入（報價 → 歷史股價 → 同業），避免後端 yfinance 被並行請求鎖住
import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useMode } from '../context/mode'
import { fetchStockInfo, fetchWatchlist, addToWatchlist, removeFromWatchlist, toFullTicker, toDisplaySymbol } from '../api/stock'
import { fetchHistory, fetchPeers, fetchFundamentals, fetchInstitutional, fetchInstitutionalPerf } from '../api/stockData'
import { mockStockList, mockStockDetail, mockNews } from '../data/mockData'
import { getStockName } from '../data/stockNames'
import { getPeers, INDUSTRY_LABELS } from '../data/industryPeers'
import useAsync from '../hooks/useAsync'
import StockHeader from '../components/stock/StockHeader'
import ProStock from '../components/stock/ProStock'
import BeginnerStock from '../components/stock/BeginnerStock'
import { PEER_COLORS, BENCH_STYLES } from '../components/stock/constants'

// tooltip 顯示當天股價時的貨幣符號
function currencyOf(ticker) {
  if (ticker.startsWith('^')) return ''
  if (ticker.endsWith('.TW')) return 'NT$'
  if (ticker.endsWith('.KS')) return '₩'
  if (ticker.endsWith('.HK')) return 'HK$'
  if (ticker.endsWith('.CO')) return 'kr '
  return 'US$'
}

export default function Stocks() {
  const { isPro } = useMode()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const symbol = searchParams.get('ticker') || mockStockList[0].symbol
  const [range, setRange] = useState('3M')

  // ① 即時報價 → ② 歷史股價 → ③ 同業，前一支有結果（成功或失敗）才打下一支
  // 注意不能用 !loading 判斷：還沒開始載入時 loading 也是 false
  const settled = (r) => r.data != null || r.error != null
  const quote = useAsync(symbol, () => fetchStockInfo(toFullTicker(symbol)))
  const lastClose = quote.data?.current_price ?? mockStockDetail[symbol]?.close
  const history = useAsync(settled(quote) ? `${symbol}|${range}` : null, () => fetchHistory(symbol, range, lastClose))
  const peerSet = getPeers(symbol, quote.data?.industry_key)
  const peers = useAsync(settled(history) && peerSet.peers.length ? `${symbol}|${range}|peers` : null,
    () => fetchPeers(symbol, range, peerSet, lastClose))

  // 財報、籌碼、法人績效（目前是示意資料，之後走資料庫，不經過 yfinance）
  const fund = useAsync(symbol, () => fetchFundamentals(symbol))
  const inst = useAsync(symbol, () => fetchInstitutional(symbol))
  const perf = useAsync(symbol, () => fetchInstitutionalPerf(symbol))

  const name = mockStockList.find((s) => s.symbol === symbol)?.name || getStockName(symbol, quote.data?.company_name) || symbol
  const news = mockNews.filter((n) => n.relatedStocks?.includes(symbol))

  // 同業圖的線條設定：主角 → 同業 → 基準指數
  const peerLines = peerSet.peers.length ? [
    { ticker: toFullTicker(symbol), name, color: '#2563eb', width: 2.5, currency: 'NT$' },
    ...peerSet.peers.map((p, i) => ({ ticker: p.ticker, name: p.name, color: PEER_COLORS[i % PEER_COLORS.length], width: 2, currency: currencyOf(p.ticker) })),
    ...peerSet.benchmarks.map((b, i) => ({ ticker: b.ticker, name: b.name, color: BENCH_STYLES[i].color, dash: BENCH_STYLES[i].dash, width: 1.5, currency: '' })),
  ] : []

  // ─── 自選股 ───
  const isGuest = localStorage.getItem('token') === 'guest'
  const [watchlistSymbols, setWatchlistSymbols] = useState(() => new Set())
  const [watchlistBusy, setWatchlistBusy] = useState(false)
  const inWatchlist = watchlistSymbols.has(symbol)

  // 載入一次自選股清單（後端存的是 .TW 格式，前端統一 strip 後存）
  useEffect(() => {
    if (isGuest) return
    fetchWatchlist()
      .then((items) => setWatchlistSymbols(new Set(items.map((i) => toDisplaySymbol(i.symbol)))))
      .catch(() => {})
  }, [isGuest])

  const toggleWatchlist = async () => {
    setWatchlistBusy(true)
    try {
      if (inWatchlist) {
        await removeFromWatchlist(toFullTicker(symbol))
        setWatchlistSymbols((prev) => { const n = new Set(prev); n.delete(symbol); return n })
      } else {
        await addToWatchlist(toFullTicker(symbol))
        setWatchlistSymbols((prev) => new Set(prev).add(symbol))
      }
    } catch (err) {
      alert('操作失敗：' + (err.response?.data?.detail || err.message))
    } finally {
      setWatchlistBusy(false)
    }
  }

  const d = {
    symbol, name, range, setRange, quote, history, peers, fund, inst, perf, news, peerLines,
    industryLabel: INDUSTRY_LABELS[peerSet.industryKey],
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold text-gray-900">股票</h1>

      <div className="flex gap-4 items-start">
        {/* 左側：股票清單 */}
        <div className="w-36 shrink-0 bg-white rounded-xl border border-gray-200 overflow-hidden">
          {mockStockList.map((stock) => (
            <button
              key={stock.symbol}
              type="button"
              onClick={() => navigate(`/stocks?ticker=${stock.symbol}`)}
              className={`w-full text-left px-4 py-3 text-sm border-b border-gray-100 last:border-0 transition-colors ${
                symbol === stock.symbol ? 'text-blue-600 font-semibold bg-blue-50' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <p>{stock.symbol}</p>
              <p className="text-xs text-gray-500 font-normal truncate">{stock.name}</p>
            </button>
          ))}
        </div>

        {/* 右側：個股 dashboard */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          <StockHeader
            symbol={symbol}
            name={name}
            industry={INDUSTRY_LABELS[peerSet.industryKey]}
            quote={quote}
            watch={{ visible: !isGuest, active: inWatchlist, busy: watchlistBusy, toggle: toggleWatchlist }}
            range={range}
            onRange={isPro ? setRange : null}
          />
          {isPro ? <ProStock d={d} /> : <BeginnerStock d={d} />}
        </div>
      </div>
    </div>
  )
}
