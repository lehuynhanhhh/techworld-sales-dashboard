'use client';

import { CSS, maxOf } from '@/lib/tokens';
import type { Tone } from '@/lib/aggregate';

/* SVG tay — Recharts ReferenceLine kéo theo cả hệ trục và lề, không vừa hộp 30px.
   Đường chuẩn gạch ngang là BẮT BUỘC: nhờ nó sparkline cho biết đang trên hay dưới mốc. */
export function SparkLine({ values, baseline, width, height, tone = null }: {
  values: number[];
  baseline: number;          // ngưỡng nghiệp vụ, hoặc trung bình kỳ
  width: number;
  height: number;
  tone?: Tone;               // null = giữ mực, KPI không có ngưỡng
}) {
  if (values.length < 2) return <svg width={width} height={height} aria-hidden="true" />;

  const pad = 2;
  const hi = Math.max(maxOf(values), baseline);
  const lo = Math.min(...values, baseline, 0);
  const span = hi - lo || 1;

  const x = (i: number) => (i / (values.length - 1)) * width;
  const y = (v: number) => pad + (1 - (v - lo) / span) * (height - pad * 2);

  const points = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const stroke = tone ? CSS(`--${tone}`) : CSS('--ink2');

  return (
    <svg width={width} height={height} aria-hidden="true">
      <line x1={0} x2={width} y1={y(baseline)} y2={y(baseline)}
            stroke={CSS('--ink3')} strokeWidth={1} strokeDasharray="3 3" />
      <polyline points={points} fill="none" stroke={stroke} strokeWidth={1.5}
                strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
