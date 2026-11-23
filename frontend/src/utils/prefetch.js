// 背景預先載入：進到網站、目前這頁的資料先跑完後，趁瀏覽器空閒把其他頁面的程式和資料先抓好
// ① 先下載所有頁面的程式（Vercel CDN，很快）
// ② 再一支一支抓其他頁面要用的資料，存進 apiCache；名稱跟各頁 useAsync 的 cache 一樣，點進去就直接顯示
//    一次只打一支，不跟使用者正在看的頁面搶後端；最近幾分鐘抓過的就跳過
// 個股相關的資料用「目前查看的股票」（hooks/useTicker 記住的那支）
import { pageLoaders } from '../pages/loaders'
import { readCache, writeCache } from './apiCache'
import { getSetting } from './settings'
import { storedTicker } from '../hooks/useTicker'
import { fetchStockInfo, toFullTicker } from '../api/stock'
import { fetchHistory, fetchPeers, fetchFundamentals, fetchInstitutional, fetchInstitutionalPerf, fetchChips, fetchInstitutionalSignals } from '../api/stockData'
import { fetchNews, fetchStockNews } from '../api/news'
import { fetchVolatility } from '../api/volatility'
import { fetchMacroEvents } from '../api/macro'
import { mockStockList, mockStockDetail } from '../data/mockData'
import { getStockName } from '../data/stockNames'
import { getPeers } from '../data/industryPeers'
import { loadSaved as savedPeers } from '../hooks/usePeerSelection'

const START_DELAY = 3000   // 等目前這頁的請求先發出去

let started = false

// 瀏覽器空閒時再做；不支援 requestIdleCallback 的瀏覽器（Safari）用 setTimeout
const idle = () => new Promise((resolve) => {
  if (window.requestIdleCallback) window.requestIdleCallback(() => resolve(), { timeout: 2000 })
  else setTimeout(resolve, 300)
})

async function warm(cache, key, load) {
  const id = `${cache}|${key}`
  if (readCache(id)?.recent) return
  try {
    writeCache(id, await load())
  } catch { /* 背景抓失敗就算了，點進那一頁時會再抓一次 */ }
}

export default function prefetchApp() {
  if (started) return
  started = true
  // 使用者開了省流量模式就不預先載入
  if (navigator.connection?.saveData) return

  setTimeout(async () => {
    await idle()
    // ① 頁面程式
    Object.values(pageLoaders).forEach((load) => load().catch(() => {}))

    // ② 資料：依使用者最常點的順序
    const symbol = storedTicker()
    const range = getSetting('defaultRange')
    const name = mockStockList.find((s) => s.symbol === symbol)?.name || getStockName(symbol) || symbol
    const tasks = [
      ['newslist', 'null||20', () => fetchNews({ limit: 20 })],
      ['quote', symbol, () => fetchStockInfo(toFullTicker(symbol))],
      ['history', `${symbol}|${range}`, () => fetchHistory(symbol, range, readCache(`quote|${symbol}`)?.data?.current_price)],
      ['fund', symbol, () => fetchFundamentals(symbol)],
      ['inst', symbol, () => fetchInstitutional(symbol)],
      ['perf', symbol, () => fetchInstitutionalPerf(symbol)],
      ['stocknews', symbol, () => fetchStockNews(symbol, name)],
      // 股票頁的國際同業圖：跟股票頁一樣用自選過的清單，沒有就用產業預設（要等報價抓完才知道產業）
      () => {
        const quote = readCache(`quote|${symbol}`)?.data
        const peerSet = getPeers(symbol, quote)
        const peers = savedPeers(symbol) ?? peerSet.peers
        if (!peers.length) return null
        return ['peers', `${symbol}|${range}|${peers.map((p) => p.ticker).join(',')}`,
          () => fetchPeers(symbol, range, { peers, benchmarks: peerSet.benchmarks }, quote?.current_price)]
      },
      ['vol', symbol, () => fetchVolatility(symbol)],
      ['chips', symbol, () => fetchChips(symbol, mockStockDetail[symbol]?.close)],
      ['signals', symbol, () => fetchInstitutionalSignals(symbol)],
    ]
    // 總經日曆的資料存在 api/macro.js 的模組變數裡，呼叫一次就好
    fetchMacroEvents().catch(() => {})
    // 項目可以是 [名稱, key, 載入函式]，或是到時候才算出這三個值的函式（要用前面抓到的資料）
    for (const task of tasks) {
      await idle()
      const t = typeof task === 'function' ? task() : task
      if (t) await warm(...t)
    }
  }, START_DELAY)
}
