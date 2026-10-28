// 選中事件的詳細區：預期／前值／實際、AI 解讀、近期公布後的大盤變化
// 專業模式顯示完整數字與表格；新手模式只留結果與白話說明
import { MACRO_CATEGORIES, IMPORTANCE, COUNTRIES, RESULTS } from '../../data/macroEvents'
import { toDayKey, formatTime, formatMD, WEEKDAYS, weekdayOf } from '../../utils/macroDate'
import RelationTip from './RelationTip'

const fmtPct = (v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`
const pctClass = (v) => (v > 0 ? 'text-red-500' : v < 0 ? 'text-emerald-500' : 'text-gray-600')

// result 可能是代號（better / worse / inline）或直接是文字（例如「降息 1 碼」）
const resultMeta = (result) => RESULTS[result] ?? { label: result, className: 'bg-gray-100 text-gray-700' }

function Stat({ label, value, className = '' }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${className}`}>{value ?? '—'}</p>
    </div>
  )
}

export default function EventDetail({ event, isPro }) {
  if (!event) return null

  const cat = MACRO_CATEGORIES[event.category]
  const day = toDayKey(event.datetime)
  const released = event.actual != null
  const reactions = event.recentReactions ?? []
  const ups = reactions.filter((r) => r.change0d > 0).length
  const avg = reactions.length ? reactions.reduce((s, r) => s + r.change0d, 0) / reactions.length : 0
  const actualClass = !released ? 'text-gray-400' : event.result === 'better' ? 'text-red-500' : event.result === 'worse' ? 'text-emerald-500' : ''

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-wrap gap-6">
      {/* 左：事件資訊 */}
      <div className="flex-[1_1_360px] min-w-0 flex flex-col gap-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-gray-700 bg-gray-100 px-2 py-0.5 rounded">{COUNTRIES[event.country] ?? event.country}</span>
          <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: cat.tagBg, color: cat.tagFg }}>{cat.label}</span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full ${IMPORTANCE[event.importance].className}`}>{IMPORTANCE[event.importance].label}</span>
          <span className="text-xs text-gray-500">
            {formatMD(day)}（{WEEKDAYS[weekdayOf(day)]}）{formatTime(event.datetime)}・台灣時間
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <h2 className="text-[22px] font-bold text-gray-900">{event.name}</h2>
          <RelationTip key={event.id} category={event.category} />
        </div>

        {isPro ? (
          <div className="grid grid-cols-3 gap-3">
            <Stat label="預期" value={event.expected} />
            <Stat label="前值" value={event.previous} />
            <Stat label="實際" value={released ? event.actual : '尚未公布'} className={actualClass} />
          </div>
        ) : (
          <p className="text-sm text-gray-700">
            {released ? (
              <>
                結果：<b className={actualClass}>{event.actual}</b>
                {event.expected && <>（預期 {event.expected}）</>}
                {event.result && (
                  <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${resultMeta(event.result).className}`}>{resultMeta(event.result).label}</span>
                )}
              </>
            ) : (
              <>還沒公布，市場預期 <b>{event.expected ?? '—'}</b></>
            )}
          </p>
        )}

        <div className="bg-slate-50 rounded-xl p-3.5 flex flex-col gap-1.5">
          <span className="self-start text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">AI 解讀</span>
          <p className="text-sm leading-relaxed text-gray-800">{event.aiSummary}</p>
        </div>
      </div>

      {/* 右：近期公布後的變化 */}
      <div className="flex-[1_1_320px] min-w-0 flex flex-col gap-3">
        <div className="flex justify-between items-baseline">
          <p className="text-sm font-bold text-gray-900">近期公布後的變化</p>
          <span className="text-xs text-gray-500">加權指數漲跌</span>
        </div>

        {reactions.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center bg-gray-50 rounded-lg">尚無歷史資料</p>
        ) : isPro ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-gray-500 text-left">
                    <th className="font-normal py-1.5">公布日</th>
                    <th className="font-normal">結果</th>
                    <th className="font-normal text-right">當天</th>
                    <th className="font-normal text-right">隔天</th>
                  </tr>
                </thead>
                <tbody>
                  {reactions.map((r) => (
                    <tr key={r.date} className="border-t border-gray-100">
                      <td className="py-2.5">{formatMD(r.date)}</td>
                      <td><span className={`text-xs px-2 py-0.5 rounded-full ${resultMeta(r.result).className}`}>{resultMeta(r.result).label}</span></td>
                      <td className={`text-right font-bold ${pctClass(r.change0d)}`}>{fmtPct(r.change0d)}</td>
                      <td className={`text-right font-medium ${pctClass(r.change1d)}`}>{fmtPct(r.change1d)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-gray-100 pt-3 grid grid-cols-2 gap-3">
              <div><p className="text-xs text-gray-500">當天上漲次數</p><p className="mt-1 font-bold">{ups} / {reactions.length} 次</p></div>
              <div><p className="text-xs text-gray-500">當天平均漲跌</p><p className={`mt-1 font-bold ${pctClass(avg)}`}>{fmtPct(avg)}</p></div>
            </div>
          </>
        ) : (
          <p className="text-sm leading-relaxed text-gray-700 bg-gray-50 rounded-lg p-3.5">
            過去 {reactions.length} 次公布當天，台股有 <b>{ups} 次上漲</b>，平均
            <b className={pctClass(avg)}> {fmtPct(avg)}</b>。
          </p>
        )}
      </div>
    </div>
  )
}
