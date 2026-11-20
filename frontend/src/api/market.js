// 大盤月營收：上市公司當月營收合計＋各產業拆解，另外附 AI（語言模型）寫的一句話摘要
// 這兩支不用示意資料頂替，抓不到就顯示「暫時無法取得」
import api from './stock'

// { year_month, reported_companies, revenue_total_thousand, year_ago_total_thousand, yoy_pct,
//   industries: [{ industry, companies, revenue_thousand, share_pct, yoy_pct, contribution_pts }] }，金額單位千元
export async function fetchMarketRevenue() {
  const res = await api.get('/api/market/revenue')
  const data = res.data.data
  // 摘要抓不到不影響主資料
  const summary = await api
    .get('/api/summaries', { params: { scope: 'market', summary_type: 'monthly_revenue', ref: data.year_month, limit: 1 } })
    .then((r) => r.data.data[0]?.summary_text ?? null)
    .catch(() => null)
  return { ...data, summary }
}

// 每月營收合計走勢（由舊到新，只含資料完整的月份）：[{ year_month, revenue_total_thousand, yoy_pct, ... }]
export async function fetchMarketRevenueTrend(months = 12) {
  const res = await api.get('/api/market/revenue/trend', { params: { months } })
  return res.data.data
}

// 全市場三大法人買賣超（億元，正數買超），由舊到新：[{ date, foreign, trust, dealer }]
// 資料來源：證交所三大法人買賣金額統計表，後端每天收盤後更新
export async function fetchMarketInstitutional(days = 1) {
  const res = await api.get('/api/market/institutional', { params: { days } })
  return res.data
}

// 全市場漲跌幅排行（後端已排除成交量太小的股票）：{ date, gainers: [{ code, name, price, changePct }], losers: [...] }
export async function fetchMarketMovers(limit = 5) {
  const res = await api.get('/api/market/movers', { params: { limit } })
  return res.data
}
