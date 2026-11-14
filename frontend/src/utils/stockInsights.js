// 個股「依數據自動整理」的結論：新手版 AI 健檢燈號、專業版正面／風險因素
// 目前用規則從財報與籌碼數字推出來，AI 總結 API 完成後替換這個檔案即可
// 後端欄位可能是 null：金融股沒有毛利率／營益率、上櫃股或算不出來時沒有同業本益比，遇到 null 就跳過那一項

const LIGHT = {
  good: { label: '好',   className: 'bg-red-50',    tagClass: 'text-red-800' },
  ok:   { label: '普通', className: 'bg-gray-50',   tagClass: 'text-gray-700' },
  warn: { label: '注意', className: 'bg-orange-50', tagClass: 'text-orange-800' },
}

const sum = (rows, key) => rows.reduce((s, r) => s + r[key], 0)

// 新手版四個燈號：賺錢能力、業績成長、大戶動向、股價貴不貴
export function buildChecks(f, inst) {
  const foreign10 = inst ? sum(inst, 'foreign') : null
  const checks = []

  if (f?.grossMargin != null) {
    const gm = f.grossMargin >= 40 ? 'good' : f.grossMargin >= 20 ? 'ok' : 'warn'
    checks.push({ id: 'profit', name: '賺錢能力', light: LIGHT[gm], metric: `毛利率 ${f.grossMargin}%`,
      plain: gm === 'good' ? `每賣 100 元能賺 ${Math.round(f.grossMargin)} 元毛利，很會賺錢。` : gm === 'ok' ? '賺錢能力中等。' : '毛利偏低，賺錢比較辛苦。',
      term: '毛利率：營收扣掉直接成本後剩下的比例，越高代表產品越有競爭力。' })
  } else if (f?.roe != null) {
    // 金融股沒有毛利率，改用 ROE 看賺錢能力
    const r = f.roe >= 15 ? 'good' : f.roe >= 8 ? 'ok' : 'warn'
    checks.push({ id: 'profit', name: '賺錢能力', light: LIGHT[r], metric: `ROE ${f.roe}%`,
      plain: r === 'good' ? `股東每投入 100 元，一年能賺 ${Math.round(f.roe)} 元，很會賺錢。` : r === 'ok' ? '賺錢能力中等。' : '用股東的錢賺得比較少。',
      term: 'ROE（股東權益報酬率）：公司用股東的錢一年能賺多少比例，金融股常用這個看賺錢能力。' })
  }

  if (f?.revYoY != null) {
    const g = f.revYoY >= 15 ? 'good' : f.revYoY >= 0 ? 'ok' : 'warn'
    checks.push({ id: 'growth', name: '業績成長', light: LIGHT[g], metric: `營收年增 ${f.revYoY > 0 ? '+' : ''}${f.revYoY}%`,
      plain: g === 'good' ? '營收比去年同期明顯成長。' : g === 'ok' ? '營收和去年差不多。' : '營收比去年少，要留意。',
      term: '營收年增率：跟去年同一期比，營收增加或減少的比例。' })
  }

  if (foreign10 != null) {
    const b = foreign10 > 0 ? 'good' : 'warn'
    checks.push({ id: 'chips', name: '大戶動向', light: LIGHT[b], metric: `外資 10 日 ${foreign10 > 0 ? '+' : ''}${foreign10.toLocaleString()} 張`,
      plain: b === 'good' ? '外資最近 10 天整體在買。' : '外資最近 10 天整體在賣。',
      term: '外資：外國的大型投資機構，買賣量大，常影響股價方向。' })
  }

  if (f?.pe != null && f.peerPe != null) {
    const ratio = f.pe / f.peerPe
    const v = ratio > 1.1 ? 'warn' : ratio < 0.9 ? 'good' : 'ok'
    checks.push({ id: 'value', name: '股價貴不貴', light: LIGHT[v], metric: `本益比 ${f.pe}（同業 ${f.peerPe}）`,
      plain: v === 'warn' ? '比同業平均貴一些，追高要小心。' : v === 'good' ? '比同業便宜。' : '價格和同業差不多。',
      term: '本益比：股價除以每股盈餘，代表用幾年的獲利回本，越高代表越貴。' })
  }

  return checks
}

// 新手版一句話總結
export function buildSummary(checks) {
  if (!checks.length) return ''
  const goods = checks.filter((c) => c.light === LIGHT.good).map((c) => c.name)
  const warns = checks.filter((c) => c.light === LIGHT.warn).map((c) => c.name)
  if (goods.length && warns.length) return `${goods.join('、')}表現不錯，但「${warns.join('、')}」要多留意。`
  if (goods.length) return `${goods.join('、')}都表現不錯。`
  if (warns.length) return `「${warns.join('、')}」目前偏弱，要多留意。`
  return '各項表現都在平均水準。'
}

// 專業版正面／風險因素
export function buildProsCons(f, inst, avgSentiment) {
  const pros = []
  const cons = []
  if (f) {
    if (f.revYoY >= 15) pros.push(`營收年增 ${f.revYoY}%${f.revStreak >= 3 ? `，連 ${f.revStreak} 個月成長` : ''}`)
    else if (f.revYoY < 0) cons.push(`營收年減 ${Math.abs(f.revYoY)}%`)
    if (f.grossMarginChg > 0) pros.push(`毛利率 ${f.grossMargin}%，較上季 +${f.grossMarginChg}pt`)
    else if (f.grossMarginChg < 0) cons.push(`毛利率較上季 ${f.grossMarginChg}pt`)
    const ratio = f.pe != null && f.peerPe != null ? f.pe / f.peerPe : 1
    if (ratio > 1.1) cons.push(`本益比 ${f.pe}，高於同業平均約 ${Math.round((ratio - 1) * 100)}%`)
    else if (ratio < 0.9) pros.push(`本益比 ${f.pe}，低於同業平均`)
  }
  if (inst) {
    const days = streak(inst.map((r) => r.foreign))
    if (days >= 3) pros.push(`外資連 ${days} 日買超`)
    else if (days <= -3) cons.push(`外資連 ${-days} 日賣超`)
  }
  if (avgSentiment != null) {
    if (avgSentiment >= 0.7) pros.push('近期新聞情緒偏正面')
    else if (avgSentiment < 0.5) cons.push('近期新聞情緒偏負面')
  }
  return { pros, cons }
}

// 最後連續幾天同方向：正數＝連買、負數＝連賣
export function streak(values) {
  let n = 0
  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i] > 0 && n >= 0) n++
    else if (values[i] < 0 && n <= 0) n--
    else break
  }
  return n
}
