'use client';

import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts';
import { CSS } from '@/lib/tokens';
import { ChartTip, axisTick } from '@/components/ChartCard';
import type { TrendPoint } from '@/lib/aggregate';

/* Area một chuỗi — không legend, tiêu đề card đã nói đang vẽ gì. */
export function TrendAreaChart({ data, width, height, format, axis, name }: {
  data: TrendPoint[];
  width: number;
  height: number;
  format: (v: number) => string;
  axis: (v: number) => string;
  name: string;
}) {
  const ink3 = CSS('--ink3');
  const focus = CSS('--focus');
  const lastLabel = data[data.length - 1]?.label;

  return (
    <AreaChart width={width} height={height} data={data} margin={{ top: 8, right: 6, bottom: 0, left: 0 }}>
      <CartesianGrid stroke={CSS('--fill4')} vertical={false} />
      <XAxis dataKey="label" axisLine={false} tickLine={false} interval="preserveStartEnd"
             minTickGap={28} height={22} tick={axisTick(lastLabel, ink3)} />
      <YAxis axisLine={false} tickLine={false} width={52}
             tick={{ fontSize: 10.5, fill: ink3 }} tickFormatter={(v: number) => axis(v)} />
      <Tooltip isAnimationActive={false} wrapperStyle={{ outline: 'none' }} cursor={{ stroke: CSS('--line') }}
               content={(p: TooltipContentProps) => {
                 const d = p.active ? (p.payload?.[0]?.payload as TrendPoint | undefined) : undefined;
                 if (!d) return null;
                 return <ChartTip title={d.label} rows={[{ name, color: focus, value: d.value == null ? '—' : format(d.value) }]} />;
               }} />
      <Area type="monotone" dataKey="value" stroke={focus} fill={focus} fillOpacity={0.08}
            strokeWidth={1.75} dot={false} connectNulls isAnimationActive={false} />
    </AreaChart>
  );
}
