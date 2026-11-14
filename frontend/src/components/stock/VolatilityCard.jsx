// 個股頁的波動預測卡片（AI 組模型）：專業版看信心、各期間波動比較與說明；新手版用白話說「會不會晃得很厲害」
// AI 組規定：機率只用 confidence（不能用 prob_expand，那是「波動放大」的機率，會被誤讀成上漲機率）；
// signal_strength = weak 時只說「波動變化不明顯」不強調機率；reliability_note 一定要顯示
// 放大用橘色、縮小用藍色，不用紅綠，避免被看成漲跌

const DIR = {
  expand:   { bg: 'bg-orange-50', fg: 'text-orange-700', bar: 'bg-orange-600', track: 'bg-orange-100', beginner: '可能會晃得比較大' },
  contract: { bg: 'bg-blue-50',   fg: 'text-blue-700',   bar: 'bg-blue-700',   track: 'bg-blue-100',   beginner: '可能會比較平穩' },
}
const pct = (v, digits = 2) => `${(v * 100).toFixed(digits)}%`
const md = (iso) => `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`

function Note({ text }) {
  return (
    <div className="flex gap-2 items-start px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="2" aria-hidden="true" className="shrink-0 mt-0.5">
        <circle cx="12" cy="12" r="9" /><path d="M12 8v.01M11 12h1v5h1" />
      </svg>
      <p className="text-xs leading-relaxed text-gray-600">{text}</p>
    </div>
  )
}

// 沒有正常預測時（成交量太少、新上市、抓不到）的白話說明
function Unavailable({ kind, message, beginner }) {
  const map = {
    illiquid: { title: beginner ? '交易太少，無法預測' : '成交量過低', text: message ?? '近期成交量過低，無法可靠預測波動。' },
    new:      { title: '上市時間太短', text: beginner ? '上市還不到 65 個交易日，資料不夠，暫時沒有預測。' : (message ?? '交易未滿 65 天，暫無預測。') },
    none:     { title: '暫無預測', text: beginner ? '目前拿不到預測結果，請稍後再試。' : '暫時無法取得預測結果，請稍後再試。' },
  }
  const m = map[kind] ?? map.none
  return (
    <div className="p-3.5 rounded-lg bg-gray-50">
      <p className={`font-bold text-gray-700 ${beginner ? 'text-lg' : 'text-base'}`}>{m.title}</p>
      <p className="text-[13px] text-gray-600 mt-1 leading-relaxed">{m.text}</p>
    </div>
  )
}

function ProBody({ v }) {
  const weak = v.signal_strength === 'weak'
  const style = DIR[v.direction] ?? DIR.contract
  const max = Math.max(v.recent_vol, v.avg_vol_20d, v.avg_vol_60d) || 1
  const vols = [['最近 3 天', v.recent_vol, true], ['過去 20 天', v.avg_vol_20d], ['過去 60 天', v.avg_vol_60d]]
  return (
    <>
      {weak ? (
        <div className="p-3.5 rounded-lg bg-gray-100">
          <p className="text-lg font-bold text-gray-700">波動變化不明顯</p>
          <p className="text-xs text-gray-600 mt-1">未來 {v.horizon_days} 天波動可能和最近差不多</p>
        </div>
      ) : (
        <div className={`p-3.5 rounded-lg ${style.bg} flex flex-col gap-1.5`}>
          <p className={`text-lg font-bold ${style.fg}`}>{v.label}</p>
          <div className="flex items-center gap-2.5">
            <span className="text-[13px] text-gray-700">模型信心 <b>{Math.round(v.confidence * 100)}%</b></span>
            <div className={`flex-1 max-w-40 h-1.5 rounded ${style.track}`}>
              <div className={`h-1.5 rounded ${style.bar}`} style={{ width: `${v.confidence * 100}%` }} />
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <p className="text-xs text-gray-500">平均每日波動（漲跌幅絕對值）</p>
        {vols.map(([label, val, main]) => (
          <div key={label} className="grid grid-cols-[64px_1fr_48px] items-center gap-2 text-xs">
            <span className="text-gray-700">{label}</span>
            <div className="h-2 bg-gray-100 rounded">
              <div className={`h-2 rounded ${main ? 'bg-gray-700' : 'bg-gray-300'}`} style={{ width: `${(val / max) * 100}%` }} />
            </div>
            <span className="text-right font-bold">{pct(val)}</span>
          </div>
        ))}
      </div>
      <p className="text-xs leading-relaxed text-gray-600">{v.explanation}</p>
    </>
  )
}

function BeginnerBody({ v, name }) {
  const weak = v.signal_strength === 'weak'
  const style = DIR[v.direction] ?? DIR.contract
  const sure = v.confidence >= 0.75 ? '高' : v.confidence >= 0.6 ? '中' : '普通'
  return (
    <>
      <p className={`text-xl font-bold ${weak ? 'text-gray-700' : style.fg}`}>{weak ? '波動變化不明顯' : style.beginner}</p>
      <p className="text-[15px] leading-relaxed">
        最近 3 天，{name} <b>每天平均漲跌 {pct(v.recent_vol, 1)}</b>，平常（過去 60 天）大約 {pct(v.avg_vol_60d, 1)}。
        {weak ? '模型看不出接下來會變大還是變小。' : v.direction === 'expand' ? '模型認為接下來幾天，漲跌幅度可能變大。' : '模型認為接下來幾天，漲跌幅度可能會慢慢變小。'}
      </p>
      {!weak && <p className="text-sm text-gray-700">模型把握：<b>{sure}（{Math.round(v.confidence * 100)}%）</b></p>}
      <div className="flex gap-2.5 items-start p-3 rounded-lg bg-orange-50">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c2410c" strokeWidth="2" aria-hidden="true" className="shrink-0 mt-0.5">
          <path d="M12 3l9 16H3z" /><path d="M12 10v4M12 17v.01" />
        </svg>
        <div>
          <p className="text-sm font-bold text-orange-900">這不是在預測漲或跌</p>
          <p className="text-xs text-gray-600 leading-relaxed mt-0.5">「晃得大」代表可能大漲、也可能大跌；「比較平穩」只代表每天的漲跌幅度可能變小。</p>
        </div>
      </div>
    </>
  )
}

export default function VolatilityCard({ vol, name, beginner = false }) {
  const r = vol.data
  const v = r?.kind === 'ok' ? r.data : null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 min-w-0 flex flex-col gap-3">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          {beginner && <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">AI 預測</span>}
          <p className={`font-bold text-gray-900 ${beginner ? 'text-base' : 'text-sm'}`}>
            {beginner ? `接下來 ${v?.horizon_days ?? 3} 天會晃得很厲害嗎？` : '波動預測'}
          </p>
          {!beginner && v && <span className="text-[11px] text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">未來 {v.horizon_days} 個交易日</span>}
        </div>
        {v && <span className="text-xs text-gray-500">資料日期 {md(v.as_of_date)}</span>}
      </div>

      {vol.loading || (!r && !vol.error) ? (
        <p className="text-sm text-gray-400 py-6 text-center">載入中...</p>
      ) : v ? (
        <>
          {beginner ? <BeginnerBody v={v} name={name} /> : <ProBody v={v} />}
          {v.reliability_note && <Note text={v.reliability_note} />}
        </>
      ) : (
        <Unavailable kind={r?.kind ?? 'none'} message={r?.message} beginner={beginner} />
      )}
    </div>
  )
}
