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
