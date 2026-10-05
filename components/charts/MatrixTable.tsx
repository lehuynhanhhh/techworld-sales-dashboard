'use client';

import { CSS, maxOf } from '@/lib/tokens';
import type { Matrix } from '@/lib/aggregate';

/* Không phải chart mà là <table>, nền ô pha MỰC 5% → 29%.
   ĐỪNG pha 8% → 48%: ô cao nhất thành ô khó đọc nhất, và ở dark mode thành ô sáng nhất. */
export function MatrixTable({ matrix, rowLabel, width, height, format, badIf }: {
  matrix: Matrix;
  rowLabel: string;
  width: number;
  height: number;
  format: (v: number) => string;
  /** Ô dưới ngưỡng lỗ (chỉ khi chỉ số đang chọn là Biên, G31): chữ tô --bad, nền vẫn tô nhiệt bằng mực (§4). */
  badIf?: (v: number) => boolean;
}) {
  const all = matrix.rows.flatMap((r) => r.cells).filter((v) => Number.isFinite(v));
  const hi = maxOf(all);
  const lo = Math.min(0, ...all);
  const ink = CSS('--ink');

  const tint = (v: number): string => {
    if (!Number.isFinite(v)) return 'transparent';
    const t = (v - lo) / (hi - lo || 1);
    return `color-mix(in srgb, ${ink} ${(5 + t * 24).toFixed(1)}%, transparent)`;
  };

  return (
    <div style={{ width, height, overflow: 'auto' }}>
      <table>
        <thead>
          <tr>
            <th>{rowLabel}</th>
            {matrix.cols.map((c) => <th key={c.title} title={c.title}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {matrix.rows.map((r) => (
            <tr key={r.key}>
              <td>{r.key}</td>
              {r.cells.map((v, i) => {
                const text = Number.isFinite(v) ? format(v) : '—';
                const bad = Number.isFinite(v) && badIf?.(v);
                return (
                  <td key={matrix.cols[i].title} title={`${r.key} · ${matrix.cols[i].title} · ${text}`}>
                    <span className="heat" style={{ background: tint(v), color: bad ? CSS('--bad') : undefined, fontWeight: bad ? 600 : undefined }}>{text}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
