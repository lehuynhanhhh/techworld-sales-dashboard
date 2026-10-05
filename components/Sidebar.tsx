'use client';

import { Icon } from '@/components/Icon';
import { AccountMenu } from '@/components/AccountMenu';
import type { IconName } from '@/lib/icons';
import type { PageId } from '@/lib/types';

export const APP_NAME = 'Sales Performance Dashboard';

export const PAGES: { id: PageId; label: string; icon: IconName }[] = [
  { id: 'home',     label: 'Tổng quan',       icon: 'layout-dashboard' },
  { id: 'region',   label: 'Theo vùng',       icon: 'chart-pie' },
  { id: 'category', label: 'Theo ngành hàng', icon: 'coins' },
  { id: 'source',   label: 'Nguồn dữ liệu',   icon: 'database' },
];

export function Sidebar({ rail, page, onPage, onToggleRail }: {
  rail: boolean;
  page: PageId;
  onPage: (p: PageId) => void;
  onToggleRail: () => void;
}) {
  const item = (p: (typeof PAGES)[number]) => (
    <button key={p.id} className={`nav${page === p.id ? ' on' : ''}`} onClick={() => onPage(p.id)}
            title={p.label} aria-current={page === p.id ? 'page' : undefined}>
      <span className="ic"><Icon name={p.icon} /></span>
      <span className="nvt">{p.label}</span>
    </button>
  );

  return (
    <aside id="side">
      <div className="brand">
        <span className="mark"><Icon name="layout-dashboard" /></span>
        <span className="brandtxt" style={{ flex: 1, minWidth: 0 }}>
          <b title={APP_NAME} style={{ textOverflow: 'ellipsis' }}>{APP_NAME}</b>
        </span>
        <button id="collapse" onClick={onToggleRail}
                aria-label={rail ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
                title={rail ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}>
          <Icon name="panel-left" />
        </button>
      </div>

      <nav id="nav">
        <div className="lbl">Theo dõi</div>
        {PAGES.slice(0, 3).map(item)}
        <div className="lbl">Dữ liệu</div>
        {item(PAGES[3])}
      </nav>

      <div className="sfoot">
        <AccountMenu />
      </div>
    </aside>
  );
}
