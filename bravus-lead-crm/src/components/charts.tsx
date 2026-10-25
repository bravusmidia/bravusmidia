import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { brl } from '../lib/format';

export const PALETTE = ['#2563EB', '#06B6D4', '#8B5CF6', '#F59E0B', '#10B981', '#EF4444', '#64748B', '#0EA5E9', '#6366F1', '#14B8A6'];
const axis = { fontSize: 11, fill: '#94A3B8' };
const tip = { contentStyle: { borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 12, boxShadow: '0 8px 24px -8px rgba(16,24,40,.2)' } };

type D = { name: string; value: number; [k: string]: any }[];

export function AreaSeries({ data, money, height = 220 }: { data: D; money?: boolean; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ left: -16, right: 8, top: 8 }}>
        <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563EB" stopOpacity={0.35} /><stop offset="100%" stopColor="#2563EB" stopOpacity={0} /></linearGradient></defs>
        <CartesianGrid stroke="#E2E8F0" strokeOpacity={0.5} vertical={false} />
        <XAxis dataKey="name" tick={axis} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={16} />
        <YAxis tick={axis} tickLine={false} axisLine={false} allowDecimals={false} tickFormatter={money ? (v) => brl(v) : undefined} width={money ? 72 : 40} />
        <Tooltip {...tip} formatter={(v: any) => (money ? brl(v) : v)} />
        <Area type="monotone" dataKey="value" name="Total" stroke="#2563EB" strokeWidth={2} fill="url(#g1)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function Bars({ data, money, horizontal, height = 240, color = '#2563EB', keys }: { data: D; money?: boolean; horizontal?: boolean; height?: number; color?: string; keys?: { key: string; name: string; color: string }[] }) {
  const fmt = (v: any) => (money ? brl(v) : v);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ left: horizontal ? 8 : -16, right: 12, top: 8 }}>
        <CartesianGrid stroke="#E2E8F0" strokeOpacity={0.5} horizontal={!horizontal} vertical={!!horizontal} />
        {horizontal ? <><XAxis type="number" tick={axis} tickLine={false} axisLine={false} allowDecimals={false} tickFormatter={money ? fmt : undefined} /><YAxis type="category" dataKey="name" tick={axis} tickLine={false} axisLine={false} width={150} /></>
          : <><XAxis dataKey="name" tick={axis} tickLine={false} axisLine={false} interval={0} /><YAxis tick={axis} tickLine={false} axisLine={false} allowDecimals={false} tickFormatter={money ? fmt : undefined} width={money ? 72 : 40} /></>}
        <Tooltip {...tip} formatter={fmt} cursor={{ fill: 'rgba(37,99,235,.06)' }} />
        {keys ? <>{keys.map((k) => <Bar key={k.key} dataKey={k.key} name={k.name} fill={k.color} radius={4} maxBarSize={28} />)}<Legend wrapperStyle={{ fontSize: 12 }} /></>
          : <Bar dataKey="value" name="Total" fill={color} radius={4} maxBarSize={28} />}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Donut({ data, height = 220 }: { data: D; height?: number }) {
  if (!data.length) return <p className="py-12 text-center text-sm text-ink-soft">Sem dados no período.</p>;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2} stroke="none">
          {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
        </Pie>
        <Tooltip {...tip} />
        <Legend wrapperStyle={{ fontSize: 11 }} layout="vertical" align="right" verticalAlign="middle" />
      </PieChart>
    </ResponsiveContainer>
  );
}
