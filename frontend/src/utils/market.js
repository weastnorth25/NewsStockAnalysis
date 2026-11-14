// 行情共用工具：台股慣例紅漲綠跌、百分比格式、市場強弱計算

// 漲跌顏色（Tailwind class）
export const changeClass = (v) => (v > 0 ? 'text-red-500' : v < 0 ? 'text-emerald-500' : 'text-gray-500')

// 1.234 → '+1.23%'
export const fmtPct = (v, digits = 2) => (v == null ? '--' : `${v > 0 ? '+' : ''}${Number(v).toFixed(digits)}%`)

// 可能是 null 的數值（金融股沒有毛利率、上櫃股沒有同業本益比…）：null 顯示 --
export const fmtUnit = (v, unit = '') => (v == null ? '--' : `${v}${unit}`)

export const fmtNum = (v, digits = 2) =>
  v == null ? '--' : Number(v).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })

// ─── 市場強弱：三大指數加權漲跌幅 ─────────────────────────────────
// 加權指數 50% ＋ S&P 500 30% ＋ NASDAQ 20%，有資料的指數依權重重新正規化
// 等 AI 情緒分析完成後，這裡換成 sentiment_score 平均值即可
export const SENTIMENT_WEIGHTS = [
  { ticker: '^TWII', weight: 0.5 },
  { ticker: '^GSPC', weight: 0.3 },
  { ticker: '^IXIC', weight: 0.2 },
]

export function weightedScore(quotes) {
  const valid = SENTIMENT_WEIGHTS.filter((i) => quotes[i.ticker]?.data)
  if (!valid.length) return null
  const total = valid.reduce((s, i) => s + i.weight, 0)
  const score = valid.reduce((s, i) => s + quotes[i.ticker].data.change_pct * i.weight, 0) / total
  return Math.round(score * 100) / 100
}

// 閾值設得保守，避免單日爆量或單一市場異動造成誤判
// temp：0～100 的市場溫度，給新手版溫度計用
export function calcSentiment(score) {
  if (score === null) return { label: '計算中', color: '#cbd5e1', textClass: 'text-gray-400', temp: 50 }
  const temp = Math.max(0, Math.min(100, Math.round(50 + score * 15)))
  if (score >  2.0)  return { label: '大買', color: '#dc2626', textClass: 'text-red-600',     temp }
  if (score >  0.5)  return { label: '偏多', color: '#f87171', textClass: 'text-red-500',     temp }
  if (score >= -0.5) return { label: '觀望', color: '#94a3b8', textClass: 'text-slate-500',   temp }
  if (score >= -2.0) return { label: '偏空', color: '#34d399', textClass: 'text-emerald-500', temp }
  return               { label: '大賣', color: '#059669', textClass: 'text-emerald-600', temp }
}

// ─── 新聞情緒分數（0～100）分級 ───────────────────────────────────
// 跟市場強弱一樣紅＝樂觀、綠＝悲觀；40～60 算中性。bg/fg 給新手版色塊用（淺底深字，對比足夠）
export const SENTIMENT_NEUTRAL = [40, 60]

export function sentimentLevel(v) {
  if (v == null) return { label: '--',     color: '#cbd5e1', textClass: 'text-gray-400',    bg: '#f3f4f6', fg: '#6b7280' }
  if (v >= 75)   return { label: '很樂觀', color: '#dc2626', textClass: 'text-red-600',     bg: '#dc2626', fg: '#fff' }
  if (v > 60)    return { label: '偏樂觀', color: '#f87171', textClass: 'text-red-500',     bg: '#fee2e2', fg: '#991b1b' }
  if (v >= 40)   return { label: '中性',   color: '#94a3b8', textClass: 'text-slate-500',   bg: '#f1f5f9', fg: '#334155' }
  if (v > 25)    return { label: '偏悲觀', color: '#34d399', textClass: 'text-emerald-600', bg: '#d1fae5', fg: '#065f46' }
  return           { label: '很悲觀', color: '#059669', textClass: 'text-emerald-600', bg: '#059669', fg: '#fff' }
}
