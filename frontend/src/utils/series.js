// 時間序列工具：移動平均、同業漲跌幅換算（對齊交易日）

// 簡單移動平均；前面不足 n 天的點回傳 null，圖表會自動略過
export function movingAverage(values, n = 20) {
  return values.map((_, i) => {
    if (i < n - 1) return null
    let sum = 0
    for (let j = i - n + 1; j <= i; j++) sum += values[j]
    return Math.round((sum / n) * 100) / 100
  })
}

// 把多支股票的收盤價換算成「從同一起點出發的漲跌幅 %」，並以主角的交易日對齊
// series: [{ ticker, points: [{ date, close }] }]，第一個是主角
// 各市場假日不同：某支當天沒交易就沿用前一天收盤（forward fill）
// 回傳給 recharts 的格式：[{ date, '2330.TW': 0, 'NVDA': 1.2, ..., _close: { ticker: 價格 } }]
export function toPctRows(series) {
  if (!series.length) return []
  const baseDates = series[0].points.map((p) => p.date)
  const lookups = series.map((s) => {
    const map = new Map(s.points.map((p) => [p.date, p.close]))
    return { ticker: s.ticker, map, first: s.points[0]?.close }
  })

  const last = {}
  return baseDates.map((date) => {
    const row = { date, _close: {} }
    for (const { ticker, map, first } of lookups) {
      const close = map.get(date) ?? last[ticker]
      if (close == null || !first) continue
      last[ticker] = close
      row[ticker] = Math.round((close / first - 1) * 10000) / 100
      row._close[ticker] = close
    }
    return row
  })
}
