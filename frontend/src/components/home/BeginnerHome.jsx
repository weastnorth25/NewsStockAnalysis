// 首頁・新手模式（草稿 B）：市場溫度計＋白話重點 → 三張指數卡 → 這週要注意、大家在看的新聞
import { useNavigate } from 'react-router-dom'
import { changeClass, fmtPct, fmtNum, calcSentiment } from '../../utils/market'
import { mockNews } from '../../data/mockData'
import MacroUpcomingCard from '../macro/MacroUpcomingCard'

const BEGINNER_INDICES = [
  { ticker: '^TWII', label: '台股加權指數', hint: '代表台灣上市公司整體表現' },
  { ticker: '^IXIC', label: '美股那斯達克', hint: '科技股為主，常影響隔天台股' },
  { ticker: 'TWD=X', label: '美元 / 台幣',  hint: '台幣升值通常代表外資匯入', fx: true, digits: 3 },
]

// 指數卡右上角的白話標籤；匯率上漲代表美元變貴、台幣貶值
function wordOf(pct, fx) {
  if (pct == null) return null
  if (fx) return pct < 0 ? { text: '台幣升值', className: 'bg-blue-100 text-blue-800' } : { text: '台幣貶值', className: 'bg-gray-100 text-gray-700' }
  if (pct > 0) return { text: '上漲', className: 'bg-red-100 text-red-800' }
  if (pct < 0) return { text: '下跌', className: 'bg-emerald-100 text-emerald-800' }
  return { text: '持平', className: 'bg-gray-100 text-gray-700' }
}

// 依今天的真實漲跌整理白話重點（之後換成 AI 總結 API）
function buildPoints(quotes) {
  const tw = quotes['^TWII']?.data
  const nq = quotes['^IXIC']?.data
  const fx = quotes['TWD=X']?.data
  const pts = []
  const verb = (v) => (v > 0 ? '上漲' : v < 0 ? '下跌' : '持平')
  if (tw) pts.push({ dir: Math.sign(tw.change_pct), text: `台股加權指數今天${verb(tw.change_pct)} ${Math.abs(tw.change_pct)}%，收在 ${fmtNum(tw.current_price)} 點` })
  if (nq) pts.push({ dir: Math.sign(nq.change_pct), text: `美股那斯達克${verb(nq.change_pct)} ${Math.abs(nq.change_pct)}%，${nq.change_pct >= 0 ? '科技股氣氛不錯' : '科技股偏弱，台股電子股可能受影響'}` })
  if (fx) pts.push({ dir: fx.change_pct < 0 ? 1 : -1, text: fx.change_pct < 0 ? `台幣升值到 ${fx.current_price}，代表外資可能在匯入` : `台幣貶值到 ${fx.current_price}，外資可能在匯出` })
  return pts
}

const DIR_ICON = {
  1:  { icon: '↑', className: 'bg-red-100 text-red-800' },
  0:  { icon: '–', className: 'bg-gray-100 text-gray-700' },
  '-1': { icon: '↓', className: 'bg-emerald-100 text-emerald-800' },
}

function Thermometer({ score }) {
  const s = calcSentiment(score)
  return (
    <div className="flex flex-col items-center gap-1.5 shrink-0">
      <svg width="200" height="116" viewBox="0 0 200 116" role="img" aria-label={`市場溫度 ${s.temp}，${s.label}`}>
        <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="#e5e7eb" strokeWidth="16" strokeLinecap="round" />
        <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke={s.color} strokeWidth="16" strokeLinecap="round"
          pathLength="100" strokeDasharray={`${score === null ? 0 : s.temp} 100`} style={{ transition: 'stroke-dasharray .8s ease' }} />
        <text x="100" y="92" textAnchor="middle" fontSize="34" fontWeight="700" fill="#111827">{score === null ? '--' : s.temp}</text>
      </svg>
      <span className={`text-xl font-bold ${s.textClass}`}>{s.label}</span>
      <span className="text-xs text-gray-500">市場溫度（0 很悲觀・100 很樂觀）</span>
    </div>
  )
}

export default function BeginnerHome({ quotes, score }) {
  const navigate = useNavigate()
  const points = buildPoints(quotes)
  const loading = Object.values(quotes).some((q) => q.loading)

  return (
    <div className="flex flex-col gap-4 max-w-[1180px]">
      <div className="bg-white rounded-xl border border-gray-200 p-7 flex flex-wrap gap-7 items-center">
        <Thermometer score={score} />
        <div className="flex-[1_1_360px] min-w-0 flex flex-col gap-3">
          <span className="self-start text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">今天的重點</span>
          {points.length === 0 && <p className="text-gray-400">{loading ? '正在整理今天的市場...' : '暫時無法取得市場資料'}</p>}
          {points.map((p) => (
            <div key={p.text} className="flex gap-2.5 items-start text-[15px] leading-relaxed">
              <span className={`shrink-0 w-[22px] h-[22px] rounded-full flex items-center justify-center text-xs font-bold ${DIR_ICON[p.dir].className}`}>{DIR_ICON[p.dir].icon}</span>
              <span>{p.text}</span>
            </div>
          ))}
          <p className="text-xs text-gray-500">依今日行情自動整理，AI 總結開發中・非投資建議</p>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        {BEGINNER_INDICES.map((idx) => {
          const q = quotes[idx.ticker]
          const d = q?.data
          const word = wordOf(d?.change_pct, idx.fx)
          return (
            <div key={idx.ticker} className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <p className="text-sm font-bold text-gray-900">{idx.label}</p>
                {word && <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${word.className}`}>{word.text}</span>}
              </div>
              {q?.loading && <p className="text-sm text-gray-400 py-2">載入中...</p>}
              {q?.error && <p className="text-sm text-gray-400 py-2">無法取得資料</p>}
              {d && (
                <div className="flex items-baseline gap-2">
                  <span className="text-[26px] font-bold text-gray-900">{fmtNum(d.current_price, idx.digits ?? 2)}</span>
                  <span className={`text-sm font-medium ${changeClass(d.change_pct)}`}>{fmtPct(d.change_pct)}</span>
                </div>
              )}
              <p className="text-xs text-gray-500 leading-relaxed">{idx.hint}</p>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MacroUpcomingCard variant="beginner" limit={3} />

        <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3 min-w-0">
          <div className="flex justify-between items-center">
            <p className="text-base font-bold text-gray-900">大家在看的新聞</p>
            <button type="button" onClick={() => navigate('/news')} className="text-xs text-blue-600 hover:text-blue-700">更多新聞</button>
          </div>
          {mockNews.slice(0, 3).map((n) => {
            const good = n.sentiment >= 0.6
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => navigate('/news', { state: { selectedId: n.id } })}
                className="flex flex-col gap-1.5 text-left p-3.5 border border-gray-200 rounded-lg hover:border-blue-300"
              >
                <span className={`self-start text-[11px] px-2 py-0.5 rounded-full ${good ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>{good ? '利多' : '利空'}</span>
                <span className="text-sm font-medium leading-relaxed text-gray-900">{n.title}</span>
                <span className="text-xs text-gray-600 leading-relaxed line-clamp-2">{n.summary}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
