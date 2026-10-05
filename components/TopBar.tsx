'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import type { IconName } from '@/lib/icons';
import type { Alert } from '@/lib/aggregate';

/* Header 46px. Nút `Bộ lọc` (.ibtn.pri) là nút brand DUY NHẤT của dashboard (G30).
   Không ô tìm kiếm, không tài khoản (G21). */
export function TopBar({
  label, icon, syncing, syncedAt, onSync, alerts, onAlert, theme, onTheme,
  onExport, onFilter, filterCount,
}: {
  label: string;
  icon: IconName;
  syncing: boolean;
  syncedAt: string;
  onSync: () => void;
  alerts: Alert[];
  onAlert: (a: Alert) => void;
  theme: 'light' | 'dark';
  onTheme: () => void;
  onExport: () => void;
  onFilter: () => void;
  filterCount: number;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <header id="top">
      <div className="htitle">
        <Icon name={icon} />
        <b>{label}</b>
      </div>

      <div className="topright">
        <span className="sync">
          <span className={`led${syncing ? ' busy' : ''}`} />
          {syncing ? 'Đang đồng bộ…' : <>Đồng bộ lúc <b>{syncedAt || '—'}</b></>}
        </span>
        <button className={`ibtn icon${syncing ? ' spin' : ''}`} onClick={onSync} disabled={syncing}
                aria-label="Đồng bộ lại dữ liệu" title="Đồng bộ lại dữ liệu">
          <Icon name="refresh-cw" />
        </button>

        <div className="wrap" ref={wrap}>
          <button className="ibtn icon" onClick={() => setOpen((v) => !v)} aria-expanded={open}
                  aria-label={`Cảnh báo (${alerts.length})`} title="Cảnh báo">
            <Icon name="bell" />
            {alerts.length > 0 && <s>{alerts.length}</s>}
          </button>
          {open && (
            <div className="pop" role="menu">
              <div className="h">Cảnh báo</div>
              {alerts.length === 0 ? (
                <div className="r"><Icon name="circle-check" />Không có cảnh báo trong kỳ</div>
              ) : alerts.map((a) => (
                <button key={a.id} className="r" role="menuitem" title={`${a.text} · ${a.value}`}
                        onClick={() => { setOpen(false); onAlert(a); }}>
                  <i style={{ background: `var(--${a.level})` }} />
                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.text}
                  </span>
                  <b>{a.value}</b>
                </button>
              ))}
            </div>
          )}
        </div>

        <button className="ibtn icon" onClick={onTheme}
                aria-label={theme === 'light' ? 'Chuyển giao diện tối' : 'Chuyển giao diện sáng'}
                title={theme === 'light' ? 'Giao diện tối' : 'Giao diện sáng'}>
          <Icon name={theme === 'light' ? 'moon' : 'sun'} />
        </button>
        <button className="ibtn" onClick={onExport}>
          <Icon name="download" className="lu lu-sm" />Xuất dữ liệu
        </button>
        <button className="ibtn pri" onClick={onFilter}>
          <Icon name="sliders-horizontal" className="lu lu-sm" />
          Bộ lọc{filterCount ? ` (${filterCount})` : ''}
        </button>
      </div>
    </header>
  );
}
