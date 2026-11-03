// 個股 dashboard 的圖表（recharts）：股價＋成交量、同業漲跌幅、每季 EPS、法人買賣超
import {
  ComposedChart, LineChart, BarChart, AreaChart, Area, Line, Bar, Cell, XAxis, YAxis, Tooltip,
  CartesianGrid, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { movingAverage, toPctRows } from '../../utils/series'
import { fmtNum, fmtPct } from '../../utils/market'

const AXIS = { fontSize: 11, fill: '#6b7280' }
const md = (iso) => `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`

const TooltipBox = ({ children }) => (
  <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg flex flex-col gap-1">{children}</div>
)

// ─── 股價＋20 日均線＋成交量（專業版）─────────────────────────────
export function PriceVolumeChart({ history, height = 260 }) {
  const ma = movingAverage(history.map((h) => h.close), 20)
  const rows = history.map((h, i) => ({ ...h, ma20: ma[i] }))
  const maxVol = Math.max(...history.map((h) => h.volume))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={rows} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#f3f4f6" vertical={false} />
        <XAxis dataKey="date" tickFormatter={md} tick={AXIS} tickLine={false} axisLine={false} minTickGap={28} />
        <YAxis yAxisId="price" domain={['auto', 'auto']} tick={AXIS} tickLine={false} axisLine={false} width={56}
          tickFormatter={(v) => v.toLocaleString('en-US', { maximumFractionDigits: 0 })} />
        {/* 成交量放在另一個 Y 軸，domain 放大 4 倍讓長條只佔下方四分之一 */}
        <YAxis yAxisId="vol" hide domain={[0, maxVol * 4]} />
        <Tooltip
          content={({ active, payload, label }) => active && payload?.length ? (
            <TooltipBox>
              <span className="text-gray-400">{label}</span>
              <span>收盤 {fmtNum(payload[0].payload.close)}</span>
              {payload[0].payload.ma20 != null && <span className="text-orange-300">20 日均線 {fmtNum(payload[0].payload.ma20)}</span>}
              <span className="text-gray-300">成交量 {payload[0].payload.volume.toLocaleString()}</span>
            </TooltipBox>
          ) : null}
        />
        <Bar yAxisId="vol" dataKey="volume" fill="#cbd5e1" />
        <Line yAxisId="price" type="monotone" dataKey="ma20" stroke="#ea580c" strokeWidth={1.5} strokeDasharray="4 3" dot={false} connectNulls />
        <Line yAxisId="price" type="monotone" dataKey="close" stroke="#2563eb" strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

// ─── 簡單股價走勢（新手版）：漲用紅、跌用綠 ──────────────────────
export function SimplePriceChart({ history, height = 200 }) {
  const up = history.length > 1 && history.at(-1).close >= history[0].close
  const color = up ? '#dc2626' : '#16a34a'
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={history} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="simplePriceFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.15} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" tickFormatter={md} tick={AXIS} tickLine={false} axisLine={false} minTickGap={36} />
        <YAxis domain={['auto', 'auto']} hide />
        <Tooltip formatter={(v) => [`${fmtNum(v)} 元`, '收盤']} labelFormatter={md} />
        <Area type="monotone" dataKey="close" stroke={color} strokeWidth={2.5} fill="url(#simplePriceFill)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ─── 國際同業漲跌幅走勢 ──────────────────────────────────────────
// series 第一個是主角；lines 每條的顯示設定 { ticker, name, color, dash, width, currency }
export function PeerChart({ series, lines, height = 260, showAxis = true }) {
  const rows = toPctRows(series)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={rows} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#f3f4f6" vertical={false} />
        <XAxis dataKey="date" tickFormatter={md} tick={AXIS} tickLine={false} axisLine={false} minTickGap={36} hide={!showAxis} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}%`} hide={!showAxis} />
        <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="4 3" />
        <Tooltip
          content={({ active, payload, label }) => active && payload?.length ? (
            <TooltipBox>
              <span className="text-gray-400">{label}</span>
              {lines.map((l) => {
                const row = payload[0].payload
                if (row[l.ticker] == null) return null
                return (
                  <span key={l.ticker} className="flex items-center gap-2">
                    <span className="w-2.5 h-0.5" style={{ background: l.color }} />
                    <span className="flex-1">{l.name}</span>
                    <span className="text-gray-300">{l.currency ?? ''}{fmtNum(row._close[l.ticker])}</span>
                    <span className="font-bold w-14 text-right">{fmtPct(row[l.ticker], 1)}</span>
                  </span>
                )
              })}
            </TooltipBox>
          ) : null}
        />
        {lines.map((l) => (
          <Line key={l.ticker} type="monotone" dataKey={l.ticker} stroke={l.color} strokeWidth={l.width ?? 2}
            strokeDasharray={l.dash} dot={false} connectNulls />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

// ─── 每季 EPS 長條圖：最新一季用深色 ─────────────────────────────
export function EpsBarChart({ quarters, values, height = 150 }) {
  const rows = quarters.map((q, i) => ({ q, eps: values[i] }))
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} margin={{ top: 5, right: 4, left: 0, bottom: 0 }}>
        <XAxis dataKey="q" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis hide />
        <Tooltip formatter={(v) => [v, 'EPS']} cursor={{ fill: '#f3f4f6' }} />
        <Bar dataKey="eps" radius={[3, 3, 0, 0]}>
          {rows.map((r, i) => <Cell key={r.q} fill={i === rows.length - 1 ? '#2563eb' : '#bfdbfe'} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── 外資每日買賣超：買超紅、賣超綠 ──────────────────────────────
export function InstitutionalBarChart({ rows, dataKey = 'foreign', height = 150 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} margin={{ top: 5, right: 4, left: 0, bottom: 0 }}>
        <XAxis dataKey="date" tickFormatter={md} tick={AXIS} tickLine={false} axisLine={false} interval={1} />
        <YAxis hide />
        <ReferenceLine y={0} stroke="#d1d5db" />
        <Tooltip formatter={(v) => [`${v > 0 ? '+' : ''}${v.toLocaleString()} 張`, '外資']} labelFormatter={md} cursor={{ fill: '#f3f4f6' }} />
        <Bar dataKey={dataKey} radius={[2, 2, 0, 0]}>
          {rows.map((r) => <Cell key={r.date} fill={r[dataKey] >= 0 ? '#dc2626' : '#16a34a'} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
