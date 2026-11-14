// 新聞共用：來源名稱、情緒（正面／中性／負面）、時間格式
// 後端 sentiment 是情緒模型的標籤（Positive / Neutral / Negative），sentiment_score = 正面機率 − 負面機率（−1 ~ +1）

export const SOURCE_NAMES = { ltn: '自由時報', cnyes: '鉅亨網', yahoo: 'Yahoo 股市', cna: '中央社' }

// 後端的分類（爬蟲時由模型判斷），新聞頁的篩選按鈕用
export const NEWS_CATEGORIES = ['大盤總經', '科技半導體', '金融保險', '傳統產業', '航運物流', '再生能源', '民生消費', '營建地產', '軟體服務']

// 台股慣例：紅＝利多、綠＝利空
export const TONE = {
  positive: { label: '正面', plain: '利多', tag: 'bg-red-100 text-red-800',         text: 'text-red-600',     bar: 'bg-red-400' },
  neutral:  { label: '中性', plain: '中性', tag: 'bg-gray-100 text-gray-700',       text: 'text-gray-600',    bar: 'bg-gray-400' },
  negative: { label: '負面', plain: '利空', tag: 'bg-emerald-100 text-emerald-800', text: 'text-emerald-600', bar: 'bg-emerald-400' },
}

// 先看模型標籤，沒有標籤才用分數判斷；兩個都沒有代表還沒跑情緒模型
export function toneOf(label, score) {
  const l = label?.toLowerCase()
  if (l === 'positive' || l === 'negative' || l === 'neutral') return l
  if (score == null) return null
  return score > 0.2 ? 'positive' : score < -0.2 ? 'negative' : 'neutral'
}

// 平均情緒分數的白話：用在個股頁「新聞情緒」
export const scoreTone = (avg) => (avg == null ? null : avg >= 0.2 ? 'positive' : avg <= -0.2 ? 'negative' : 'neutral')

// 後端時間是 UTC 不帶時區，補上 Z 再轉台灣時間，例如「11/14 15:06」
const fmt = new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
export function newsTime(iso) {
  if (!iso) return ''
  const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`)
  const p = Object.fromEntries(fmt.formatToParts(d).map((x) => [x.type, x.value]))
  return `${p.month}/${p.day} ${p.hour}:${p.minute}`
}
