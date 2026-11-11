// 股票頁面（個股 dashboard）：左側可收合的自選股抽屜，右側依選中股票顯示卡片網格
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
import { buildPeerLines } from '../utils/peerLines'
import usePeerSelection from '../hooks/usePeerSelection'
import WatchlistPanel, { WatchlistToggle } from '../components/stock/WatchlistPanel'

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
  // 同業：產業預設，或使用者在「國際同業對比」頁自選過的清單（兩頁共用）
  const peerSet = getPeers(symbol, quote.data?.industry_key)
  const selection = usePeerSelection(symbol, peerSet.peers)
  const chosen = { peers: selection.peers, benchmarks: peerSet.benchmarks }
  const peerKey = chosen.peers.map((p) => p.ticker).join(',')
  const peers = useAsync(settled(history) && chosen.peers.length ? `${symbol}|${range}|${peerKey}` : null,
    () => fetchPeers(symbol, range, chosen, lastClose))

  // 財報、籌碼、法人績效（目前是示意資料，之後走資料庫，不經過 yfinance）
  const fund = useAsync(symbol, () => fetchFundamentals(symbol))
  const inst = useAsync(symbol, () => fetchInstitutional(symbol))
  const perf = useAsync(symbol, () => fetchInstitutionalPerf(symbol))

  const name = mockStockList.find((s) => s.symbol === symbol)?.name || getStockName(symbol, quote.data?.company_name) || symbol
  const news = mockNews.filter((n) => n.relatedStocks?.includes(symbol))

  // 同業圖的線條設定：主角 → 同業 → 基準指數
  const peerLines = buildPeerLines(symbol, name, chosen.peers, chosen.benchmarks)

  // ─── 自選股 ───
  const isGuest = localStorage.getItem('token') === 'guest'
  // watchlist：[{ symbol, name }]，symbol 是 strip 掉 .TW 的顯示格式
  const [watchlist, setWatchlist] = useState([])
  const [watchlistStatus, setWatchlistStatus] = useState(isGuest ? 'guest' : 'loading')
  const [watchlistOpen, setWatchlistOpen] = useState(false)
  const [watchlistBusy, setWatchlistBusy] = useState(false)
  const inWatchlist = watchlist.some((s) => s.symbol === symbol)

  // 載入一次自選股清單（後端存的是 .TW 格式，前端統一 strip 後存）
  useEffect(() => {
    if (isGuest) return
    fetchWatchlist()
      .then((items) => {
        setWatchlist(items.map((i) => ({ symbol: toDisplaySymbol(i.symbol), name: i.company_name })))
        setWatchlistStatus('ok')
      })
      .catch(() => setWatchlistStatus('error'))
  }, [isGuest])

  const toggleWatchlist = async () => {
    setWatchlistBusy(true)
    try {
      if (inWatchlist) {
        await removeFromWatchlist(toFullTicker(symbol))
        setWatchlist((prev) => prev.filter((s) => s.symbol !== symbol))
      } else {
        await addToWatchlist(toFullTicker(symbol))
        setWatchlist((prev) => [...prev, { symbol, name }])
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
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold text-gray-900">股票</h1>
        <WatchlistToggle open={watchlistOpen} count={watchlist.length} onToggle={() => setWatchlistOpen((o) => !o)} />
      </div>

      <div className="flex items-start">
        {/* 左側：自選股抽屜（預設收合） */}
        <WatchlistPanel
          open={watchlistOpen}
          items={watchlist}
          status={watchlistStatus}
          current={symbol}
          onSelect={(code) => navigate(`/stocks?ticker=${code}`)}
        />

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
