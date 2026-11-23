// 股票頁面（個股 dashboard）：左側可收合的自選股抽屜（與分析工具頁共用），右側依選中股票顯示卡片網格
// 專業模式 ProStock、新手模式 BeginnerStock；資料在這層依序載入（報價 → 歷史股價 → 同業），避免後端 yfinance 被並行請求鎖住
import { useState } from 'react'
import { useMode } from '../context/mode'
import { fetchStockInfo, toFullTicker } from '../api/stock'
import { fetchHistory, fetchPeers, fetchFundamentals, fetchInstitutional, fetchInstitutionalPerf } from '../api/stockData'
import { mockStockList, mockStockDetail } from '../data/mockData'
import { fetchStockNews } from '../api/news'
import { getStockName } from '../data/stockNames'
import { getPeers, INDUSTRY_LABELS } from '../data/industryPeers'
import useAsync from '../hooks/useAsync'
import StockHeader from '../components/stock/StockHeader'
import ProStock from '../components/stock/ProStock'
import BeginnerStock from '../components/stock/BeginnerStock'
import { buildPeerLines } from '../utils/peerLines'
import usePeerSelection from '../hooks/usePeerSelection'
import { fetchVolatility } from '../api/volatility'
import { getSetting } from '../utils/settings'
import { WatchlistToggle, WatchlistLayout } from '../components/stock/WatchlistPanel'
import useTicker from '../hooks/useTicker'
import useWatchlist from '../hooks/useWatchlist'

export default function Stocks() {
  const { isPro } = useMode()
  const symbol = useTicker()
  const [range, setRange] = useState(() => getSetting('defaultRange'))

  // ① 即時報價 → ② 歷史股價 → ③ 同業，前一支有結果（成功或失敗）才打下一支
  // 注意不能用 !loading 判斷：還沒開始載入時 loading 也是 false
  const settled = (r) => r.data != null || r.error != null
  const quote = useAsync(symbol, () => fetchStockInfo(toFullTicker(symbol)), { cache: 'quote' })
  const lastClose = quote.data?.current_price ?? mockStockDetail[symbol]?.close
  const history = useAsync(settled(quote) ? `${symbol}|${range}` : null, () => fetchHistory(symbol, range, lastClose), { cache: 'history' })
  // 同業：產業預設，或使用者在「國際同業對比」頁自選過的清單（兩頁共用）
  const peerSet = getPeers(symbol, quote.data)
  const selection = usePeerSelection(symbol, peerSet.peers)
  const chosen = { peers: selection.peers, benchmarks: peerSet.benchmarks }
  const peerKey = chosen.peers.map((p) => p.ticker).join(',')
  const peers = useAsync(settled(history) && chosen.peers.length ? `${symbol}|${range}|${peerKey}` : null,
    () => fetchPeers(symbol, range, chosen, lastClose), { cache: 'peers' })

  // 波動預測也是後端用 yfinance 抓股價，等歷史股價回來再打，不跟前面的請求擠在一起
  const vol = useAsync(settled(history) ? symbol : null, () => fetchVolatility(symbol), { cache: 'vol' })

  // 財報、籌碼、法人績效（後端從資料庫讀，不經過 yfinance）
  const fund = useAsync(symbol, () => fetchFundamentals(symbol), { cache: 'fund' })
  const inst = useAsync(symbol, () => fetchInstitutional(symbol), { cache: 'inst' })
  const perf = useAsync(symbol, () => fetchInstitutionalPerf(symbol), { cache: 'perf' })

  const name = mockStockList.find((s) => s.symbol === symbol)?.name || getStockName(symbol, quote.data?.company_name) || symbol
  // 相關新聞：先找後端標的這支股票的新聞，沒有就用公司名稱搜標題
  const newsRes = useAsync(symbol, () => fetchStockNews(symbol, name), { cache: 'stocknews' })
  const news = newsRes.data?.items ?? []

  // 同業圖的線條設定：主角 → 同業 → 基準指數
  const peerLines = buildPeerLines(symbol, name, chosen.peers, chosen.benchmarks)

  const wl = useWatchlist()

  const notFound = !quote.data && quote.error && history.error

  const d = {
    symbol, name, range, setRange, quote, history, peers, fund, inst, perf, vol, news, newsLoading: newsRes.loading, peerLines,
    industryLabel: INDUSTRY_LABELS[peerSet.industryKey],
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold text-gray-900">股票</h1>
        <WatchlistToggle open={wl.open} count={wl.items.length} onToggle={wl.toggleOpen} />
      </div>

      {/* 左側自選股抽屜（預設收合），右側個股 dashboard */}
      <WatchlistLayout wl={wl} symbol={symbol}>
        <StockHeader
          symbol={symbol}
          name={name}
          industry={INDUSTRY_LABELS[peerSet.industryKey]}
          quote={quote}
          watch={{ visible: !wl.isGuest, active: wl.has(symbol), busy: wl.busy, toggle: () => wl.toggle(symbol, name) }}
          range={range}
          onRange={isPro ? setRange : null}
        />
        {/* 報價和歷史股價都查不到：多半是代號打錯或已下市，不顯示整頁空卡片 */}
        {notFound ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center flex flex-col gap-2">
            <p className="text-base font-bold text-gray-900">找不到「{symbol}」的股價資料</p>
            <p className="text-sm text-gray-500">請確認代號是否正確，可以在上方搜尋框輸入代號或公司名稱。</p>
          </div>
        ) : isPro ? <ProStock d={d} /> : <BeginnerStock d={d} />}
      </WatchlistLayout>
    </div>
  )
}
