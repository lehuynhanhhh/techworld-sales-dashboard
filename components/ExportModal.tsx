'use client';

import { useState } from 'react';
import { Icon } from '@/components/Icon';
import { ddmm, fmtInt } from '@/lib/aggregate';
import type { Row } from '@/lib/types';

type Scope = 'filter' | 'all' | 'custom';

/* Tên cột xuất = tên cột gốc trong Sheet (specification.md §7). */
const COLS: { id: keyof Row; label: string }[] = [
  { id: 'date', label: 'date' },                { id: 'region', label: 'region' },
  { id: 'category', label: 'category' },        { id: 'source', label: 'traffic_source' },
  { id: 'status', label: 'order_status' },      { id: 'sales', label: 'sales' },
  { id: 'profit', label: 'net_profit' },        { id: 'quantity', label: 'quantity' },
  { id: 'mkt', label: 'marketing_cost' },       { id: 'ship', label: 'shipping_cost' },
  { id: 'lines', label: 'order_lines' },        { id: 'orders', label: 'orders' },
  { id: 'returned', label: 'returned_lines' },  { id: 'ratingSum', label: 'rating_sum' },
  { id: 'ratingCount', label: 'rating_count' },
];

/* RFC 4180: ô chứa dấu phân tách, nháy kép hoặc xuống dòng thì bọc nháy, nháy bên trong nhân đôi. */
function toCsv(rows: Row[], cols: typeof COLS, sep: string): string {
  const cell = (v: unknown): string => {
    const s = String(v);
    return /["\r\n]/.test(s) || s.includes(sep) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.map((c) => c.label).join(sep),
          ...rows.map((r) => cols.map((c) => cell(r[c.id])).join(sep))].join('\r\n');
}

/* Hai bước: bấm "Xuất dữ liệu" chỉ mở bảng chọn → xem trước số dòng → mới có nút tải.
   Sửa ở đây KHÔNG đụng bộ lọc dashboard. */
export function ExportModal({ open, onClose, filteredRows, allRows, dates, range }: {
  open: boolean;
  onClose: () => void;
  filteredRows: Row[];       // đúng tập dòng đang hiển thị trên dashboard
  allRows: Row[];
  dates: string[];
  range: { from: number; to: number };
}) {
  const last = Math.max(0, dates.length - 1);
  const [scope, setScope] = useState<Scope>('filter');
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);
  const [picked, setPicked] = useState<string[]>(COLS.map((c) => c.label));
  const [sep, setSep] = useState<';' | ','>(';');   // mặc định chấm phẩy cho Excel tiếng Việt (G29)
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) { setScope('filter'); setFrom(range.from); setTo(range.to); }
  }

  const custom = allRows.filter((r) => r.t >= from && r.t <= to);
  const out = scope === 'filter' ? filteredRows : scope === 'all' ? allRows : custom;
  const cols = COLS.filter((c) => picked.includes(c.label));
  const allOn = cols.length === COLS.length;
  const can = out.length > 0 && cols.length > 0;

  let lo = Infinity, hi = -Infinity;
  for (const r of out) { if (r.t < lo) lo = r.t; if (r.t > hi) hi = r.t; }
  const span = out.length ? `${ddmm(dates[lo])} → ${ddmm(dates[hi])}` : 'không có dòng';

  /* dates là trục ngày lịch liên tục ⇒ chỉ số = số ngày tính từ dates[0]. */
  const dayIndex = (iso: string) => Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${dates[0]}T00:00:00Z`)) / 86_400_000);
  const indexFrom = (iso: string) => Math.max(0, Math.min(last, dayIndex(iso)));
  const indexTo = indexFrom;

  function download() {
    if (!can) return;
    const blob = new Blob(['﻿' + toCsv(out, cols, sep)], { type: 'text/csv;charset=utf-8' });   // BOM để Excel đọc đúng tiếng Việt
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `techworld_sales_${dates[lo]}_${dates[hi]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const radio = (on: boolean, label: string, n: number | null, onClick: () => void) => (
    <button key={label} className={`rad${on ? ' on' : ''}`} role="radio" aria-checked={on} onClick={onClick}>
      <span className="dot" />
      {label}
      {n != null && <span className="n">{fmtInt(n)} dòng</span>}
    </button>
  );

  return (
    <div id="modal" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Xuất dữ liệu">
        <div className="sh">
          <b>Xuất dữ liệu</b>
          <button className="ibtn icon" onClick={onClose} aria-label="Đóng"><Icon name="x" /></button>
        </div>

        <div className="sb">
          <div className="fl">Phạm vi dòng</div>
          {radio(scope === 'filter', 'Theo bộ lọc dashboard', filteredRows.length, () => setScope('filter'))}
          {radio(scope === 'all', 'Toàn bộ dữ liệu', allRows.length, () => setScope('all'))}
          {radio(scope === 'custom', 'Tuỳ chỉnh khoảng ngày', custom.length, () => setScope('custom'))}
          {scope === 'custom' && (
            <div className="dates">
              <label>Từ ngày
                <input type="date" value={dates[from] ?? ''} min={dates[0]} max={dates[to]}
                       onChange={(e) => { if (e.target.value) setFrom(Math.min(indexFrom(e.target.value), to)); }} />
              </label>
              <label>Đến ngày
                <input type="date" value={dates[to] ?? ''} min={dates[from]} max={dates[last]}
                       onChange={(e) => { if (e.target.value) setTo(Math.max(indexTo(e.target.value), from)); }} />
              </label>
            </div>
          )}

          <div className="fl" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Cột xuất · {cols.length}/{COLS.length}</span>
            <button className="chip" style={{ textTransform: 'none', letterSpacing: 0 }}
                    onClick={() => setPicked(allOn ? [] : COLS.map((c) => c.label))}>
              {allOn ? 'Bỏ tất cả' : 'Chọn tất cả'}
            </button>
          </div>
          <div className="cols">
            {COLS.map((c) => {
              const on = picked.includes(c.label);
              return (
                <button key={c.label} className="cbx" role="checkbox" aria-checked={on}
                        onClick={() => setPicked((p) => (on ? p.filter((x) => x !== c.label) : [...p, c.label]))}>
                  <span className={`box${on ? ' on' : ''}`}><Icon name="check" /></span>
                  <span className="mono">{c.label}</span>
                </button>
              );
            })}
          </div>

          <div className="fl">Định dạng CSV — dấu phân tách</div>
          {radio(sep === ';', 'Dấu chấm phẩy ( ; ) — Excel tiếng Việt', null, () => setSep(';'))}
          {radio(sep === ',', 'Dấu phẩy ( , )', null, () => setSep(','))}
        </div>

        <div className="sf">
          <span className="cs">Sẽ xuất <b>{fmtInt(out.length)}</b> dòng × <b>{cols.length}</b> cột · {span}</span>
          <button className="dbtn ghost" onClick={onClose}>Huỷ</button>
          <button className="dbtn pri" onClick={download} disabled={!can}
                  style={can ? undefined : { opacity: 0.4, cursor: 'not-allowed' }}>
            <Icon name="download" className="lu lu-sm" />Tải xuống
          </button>
        </div>
      </div>
    </div>
  );
}
