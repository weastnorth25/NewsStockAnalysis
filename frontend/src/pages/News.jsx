// 新聞頁面：左側新聞列表（可依分類篩選、搜尋標題、載入更多），右側顯示選中的新聞
// 資料來自後端每天爬蟲的 /api/news（列表）與 /api/news/{id}（單篇全文）；後端提供 AI 重點後會自動顯示
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import useAsync from '../hooks/useAsync'
import { fetchNews, fetchNewsDetail } from '../api/news'
import { NEWS_CATEGORIES, TONE, newsTime } from '../utils/news'
import { getStockName } from '../data/stockNames'

const PAGE = 20

function ToneTag({ tone }) {
  if (!tone) return null
  return <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${TONE[tone].tag}`}>{TONE[tone].label}</span>
}

function NewsDetail({ n, onBack }) {
  const navigate = useNavigate()
  const tone = n.tone && TONE[n.tone]
  // 列表只有摘要，選到這則再抓全文；全文還沒回來前先顯示摘要
  const detail = useAsync(n.id, () => fetchNewsDetail(n.id), { cache: 'newsdetail' })
  const content = detail.data?.content ?? n.content
  const aiSummary = detail.data?.aiSummary ?? n.aiSummary
  return (
    <article className="bg-white rounded-xl border border-gray-200 p-6 min-w-0 flex flex-col gap-5">
      {onBack && (
        <button type="button" onClick={onBack} className="self-start text-sm text-blue-600 lg:hidden">← 回到列表</button>
      )}
      <div className="flex flex-col gap-2.5">
        <h2 className="text-xl font-bold text-gray-900 leading-snug">{n.title}</h2>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
          <span>{n.source}</span>
          <span className="text-gray-300">|</span>
          <span>{newsTime(n.publishedAt)}</span>
          {n.category && <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">{n.category}</span>}
        </div>
      </div>

      {aiSummary && (
        <div className="bg-slate-50 rounded-lg p-4 flex flex-col gap-1.5">
          <span className="self-start text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">AI 重點</span>
          {/* 後端格式：每點一行（\n 分隔），不含項目符號 */}
          <ul className="list-disc pl-5 flex flex-col gap-1 text-sm leading-relaxed text-gray-800">
            {aiSummary.split('\n').filter((line) => line.trim()).map((line) => <li key={line}>{line}</li>)}
          </ul>
        </div>
      )}

      <div className="text-[15px] text-gray-700 leading-loose whitespace-pre-line border-t border-gray-100 pt-5">
        {content ?? n.summary}
      </div>
      {!content && (
        <p className="text-xs text-gray-500 -mt-3">{detail.loading ? '正在載入全文…' : '目前只顯示新聞開頭，完整內文請看原文。'}</p>
      )}
      {n.url && (
        <a href={n.url} target="_blank" rel="noopener noreferrer" className="self-start text-sm text-blue-600 hover:text-blue-700">
          閱讀原文（{n.source}）↗
        </a>
      )}

      {tone && (
        <div className="border-t border-gray-100 pt-5 flex flex-col gap-3">
          <p className="text-sm font-semibold text-gray-900">AI 情緒分析</p>
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
            <div className="shrink-0 text-center w-16">
              <p className={`text-xl font-bold ${tone.text}`}>{tone.label}</p>
              {n.score != null && <p className="text-xs text-gray-500 mt-0.5">{n.score > 0 ? '+' : ''}{n.score.toFixed(2)}</p>}
            </div>
            {n.score != null && (
              <div className="flex-1">
                {/* 分數 −1 ~ +1：中線是 0，往右越正面、往左越負面 */}
                <div className="relative h-2.5 bg-gray-200 rounded-full">
                  <div className={`absolute top-0 h-full rounded-full ${tone.bar}`}
                    style={n.score >= 0 ? { left: '50%', width: `${n.score * 50}%` } : { right: '50%', width: `${-n.score * 50}%` }} />
                  <div className="absolute left-1/2 top-0 h-full w-px bg-gray-500" />
                </div>
                <div className="flex justify-between text-[11px] text-gray-500 mt-1"><span>負面 −1</span><span>0</span><span>+1 正面</span></div>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500">由情緒模型判斷整篇新聞的語氣，不代表股價一定會漲或跌。</p>
        </div>
      )}

      {n.relatedStocks.length > 0 && (
        <div className="border-t border-gray-100 pt-5">
          <p className="text-sm text-gray-500 mb-2">相關股票</p>
          <div className="flex gap-2 flex-wrap">
            {n.relatedStocks.map((code) => (
              <button key={code} type="button" onClick={() => navigate(`/stocks?ticker=${code}`)}
                className="px-3 py-1 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-700 text-sm rounded-full transition-colors">
                {getStockName(code) || code} {code}
              </button>
            ))}
          </div>
        </div>
      )}
    </article>
  )
}

export default function News() {
  const location = useLocation()
  const [category, setCategory] = useState(null)
  const [query, setQuery] = useState('')
  const [q, setQ] = useState('')
  const [limit, setLimit] = useState(PAGE)
  const [picked, setPicked] = useState(null)

  // 篩選條件或筆數改變就重抓（後端一次最多 100 筆）
  const res = useAsync(`${category}|${q}|${limit}`, () => fetchNews({ category: category ?? undefined, q: q || undefined, limit }), { cache: 'newslist' })
  const items = res.data?.items ?? []
  const total = res.data?.total ?? 0

  // 選中的新聞：這頁點過的 → 從首頁／個股頁點進來帶的 → 列表第一則
  const selected = picked ?? location.state?.news ?? items[0] ?? null

  const choose = (c) => { setCategory(c); setLimit(PAGE); setPicked(null) }
  const search = (e) => { e.preventDefault(); setQ(query.trim()); setLimit(PAGE); setPicked(null) }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-gray-900">新聞</h1>
        <form onSubmit={search} className="flex items-center gap-2 ml-auto">
          <label className="sr-only" htmlFor="news-search">搜尋新聞標題</label>
          <input id="news-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜尋標題，例如：台積電"
            className="w-56 px-3 py-1.5 text-sm border border-gray-200 rounded-full outline-none focus:border-blue-300 bg-white" />
        </form>
      </div>

      <div className="flex flex-wrap gap-2">
        {[null, ...NEWS_CATEGORIES].map((c) => (
          <button key={c ?? 'all'} type="button" onClick={() => choose(c)} aria-pressed={category === c}
            className={`px-3 py-1.5 rounded-full text-[13px] border ${category === c ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
            {c ?? '全部'}
          </button>
        ))}
      </div>

      {res.error && <p className="text-sm text-gray-500">{items.length ? '暫時無法更新，以下是上次取得的新聞。' : '暫時無法取得新聞，請稍後再試。'}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-[384px_minmax(0,1fr)] gap-4 items-start">
        {/* 左：列表（手機版選了新聞就先藏起來，看內文） */}
        <div className={`bg-white rounded-xl border border-gray-200 lg:max-h-[calc(100vh-200px)] lg:overflow-y-auto ${picked ? 'hidden lg:block' : ''}`}>
          {res.loading && !items.length && <p className="p-4 text-sm text-gray-400">載入中...</p>}
          {!res.loading && !res.error && !items.length && <p className="p-4 text-sm text-gray-400">沒有符合的新聞</p>}
          {items.map((n) => {
            const active = selected?.id === n.id
            return (
              <button key={n.id} type="button" onClick={() => setPicked(n)}
                className={`w-full text-left p-4 border-b border-gray-100 last:border-0 transition-colors ${active ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                <p className={`text-sm font-semibold leading-snug ${active ? 'text-blue-600' : 'text-gray-900'}`}>{n.title}</p>
                <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{n.summary}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap text-xs text-gray-500">
                  <span>{n.source}</span>
                  <span className="text-gray-300">·</span>
                  <span>{newsTime(n.publishedAt)}</span>
                  <ToneTag tone={n.tone} />
                </div>
              </button>
            )
          })}
          {items.length > 0 && items.length < total && limit < 100 && (
            <button type="button" onClick={() => setLimit((l) => Math.min(l + PAGE, 100))} disabled={res.loading}
              className="w-full p-3 text-sm text-blue-600 hover:bg-gray-50 disabled:text-gray-400">
              {res.loading ? '載入中...' : `載入更多（共 ${total} 則）`}
            </button>
          )}
        </div>

        {/* 右：內文 */}
        <div className={picked ? '' : 'hidden lg:block'}>
          {selected && <NewsDetail n={selected} onBack={() => setPicked(null)} />}
        </div>
      </div>
    </div>
  )
}
