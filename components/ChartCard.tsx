'use client';

import type { ReactNode } from 'react';
import { Icon } from '@/components/Icon';

/* Card chart: chead 43px (tiêu đề · điều khiển) → legend (tuỳ chart) → plot.
   .card có padding 14px = CARD_PAD — bề rộng vẽ đã tính sẵn bằng layout(). */
export function ChartCard({ width, title, subtitle, control, legend, children }: {
  width: number;
  title: string;
  subtitle?: string;
  control?: ReactNode;
  legend?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="card" style={{ width, flex: `0 0 ${width}px` }}>
      <div className="chead">
        <div style={{ minWidth: 0 }}>
          <div className="ct">{title}</div>
          {subtitle && <div className="cs">{subtitle}</div>}
        </div>
        {control}
      </div>
      {legend}
      <div className="plot" style={{ display: 'flex', flexDirection: 'column' }}>{children}</div>
    </div>
  );
}

/* Ba trạng thái không-có-dữ-liệu của mọi vùng (components.md §9). */
export type RegionState = 'loading' | 'error' | 'empty';

export function CardState({ state, message, onRetry }: {
  state: RegionState;
  message?: string;
  onRetry?: () => void;
}) {
  if (state === 'loading') {
    return (
      <div className="empty" style={{ gap: 8 }}>
        <span className="spin" />
        Đang tải…
      </div>
    );
  }
  if (state === 'error') {
    return (
      <div className="empty" style={{ alignItems: 'stretch' }}>
        <div className="err" style={{ marginTop: 0 }}>
          <b>Không đọc được dữ liệu</b>
          {message}
          <br />
          <button onClick={onRetry} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Icon name="refresh-cw" className="lu lu-xs" />Thử lại
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="empty">
      <b>Không có dòng nào khớp bộ lọc</b>
      Mở rộng khoảng thời gian hoặc bỏ bớt lọc vùng, ngành hàng, nguồn traffic.
    </div>
  );
}

/* Tooltip dùng chung — class .tip của CSS mẫu, đặt tĩnh trong wrapper của Recharts. */
export function ChartTip({ title, rows }: {
  title: string;
  rows: { name: string; value: string; color?: string }[];
}) {
  return (
    <div className="tip" style={{ position: 'static', opacity: 1 }}>
      <b>{title}</b>
      {rows.map((r) => (
        <div className="r" key={r.name}>
          {r.color && <i style={{ background: r.color }} />}
          {r.name}
          <span>{r.value}</span>
        </div>
      ))}
    </div>
  );
}

/* Nhãn trục x: điểm cuối căn phải để overflow:hidden của card không xén. */
type AxisTickProps = { x?: number | string; y?: number | string; index?: number; payload?: { value?: unknown } };

export function axisTick(lastLabel: string | undefined, fill: string) {
  return function AxisTick(p: AxisTickProps) {
    const v = String(p.payload?.value ?? '');
    const anchor = v === lastLabel ? 'end' : p.index === 0 ? 'start' : 'middle';
    return (
      <text x={Number(p.x ?? 0)} y={Number(p.y ?? 0) + 12} textAnchor={anchor} fontSize={10.5} fill={fill}>
        {v}
      </text>
    );
  };
}
