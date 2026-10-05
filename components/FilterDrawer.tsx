'use client';

import { useState, type ReactNode } from 'react';
import { Icon, sourceIcon } from '@/components/Icon';
import * as A from '@/lib/aggregate';
import type { Filters, Row } from '@/lib/types';

const ROW_H = 28;        // chiều cao một hàng checkbox
const CHIP_ON = { background: 'var(--sub2)', color: 'var(--ink)', borderColor: 'var(--ink3)' };

/* Sáu nhóm theo thứ tự: chỉ số · thời gian · vùng · ngành hàng (kèm chip nguồn traffic) · Xoá hết · Áp dụng
   (layout.md §8, G26). Sửa ở đây là NHÁP — chỉ ghi vào bộ lọc thật khi bấm Áp dụng. */
export function FilterDrawer({ open, filters, rows, dates, onApply, onClose }: {
  open: boolean;
  filters: Filters;
  rows: Row[];
  dates: string[];
  onApply: (f: Filters) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Filters>(filters);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {            // mỗi lần mở: nháp bắt đầu từ bộ lọc đang áp
    setWasOpen(open);
    if (open) setDraft(filters);
  }

  const last = Math.max(0, dates.length - 1);
  const set = (patch: Partial<Filters>) => setDraft((d) => ({ ...d, ...patch }));

  const regions = A.distinct(rows, 'region');
  const categories = A.distinct(rows, 'category');
  const sources = A.distinct(rows, 'source');

  /* Số đơn (phân bổ) trong khoảng ngày đang nháp — đơn là đơn vị người dùng nghĩ tới, không phải số dòng. */
  const ordersBy = (key: 'region' | 'category') => {
    const m = new Map<string, number>();
    for (const r of rows) if (r.t >= draft.from && r.t <= draft.to) m.set(r[key], (m.get(r[key]) ?? 0) + r.orders);
    return m;
  };
  const rgOrders = ordersBy('region');
  const ctOrders = ordersBy('category');

  /* dates là trục ngày lịch liên tục ⇒ chỉ số = số ngày tính từ dates[0]. */
  const indexOf = (iso: string) => Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${dates[0]}T00:00:00Z`)) / 86_400_000);
  const setFrom = (iso: string) => set({ preset: 'custom', from: Math.max(0, Math.min(indexOf(iso), draft.to)) });
  const setTo = (iso: string) => set({ preset: 'custom', to: Math.min(last, Math.max(indexOf(iso), draft.from)) });

  const check = (key: string, on: boolean, label: ReactNode, n: number, onClick: () => void) => (
    <button key={key} className="cbx" role="checkbox" aria-checked={on} onClick={onClick} style={{ height: ROW_H }}>
      <span className={`box${on ? ' on' : ''}`}><Icon name="check" /></span>
      <span className="cn">{label}</span>
      <span className="n">{A.fmtOrders(n)}</span>
    </button>
  );

  return (
    <>
      <div id="scrim" onClick={onClose} />
      <aside id="drawer" aria-label="Bộ lọc" aria-hidden={!open}>
        <div className="dh">
          <b>Bộ lọc</b>
          <button className="ibtn icon" onClick={onClose} aria-label="Đóng bộ lọc"><Icon name="x" /></button>
        </div>

        <div className="fl">Chỉ số theo dõi</div>
        <div className="seg">
          {A.PARAMS.map((p) => (
            <button key={p.key} className={draft.param === p.key ? 'on' : ''} style={{ flex: 1 }}
                    onClick={() => set({ param: p.key })}>{p.label}</button>
          ))}
        </div>

        <div className="fl">Khoảng thời gian</div>
        <div className="seg sm">
          {A.PRESETS.map((p) => (
            <button key={String(p.key)} className={draft.preset === p.key ? 'on' : ''} style={{ flex: 1 }}
                    onClick={() => set({ preset: p.key, ...A.presetRange(p.key, last) })}>{p.label}</button>
          ))}
        </div>
        <div className="dates">
          <label>Từ ngày
            <input type="date" value={dates[draft.from] ?? ''} min={dates[0]} max={dates[draft.to]}
                   onChange={(e) => { if (e.target.value) setFrom(e.target.value); }} />
          </label>
          <label>Đến ngày
            <input type="date" value={dates[draft.to] ?? ''} min={dates[draft.from]} max={dates[last]}
                   onChange={(e) => { if (e.target.value) setTo(e.target.value); }} />
          </label>
        </div>

        <div className="fl">Vùng · số đơn</div>
        {regions.map((c) => check(
          c, A.inSel(draft.regions, c), <span className="nm">{c}</span>, rgOrders.get(c) ?? 0,
          () => set({ regions: A.toggleSel(draft.regions, regions, c) }),
        ))}

        <div className="fl">Ngành hàng · số đơn</div>
        {categories.map((c) => check(
          c, A.inSel(draft.categories, c), <span className="nm">{c}</span>, ctOrders.get(c) ?? 0,
          () => set({ categories: A.toggleSel(draft.categories, categories, c) }),
        ))}
        <div className="cs" style={{ margin: '8px 0 4px' }}>Nguồn traffic</div>
        <div className="chips" style={{ flexWrap: 'wrap' }}>
          {sources.map((s) => {
            const on = A.inSel(draft.sources, s);
            return (
              <button key={s} className="chip" aria-pressed={on} style={on ? CHIP_ON : undefined}
                      onClick={() => set({ sources: A.toggleSel(draft.sources, sources, s) })}>
                <Icon name={sourceIcon(s)} className="lu lu-xs" />{s}
              </button>
            );
          })}
        </div>

        <div className="dfoot">
          <button className="dbtn ghost" onClick={() => setDraft(A.defaultFilters(last))}>
            <Icon name="rotate-ccw" className="lu lu-sm" />Xoá hết
          </button>
          <button className="dbtn pri" onClick={() => onApply(draft)}>Áp dụng</button>
        </div>
      </aside>
    </>
  );
}
