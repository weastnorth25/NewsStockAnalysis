// 法人籌碼頁的圖表：三大法人堆疊長條＋股價、外資買賣超＋股價（新手）、單一數列折線（持股比例／融資）
import {
  ComposedChart, LineChart, Bar, Line, Cell, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid, ResponsiveContainer,
} from 'recharts'
import { INST_KEYS, md } from '../../utils/chipsInsights'

const AXIS = { fontSize: 11, fill: '#6b7280' }
const lots = (v) => `${v > 0 ? '+' : ''}${v.toLocaleString()} 張`
// 股價軸：小數最多 1 位，避免 179.55 這種刻度
const pxTick = (v) => v.toLocaleString('en-US', { maximumFractionDigits: 1 })
const kLots = (v) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : v)

function InstTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const r = payload[0].payload
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2 text-xs flex flex-col gap-0.5">
      <p className="text-gray-500">{md(label)}</p>
      {INST_KEYS.map((k) => (
        <p key={k.key}><span style={{ color: k.color }}>■</span> {k.name} {lots(r[k.key])}</p>
      ))}
      <p className="text-gray-700">收盤 {r.close.toLocaleString()}</p>
    </div>
  )
}

// 專業版：stackOffset="sign" 讓買超往上疊、賣超往下疊，不會互相抵銷
export function InstStackChart({ rows, height = 280 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={rows} stackOffset="sign" margin={{ top: 5, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#f3f4f6" vertical={false} />
        <XAxis dataKey="date" tickFormatter={md} tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis yAxisId="lots" tick={AXIS} tickLine={false} axisLine={false} width={40} tickFormatter={kLots} />
        <YAxis yAxisId="px" orientation="right" domain={['auto', 'auto']} tick={AXIS} tickLine={false} axisLine={false} width={48} tickFormatter={pxTick} />
        <ReferenceLine yAxisId="lots" y={0} stroke="#d1d5db" />
        <Tooltip content={<InstTooltip />} cursor={{ fill: '#f3f4f6' }} />
        {INST_KEYS.map((k) => <Bar key={k.key} yAxisId="lots" dataKey={k.key} stackId="inst" fill={k.color} />)}
        <Line yAxisId="px" type="monotone" dataKey="close" stroke="#111827" strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

// 新手版：只看外資，紅買綠賣
export function ForeignPriceChart({ rows, height = 220 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={rows} margin={{ top: 5, right: 4, left: 0, bottom: 0 }}>
        <XAxis dataKey="date" tickFormatter={md} tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis yAxisId="lots" hide />
        <YAxis yAxisId="px" orientation="right" domain={['auto', 'auto']} tick={AXIS} tickLine={false} axisLine={false} width={48} tickFormatter={pxTick} />
        <ReferenceLine yAxisId="lots" y={0} stroke="#d1d5db" />
        <Tooltip
          formatter={(v, n) => (n === 'foreign' ? [lots(v), '外資'] : [v.toLocaleString() + ' 元', '股價'])}
          labelFormatter={md}
          cursor={{ fill: '#f3f4f6' }}
        />
        <Bar yAxisId="lots" dataKey="foreign" radius={[2, 2, 0, 0]}>
          {rows.map((r) => <Cell key={r.date} fill={r.foreign >= 0 ? '#dc2626' : '#16a34a'} />)}
        </Bar>
        <Line yAxisId="px" type="monotone" dataKey="close" stroke="#111827" strokeWidth={2.5} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

// 單一數列折線：外資持股比例、融資餘額
export function SeriesLineChart({ rows, dataKey, color, format, height = 150 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={rows} margin={{ top: 5, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#f3f4f6" vertical={false} />
        <XAxis dataKey="date" tickFormatter={md} tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis domain={['auto', 'auto']} tick={AXIS} tickLine={false} axisLine={false} width={48} tickFormatter={format} />
        <Tooltip formatter={(v) => [format(v)]} labelFormatter={md} />
        <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
