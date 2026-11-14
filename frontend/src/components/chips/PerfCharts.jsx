// 法人績效頁的圖表：持有天數 vs 勝率／平均報酬、20 日報酬分布
import {
  ComposedChart, BarChart, Bar, Line, Cell, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid, ResponsiveContainer,
} from 'recharts'

const AXIS = { fontSize: 11, fill: '#6b7280' }
const pct = (v) => `${v > 0 ? '+' : ''}${v}%`

// 長條＝勝率（左軸 0～100，虛線 50%），紅線＝平均報酬（右軸）
export function HorizonChart({ horizons, height = 210 }) {
  const data = horizons.map((h) => ({ ...h, label: `${h.days} 日` }))
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 5, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#f3f4f6" vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis yAxisId="win" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={AXIS} tickLine={false} axisLine={false} width={42} tickFormatter={(v) => `${v}%`} />
        <YAxis yAxisId="ret" orientation="right" tick={AXIS} tickLine={false} axisLine={false} width={40} tickFormatter={(v) => `${v}%`} />
        <ReferenceLine yAxisId="win" y={50} stroke="#9ca3af" strokeDasharray="4 3" />
        <Tooltip formatter={(v, n) => (n === 'winRate' ? [`${v}%`, '勝率'] : [pct(v), '平均報酬'])} cursor={{ fill: '#f3f4f6' }} />
        <Bar yAxisId="win" dataKey="winRate" fill="#bfdbfe" radius={[3, 3, 0, 0]} />
        <Line yAxisId="ret" type="monotone" dataKey="avgReturn" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

// 紅＝賺錢的區間、綠＝賠錢的區間
export function DistChart({ dist, height = 210 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={dist} margin={{ top: 5, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#f3f4f6" vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} interval={0} />
        <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} width={28} />
        <Tooltip formatter={(v) => [`${v} 次`, '次數']} cursor={{ fill: '#f3f4f6' }} />
        <Bar dataKey="count" radius={[3, 3, 0, 0]}>
          {dist.map((d) => <Cell key={d.label} fill={d.positive ? '#fca5a5' : '#86efac'} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
