// 新聞頁面：左側為新聞列表，右側顯示選中文章的完整內容與相關股票連結（目前使用假資料）
import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { mockNews } from '../data/mockData'

export default function News() {
  const location = useLocation()
  const navigate = useNavigate()
  const [selected, setSelected] = useState(mockNews[0])

  // 從 Dashboard 點新聞過來時，自動選中該篇
  useEffect(() => {
    if (location.state?.selectedId) {
      const found = mockNews.find((n) => n.id === location.state.selectedId)
      if (found) setSelected(found)
    }
  }, [location.state])

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">News</h1>

      <div className="flex gap-4 h-[calc(100vh-140px)]">

        {/* 左側：新聞列表 */}
        <div className="w-96 shrink-0 bg-white rounded-xl border border-gray-200 overflow-y-auto">
          {mockNews.map((news, idx) => (
            <div key={news.id}>
              <div
                onClick={() => setSelected(news)}
                className={`p-4 cursor-pointer transition-colors ${
                  selected?.id === news.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <p className={`text-sm font-semibold leading-snug ${
                  selected?.id === news.id ? 'text-blue-600' : 'text-gray-900'
                }`}>
                  {news.title}
                </p>
                <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{news.summary}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-gray-400">{news.source}</span>
                  <span className="text-gray-300">·</span>
                  <span className="text-xs text-gray-400">{news.date}</span>
                </div>
              </div>
              {idx < mockNews.length - 1 && <div className="h-px bg-gray-100 mx-4" />}
            </div>
          ))}
        </div>

        {/* 右側：文章內容 */}
        {selected && (
          <div className="flex-1 bg-white rounded-xl border border-gray-200 p-6 overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 leading-snug mb-3">
              {selected.title}
            </h2>

            {/* 來源資訊 */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 mb-5 pb-5 border-b border-gray-100">
              <span>摘自 {selected.source}</span>
              <span className="text-gray-300">|</span>
              <span>{selected.date}</span>
              <span className="text-gray-300">|</span>
              <span>記者 {selected.reporter}</span>
              <span>{selected.location}</span>
            </div>

            {/* 內文 */}
            <div className="text-sm text-gray-700 leading-loose whitespace-pre-line">
              {selected.content}
            </div>

            {/* 相關股票 */}
            {selected.relatedStocks?.length > 0 && (
              <div className="mt-6 pt-5 border-t border-gray-100">
                <p className="text-sm text-gray-500 mb-2">相關股票：</p>
                <div className="flex gap-2 flex-wrap">
                  {selected.relatedStocks.map((symbol) => (
                    <button
                      key={symbol}
                      onClick={() => navigate(`/stocks?ticker=${symbol}`)}
                      className="px-3 py-1 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-700 text-sm rounded-full transition-colors"
                    >
                      {symbol}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
