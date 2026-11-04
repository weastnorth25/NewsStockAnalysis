// 把「主角＋同業＋基準指數」轉成圖表的線條設定，個股 dashboard 與同業對比頁共用
import { toFullTicker } from '../api/stock'
import { PEER_COLORS, BENCH_STYLES } from '../components/stock/constants'

// tooltip 顯示當天股價時的貨幣符號
export function currencyOf(ticker) {
  if (ticker.startsWith('^')) return ''
  if (ticker.endsWith('.TW')) return 'NT$'
  if (ticker.endsWith('.KS')) return '₩'
  if (ticker.endsWith('.HK')) return 'HK$'
  if (ticker.endsWith('.CO')) return 'kr '
  if (ticker.endsWith('.T')) return '¥'
  return 'US$'
}

export function buildPeerLines(symbol, name, peers, benchmarks) {
  if (!peers.length) return []
  return [
    { ticker: toFullTicker(symbol), name, color: '#2563eb', width: 2.5, currency: 'NT$', role: 'base' },
    ...peers.map((p, i) => ({ ticker: p.ticker, name: p.name, color: PEER_COLORS[i % PEER_COLORS.length], width: 2, currency: currencyOf(p.ticker), role: 'peer' })),
    ...benchmarks.map((b, i) => ({ ticker: b.ticker, name: b.name, ...BENCH_STYLES[i % BENCH_STYLES.length], width: 1.5, currency: '', role: 'bench' })),
  ]
}
