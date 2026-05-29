'use client'

import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

interface AreaChartData {
  month: string
  users: number
  cumulative: number
}

interface BarChartData {
  hour: string
  posts: number
}

const PURPLE = '#7c3aed'
const BLUE = '#3b82f6'

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-xl px-3 py-2 text-xs"
      style={{ background: '#1a1a2e', border: '1px solid rgba(120,80,255,0.3)' }}
    >
      <p className="font-bold text-white mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}

export function HQAreaChart({ data }: { data: AreaChartData[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={PURPLE} stopOpacity={0.3} />
            <stop offset="95%" stopColor={PURPLE} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={BLUE} stopOpacity={0.25} />
            <stop offset="95%" stopColor={BLUE} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis
          dataKey="month"
          tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="cumulative"
          name="Toplam Üye"
          stroke={PURPLE}
          strokeWidth={2.5}
          fill="url(#purpleGrad)"
          dot={{ fill: PURPLE, r: 4, strokeWidth: 0 }}
          activeDot={{ r: 6, fill: PURPLE }}
        />
        <Area
          type="monotone"
          dataKey="users"
          name="Yeni Üye"
          stroke={BLUE}
          strokeWidth={2}
          fill="url(#blueGrad)"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function HQBarChart({ data }: { data: BarChartData[] }) {
  const peakHour = data.reduce((max, d) => (d.posts > max.posts ? d : max), data[0] ?? { posts: 0, hour: '' })

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -25, bottom: 0 }} barSize={6}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis
          dataKey="hour"
          tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }}
          axisLine={false}
          tickLine={false}
          interval={3}
        />
        <YAxis
          tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="posts" name="Gönderi" radius={[3, 3, 0, 0]}>
          {data.map((entry) => (
            <Cell
              key={entry.hour}
              fill={entry.hour === peakHour.hour ? '#f59e0b' : 'rgba(124,58,237,0.6)'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
