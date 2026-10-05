'use client';

import { Cell, Pie, PieChart, Tooltip, type TooltipContentProps } from 'recharts';
import { CSS, seriesColor } from '@/lib/tokens';
import { ChartTip } from '@/components/ChartCard';
import { fmtPct, type Slice } from '@/lib/aggregate';

/** Màu một lát: theo luật seriesColor (biên < 0% → --bad, hạng 1 → --focus, còn lại --series-N); "Khác" → --series-5. */
export function sliceColor(s: Slice, rank: number): string {
  return s.other ? CSS('--series-5') : seriesColor({ margin: s.margin }, rank);
}

export function DonutChart({ data, width, height, format, onSelect }: {
  data: Slice[];
  width: number;
  height: number;              // đã trừ LGD2
  format: (v: number) => string;
  onSelect?: (name: string) => void;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = Math.max(12, Math.min(width, height) / 2 - 4);

  return (
    <PieChart width={width} height={height}>
      <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%"
           innerRadius={Math.round(r * 0.62)} outerRadius={Math.round(r)} paddingAngle={data.length > 1 ? 1 : 0}
           stroke={CSS('--card')} strokeWidth={1} isAnimationActive={false}
           onClick={onSelect ? (_: unknown, i: number) => {
             const s = data[i];
             if (s && !s.other) onSelect(s.name);
           } : undefined}>
        {data.map((s, i) => (
          <Cell key={s.name} fill={sliceColor(s, i)}
                style={onSelect && !s.other ? { cursor: 'pointer' } : undefined} />
        ))}
      </Pie>
      <Tooltip isAnimationActive={false} wrapperStyle={{ outline: 'none' }}
               content={(p: TooltipContentProps) => {
                 const s = p.active ? (p.payload?.[0]?.payload as Slice | undefined) : undefined;
                 if (!s) return null;
                 return (
                   <ChartTip title={s.name} rows={[
                     { name: 'Giá trị', value: format(s.value) },
                     { name: 'Tỷ trọng', value: fmtPct(total ? s.value / total : NaN) },
                     { name: 'Biên LN', value: fmtPct(s.margin ?? NaN) },
                   ]} />
                 );
               }} />
    </PieChart>
  );
}
