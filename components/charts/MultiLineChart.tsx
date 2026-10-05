'use client';

import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts';
import { CSS } from '@/lib/tokens';
import { ChartTip, axisTick } from '@/components/ChartCard';

export type LineSeriesView = { key: string; name: string; color: string; rank: number };
type Datum = Record<string, string | number | null>;

/* Line nhiều đường — tối đa 5 (G14). Màu đã tính sẵn bằng seriesColor để khớp legend. */
export function MultiLineChart({ data, series, width, height, format, axis }: {
  data: Datum[];
  series: LineSeriesView[];
  width: number;
  height: number;              // đã trừ LGD1
  format: (v: number) => string;
  axis: (v: number) => string;
}) {
  const ink3 = CSS('--ink3');
  const lastLabel = data.length ? String(data[data.length - 1].label) : undefined;

  return (
    <LineChart width={width} height={height} data={data} margin={{ top: 8, right: 6, bottom: 0, left: 0 }}>
      <CartesianGrid stroke={CSS('--fill4')} vertical={false} />
      <XAxis dataKey="label" axisLine={false} tickLine={false} interval="preserveStartEnd"
             minTickGap={28} height={22} tick={axisTick(lastLabel, ink3)} />
      <YAxis axisLine={false} tickLine={false} width={52}
             tick={{ fontSize: 10.5, fill: ink3 }} tickFormatter={(v: number) => axis(v)} />
      <Tooltip isAnimationActive={false} wrapperStyle={{ outline: 'none' }} cursor={{ stroke: CSS('--line') }}
               content={(p: TooltipContentProps) => {
                 const d = p.active ? (p.payload?.[0]?.payload as Datum | undefined) : undefined;
                 if (!d) return null;
                 return (
                   <ChartTip title={String(d.label)} rows={series.map((s) => {
                     const v = d[s.key];
                     return { name: s.name, color: s.color, value: typeof v === 'number' ? format(v) : '—' };
                   })} />
                 );
               }} />
      {series.map((s) => (
        <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color}
              strokeWidth={s.rank === 0 ? 2 : 1.5} dot={false} connectNulls isAnimationActive={false} />
      ))}
    </LineChart>
  );
}
