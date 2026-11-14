// 法人籌碼的規則判斷：把每日買賣超整理成「買進／小買／賣出…」標籤、白話句子與重點條列
// 等 AI 分析完成前先用規則產生，跟 stockInsights.js 同一套做法
import { streak } from './stockInsights'

export const INST_KEYS = [
  { key: 'foreign', name: '外資',   desc: '國外的大型投資機構，買賣量最大',   color: '#2563eb' },
  { key: 'trust',   name: '投信',   desc: '國內的基金公司，常跟著基本面布局', color: '#f59e0b' },
  { key: 'dealer',  name: '自營商', desc: '券商用自己的錢操作，短線居多',     color: '#9ca3af' },
]

const sum = (rows, key) => rows.reduce((s, r) => s + r[key], 0)

// 張數顯示：一萬張以上用「萬張」
export const fmtLots = (v, sign = true) => {
  const s = sign && v > 0 ? '+' : ''
  return Math.abs(v) >= 10000 ? `${s}${(v / 10000).toFixed(1)} 萬張` : `${s}${v.toLocaleString()} 張`
}

// 方向強度：淨買賣 ÷ 每天買賣量的總和，越接近 ±1 代表方向越一致
export function actionOf(rows, key) {
  const net = sum(rows, key)
  const gross = rows.reduce((s, r) => s + Math.abs(r[key]), 0) || 1
  const k = net / gross
  if (k > 0.5)   return { word: '買進', dir: 1, net }
  if (k > 0.15)  return { word: '小買', dir: 1, net }
  if (k < -0.5)  return { word: '賣出', dir: -1, net }
  if (k < -0.15) return { word: '小賣', dir: -1, net }
  return { word: '買賣互見', dir: 0, net }
}

// '2026-10-23' → '10/23'
export const md = (iso) => `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`

const streakText = (n) => (n >= 2 ? `連 ${n} 日買超` : n <= -2 ? `連 ${-n} 日賣超` : '買賣互見')

// 專業版 KPI 底下的小字
export const streakOf = (rows, key) => streakText(streak(rows.map((r) => r[key])))

// 新手版開頭那句話
export function beginnerSummary(rows, days) {
  const f = actionOf(rows, 'foreign')
  const t = actionOf(rows, 'trust')
  const d = actionOf(rows, 'dealer')
  let who
  if (f.dir > 0 && t.dir > 0) who = { text: '外資和投信都在買', dir: 1 }
  else if (f.dir < 0 && t.dir < 0) who = { text: '外資和投信都在賣', dir: -1 }
  else who = { text: `外資${f.word}、投信${t.word}`, dir: 0 }
  const total = f.net + t.net + d.net
  const overall = total > 0 ? '大戶整體偏向買進' : total < 0 ? '大戶整體偏向賣出' : '大戶整體方向不明顯'
  return { lead: `最近 ${days} 天，`, who, rest: `，自營商${d.word}。${overall}。` }
}

// 新手版走勢圖下面那句話：外資連續買／賣 3 天以上才特別說
export function foreignPriceSentence(rows) {
  const n = streak(rows.map((r) => r.foreign))
  const first = rows[0]
  const last = rows.at(-1)
  const fmt = (v) => v.toLocaleString('en-US', { maximumFractionDigits: 1 })
  const move = (from) => `${last.close >= from.close ? '漲' : '跌'}到 ${fmt(last.close)} 元`
  if (Math.abs(n) >= 3) {
    const start = rows[rows.length - Math.abs(n)]
    const prevClose = rows[rows.length - Math.abs(n) - 1]?.close ?? start.close
    return `外資從 ${md(start.date)} 開始連續${n > 0 ? '買進' : '賣出'} ${Math.abs(n)} 天，同一段時間股價從 ${fmt(prevClose)} 元${move({ close: prevClose })}。`
  }
  // 沒有明顯連續買賣：講整段的方向；外資方向跟股價相反時用「但」
  const f = actionOf(rows, 'foreign')
  const up = last.close >= first.close
  const head = f.dir === 0 ? `最近 ${rows.length} 天外資買賣互見` : `最近 ${rows.length} 天外資整體${f.word}約 ${fmtLots(Math.abs(f.net), false)}`
  const join = f.dir !== 0 && (f.dir > 0) !== up ? '，但' : '，'
  return `${head}${join}股價從 ${fmt(first.close)} 元${move(first)}。`
}

// 專業版「重點整理」條列
export function proBullets(rows, days) {
  const out = []
  const f = actionOf(rows, 'foreign')
  const t = actionOf(rows, 'trust')
  const d = actionOf(rows, 'dealer')
  const fs = streak(rows.map((r) => r.foreign))

  out.push(`外資${Math.abs(fs) >= 2 ? streakText(fs) + '，' : ''}${days} 日累計 ${fmtLots(f.net)}`)
  if (f.dir > 0 && t.dir > 0) out.push('投信同步買超，土洋同買')
  else if (f.dir < 0 && t.dir < 0) out.push('投信同步賣超，土洋同賣')
  else if (f.dir * t.dir < 0) out.push(`投信${t.word}，與外資方向相反（土洋對作）`)
  else out.push(`投信${t.word}，${days} 日累計 ${fmtLots(t.net)}`)
  out.push(`自營商${d.word}（${fmtLots(d.net)}），多為避險部位，參考性較低`)

  const r0 = rows[0].foreignRatio
  const r1 = rows.at(-1).foreignRatio
  const dr = Math.round((r1 - r0) * 100) / 100
  if (dr !== 0) out.push(`外資持股比例${dr > 0 ? '上升' : '下降'} ${Math.abs(dr).toFixed(2)} 個百分點`)

  const m0 = rows[0].margin
  const m1 = rows.at(-1).margin
  const dm = ((m1 / m0 - 1) * 100)
  const total = f.net + t.net + d.net
  if (dm < -2 && total > 0) out.push(`融資減少 ${Math.abs(dm).toFixed(1)}%、法人買超，籌碼往法人集中`)
  else if (dm > 2 && total < 0) out.push(`融資增加 ${dm.toFixed(1)}%、法人賣超，籌碼轉向散戶，要留意`)
  else out.push(`融資餘額 ${days} 日${dm >= 0 ? '增加' : '減少'} ${Math.abs(dm).toFixed(1)}%`)
  return out
}
