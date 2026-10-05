'use client';

import { Bar, BarChart, Cell, LabelList, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts';
import { CSS, maxOf, seriesColor, THRESHOLD } from '@/lib/tokens';
import { ChartTip } from '@/components/ChartCard';
import { fmtPct, type RankItem } from '@/lib/aggregate';

/* Bar xếp hạng ngang — không legend, tên nhóm nằm ngay cạnh thanh.
   Domain dùng maxOf(): cấm Math.max(1, …) và Math.max(…) || 1. */
export function RankBarChart({ data, width, height, format, onSelect, marginNote = false }: {
  data: RankItem[];
  width: number;
  height: number;
  format: (v: number) => string;
  onSelect?: (name: string) => void;
  marginNote?: boolean;        // chỉ số đang chọn không phải Biên ⇒ thanh lỗ ghi kèm biên (G37)
}) {
  const ink2 = CSS('--ink2');
  const rows = data.map((d) => ({
    ...d,
    label: format(d.value) + (marginNote && d.margin != null && d.margin < THRESHOLD.loss ? ` · biên ${fmtPct(d.margin)}` : ''),
  }));
  const right = rows.some((d) => d.label.length > 12) ? 124 : 64;
  const labelW = Math.min(150, Math.max(84, Math.round(width * 0.34)));
  const maxChars = Math.floor((labelW - 10) / 6.2);
  const short = (s: string) => (s.length > maxChars ? `${s.slice(0, maxChars - 1)}…` : s);

  return (
    <BarChart layout="vertical" width={width} height={height} data={rows}
              margin={{ top: 2, right, bottom: 2, left: 0 }} barCategoryGap="30%">
      <XAxis type="number" hide domain={[0, maxOf(data.map((d) => d.value))]} />
      <YAxis type="category" dataKey="name" width={labelW} axisLine={false} tickLine={false} interval={0}
             tick={{ fontSize: 11, fill: ink2 }} tickFormatter={(v: string) => short(String(v))} />
      <Tooltip isAnimationActive={false} wrapperStyle={{ outline: 'none' }} cursor={{ fill: CSS('--sub') }}
               content={(p: TooltipContentProps) => {
                 const d = p.active ? (p.payload?.[0]?.payload as RankItem | undefined) : undefined;
                 if (!d) return null;
                 return <ChartTip title={d.name} rows={[{ name: 'Giá trị', value: format(d.value) }]} />;
               }} />
      <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false}
           onClick={onSelect ? (_: unknown, i: number) => {
             const d = data[i];
             if (d) onSelect(d.name);
           } : undefined}>
        {data.map((d, i) => (
          <Cell key={d.name} fill={seriesColor({ margin: d.margin }, i)}
                style={onSelect ? { cursor: 'pointer' } : undefined} />
        ))}
        <LabelList dataKey="label" position="right" fontSize={10.5} fill={ink2} />
      </Bar>
    </BarChart>
  );
}
