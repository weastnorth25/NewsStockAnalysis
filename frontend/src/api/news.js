// 新聞 API：/api/news，後端每天爬蟲存進資料庫（自由時報、鉅亨網、Yahoo、中央社）
// 列表只回 120 字摘要；點進單篇再用 /api/news/{id} 拿全文（content）。AI 重點（ai_summary）有提供就會自動帶出來
// 新聞是真資料，抓不到就顯示錯誤，不用示意資料頂替
import api from './stock'
import { SOURCE_NAMES, toneOf } from '../utils/news'

// 後端欄位 → 前端用的格式
function normalize(n) {
  return {
    id: n.id,
    title: n.title,
    summary: n.summary ?? '',
    content: n.content ?? null,
    aiSummary: n.ai_summary ?? null,
    url: n.url,
    source: SOURCE_NAMES[n.source] ?? n.source ?? '',
    category: n.category && n.category !== '未分類' ? n.category : null,
    publishedAt: n.published_at,
    tone: toneOf(n.sentiment, n.sentiment_score),
    score: n.sentiment_score,
    relatedStocks: n.related_stocks ? n.related_stocks.split(/[,\s、]+/).filter(Boolean) : [],
  }
}

// { stock, category, q, limit, offset } → { total, items }
export async function fetchNews(params = {}) {
  const res = await api.get('/api/news', { params: { limit: 20, ...params } })
  return { total: res.data.total, items: res.data.data.map(normalize) }
}

// 單篇新聞（含全文 content）
export async function fetchNewsDetail(id) {
  const res = await api.get(`/api/news/${id}`)
  return normalize(res.data.data)
}

// 個股相關新聞：先用後端標的相關股票找；一則都沒有時改用公司名稱搜標題
export async function fetchStockNews(symbol, name, limit = 6) {
  const byCode = await fetchNews({ stock: symbol, limit })
  if (byCode.items.length || !name || name === symbol) return byCode
  return fetchNews({ q: name, limit })
}
