// 國際同業對比頁面：同一起點的漲跌幅走勢＋統計表；比較對象預設依產業挑選，使用者可自行增減（記在瀏覽器）
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMode } from '../context/mode'
import { fetchStockInfo, toFullTicker } from '../api/stock'
import { fetchPeers } from '../api/stockData'
import { mockStockList, mockStockDetail } from '../data/mockData'
import { getStockName } from '../data/stockNames'
import { getPeers, INDUSTRY_PEERS, INDUSTRY_LABELS } from '../data/industryPeers'
import useAsync from '../hooks/useAsync'
import usePeerSelection from '../hooks/usePeerSelection'
import { buildPeerLines } from '../utils/peerLines'
import { toPctRows } from '../utils/series'
import { changeClass, fmtPct, fmtNum } from '../utils/market'
import StockPicker from '../components/stock/StockPicker'
import { PeerChart } from '../components/stock/StockCharts'
import { RangeTabs, MockBadge } from '../components/stock/StockHeader'
import { RANGES_PRO } from '../components/stock/constants'

const RANGE_WORD = { '1M': '1 個月', '3M': '3 個月', '6M': '6 個月', '1Y': '1 年' }

// 每條線在區間內的統計：最新漲跌、最高、最低
function statsOf(rows, ticker) {
  const vals = rows.map((r) => r[ticker]).filter((v) => v != null)
  if (!vals.length) return null
  return { last: vals.at(-1), max: Math.max(...vals), min: Math.min(...vals), close: rows.at(-1)._close[ticker] }
}

export default function Peers() {
  const { isPro } = useMode()
  const [searchParams] = useSearchParams()
  const symbol = searchParams.get('ticker') || mockStockList[0].symbol
  const [range, setRange] = useState('3M')
  const [custom, setCustom] = useState('')

  const quote = useAsync(symbol, () => fetchStockInfo(toFullTicker(symbol)))
  const settled = quote.data != null || quote.error != null
  const lastClose = quote.data?.current_price ?? mockStockDetail[symbol]?.close
  const name = mockStockList.find((s) => s.symbol === symbol)?.name || getStockName(symbol, quote.data?.company_name) || symbol

  const peerSet = getPeers(symbol, quote.data?.industry_key)
  const selection = usePeerSelection(symbol, peerSet.peers)
  // 新手版只留 S&P 500 當基準，不放產業指數
  const benchmarks = isPro ? peerSet.benchmarks : peerSet.benchmarks.filter((b) => b.ticker === '^GSPC')
  const chosen = { peers: selection.peers, benchmarks }
  const key = [...chosen.peers, ...benchmarks].map((p) => p.ticker).join(',')
  const result = useAsync(settled && chosen.peers.length ? `${symbol}|${range}|${key}` : null,
    () => fetchPeers(symbol, range, chosen, lastClose))

  const lines = buildPeerLines(symbol, name, chosen.peers, benchmarks)
  const series = result.data?.data?.series
  const rows = series ? toPctRows(series) : []
  const baseTicker = toFullTicker(symbol)
  const baseLast = rows.at(-1)?.[baseTicker]

  const suggestions = (INDUSTRY_PEERS[peerSet.industryKey] ?? []).filter((p) => !selection.peers.some((s) => s.ticker === p.ticker))
  const addCustom = (e) => {
    e.preventDefault()
    const t = custom.trim().toUpperCase()
    if (t) selection.add({ ticker: t, name: t })
    setCustom('')
  }

  // 新手版排名句子
  const ranking = rows.length
    ? lines.map((l) => ({ ...l, last: rows.at(-1)[l.ticker] })).filter((l) => l.last != null).sort((a, b) => b.last - a.last)
    : []
  const baseRank = ranking.findIndex((l) => l.ticker === baseTicker) + 1

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-gray-900">國際同業對比</h1>
        <MockBadge show={result.data?.isMock} />
      </div>
      <StockPicker symbol={symbol} />

      <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0">
            <p className="text-base font-bold text-gray-900">{name} 和國際同業的股價走勢</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {INDUSTRY_LABELS[peerSet.industryKey] ? `產業：${INDUSTRY_LABELS[peerSet.industryKey]}・` : ''}
              以區間第一天為 0% 起點，比較誰漲得多{isPro ? '・滑鼠移到圖上看當天股價' : ''}
            </p>
          </div>
          <div className="flex-1" />
          <RangeTabs value={range} onChange={setRange} options={RANGES_PRO} />
        </div>

        {/* 比較對象：可移除、可加入 */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500">比較對象</span>
          {selection.peers.map((p, i) => (
            <span key={p.ticker} className="flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full border border-gray-200 bg-gray-50 text-[13px]">
              <span className="w-2.5 h-[3px] rounded" style={{ background: lines[i + 1]?.color }} />
              {p.name}
              <button type="button" onClick={() => selection.remove(p.ticker)} aria-label={`移除 ${p.name}`}
                className="w-6 h-6 rounded-full text-gray-500 hover:bg-gray-200">×</button>
            </span>
          ))}
          {selection.canAdd && suggestions.length > 0 && (
            <select
              aria-label="從同產業加入比較對象"
              value=""
              onChange={(e) => {
                const p = suggestions.find((s) => s.ticker === e.target.value)
                if (p) selection.add(p)
              }}
              className="px-2.5 py-1.5 rounded-full border border-dashed border-gray-300 text-[13px] text-gray-600 bg-white"
            >
              <option value="">＋ 同產業</option>
              {suggestions.map((s) => <option key={s.ticker} value={s.ticker}>{s.name}（{s.ticker}）</option>)}
            </select>
          )}
          {selection.canAdd && (
            <form onSubmit={addCustom} className="flex items-center">
              <label htmlFor="peer-custom" className="sr-only">輸入代號加入比較</label>
              <input id="peer-custom" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="＋ 輸入代號（例：AAPL）"
                className="w-44 px-2.5 py-1.5 rounded-full border border-dashed border-gray-300 text-[13px] outline-none focus:border-blue-300" />
            </form>
          )}
          {selection.isCustom && (
            <button type="button" onClick={selection.reset} className="text-xs text-blue-600 hover:text-blue-700 ml-1">恢復預設</button>
          )}
        </div>

        {!selection.peers.length ? (
          <p className="text-sm text-gray-400 py-16 text-center">
            {peerSet.industryKey ? '目前沒有比較對象，從上方加入一家吧' : '這支股票的產業還沒有國際同業名單，可以直接輸入代號加入'}
          </p>
        ) : series ? (
          <PeerChart series={series} lines={lines} height={isPro ? 380 : 300} />
        ) : (
          <div className="h-[380px] flex items-center justify-center text-sm text-gray-400">載入中...</div>
        )}
      </div>

      {rows.length > 0 && (isPro ? (
        <div className="bg-white rounded-xl border border-gray-200 p-5 overflow-x-auto">
          <table className="w-full text-[13px] min-w-[640px]">
            <thead>
              <tr className="text-gray-500 text-left">
                <th className="font-normal py-2">名稱</th>
                <th className="font-normal">代號</th>
                <th className="font-normal text-right">最新股價</th>
                <th className="font-normal text-right">區間漲跌</th>
                <th className="font-normal text-right">區間最高</th>
                <th className="font-normal text-right">區間最低</th>
                <th className="font-normal text-right">與 {name} 差距</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => {
                const s = statsOf(rows, l.ticker)
                if (!s) return null
                const gap = l.ticker === baseTicker ? null : s.last - baseLast
                return (
                  <tr key={l.ticker} className={`border-t border-gray-100 ${l.role === 'base' ? 'bg-blue-50/50 font-semibold' : ''}`}>
                    <td className="py-2.5"><span className="inline-block w-3 h-[3px] rounded mr-2 align-middle" style={{ background: l.color }} />{l.name}</td>
                    <td className="text-gray-500">{l.ticker}</td>
                    <td className="text-right">{l.currency}{fmtNum(s.close)}</td>
                    <td className={`text-right font-bold ${changeClass(s.last)}`}>{fmtPct(s.last, 1)}</td>
                    <td className={`text-right ${changeClass(s.max)}`}>{fmtPct(s.max, 1)}</td>
                    <td className={`text-right ${changeClass(s.min)}`}>{fmtPct(s.min, 1)}</td>
                    <td className={`text-right ${gap == null ? 'text-gray-400' : 'text-gray-700'}`}>{gap == null ? '—' : `${gap > 0 ? '領先' : '落後'} ${Math.abs(gap).toFixed(1)}%`}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="text-xs text-gray-500 mt-3">「與 {name} 差距」：對方的區間漲跌減去 {name}；領先代表對方漲得比較多</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3">
          <p className="text-base font-bold text-gray-900">近 {RANGE_WORD[range]}誰漲最多？</p>
          <ol className="flex flex-col gap-2">
            {ranking.map((l, i) => (
              <li key={l.ticker} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${l.ticker === baseTicker ? 'bg-blue-50 font-bold' : 'bg-gray-50'}`}>
                <span className="w-6 text-center text-gray-500">{i + 1}</span>
                <span className="w-3 h-[3px] rounded" style={{ background: l.color }} />
                <span className="flex-1">{l.name}</span>
                <span className={`font-bold ${changeClass(l.last)}`}>{fmtPct(l.last, 1)}</span>
              </li>
            ))}
          </ol>
          {baseRank > 0 && (
            <p className="text-sm text-gray-700">
              {name}在 {ranking.length} 個比較對象裡排第 {baseRank} 名
              {baseRank === 1 ? '，漲得最多。' : `，${ranking[0].name}漲得最多。`}
              S&amp;P 500 代表整個美國股市，漲得比它多就代表跑贏大盤。
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
