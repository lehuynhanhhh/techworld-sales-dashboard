'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Icon } from '@/components/Icon';

/* Đáy sidebar (.sfoot > .acct) — ảnh đại diện + tên + email, bấm mở popover có nút
   Đăng xuất. Dùng đúng class .acct/.av/.pop.up đã có sẵn trong globals.css cho đúng
   mục đích này (xem comment "Đáy sidebar: đồng hồ dữ liệu + hàng tài khoản"). */
export function AccountMenu() {
  const { data: session } = useSession();
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

  if (!session?.user) return null;
  const name = session.user.name ?? session.user.email ?? 'Tài khoản';
  const email = session.user.email ?? '';
  const initial = name.trim().charAt(0).toUpperCase() || '?';

  return (
    <div className="wrap" ref={wrap}>
      <button className="acct" onClick={() => setOpen((v) => !v)} aria-expanded={open} title={name}>
        {session.user.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatar 24px, không cần next/image
          <img src={session.user.image} alt="" className="av" style={{ objectFit: 'cover' }} referrerPolicy="no-referrer" />
        ) : (
          <span className="av">{initial}</span>
        )}
        <span className="at">
          <b className="an">{name}</b>
          {email && <span className="ae">{email}</span>}
        </span>
      </button>

      {open && (
        <div className="pop up" role="menu">
          <div className="h">Tài khoản</div>
          <button className="r" role="menuitem" onClick={() => signOut({ callbackUrl: '/' })}>
            <Icon name="log-out" className="lu lu-sm" />
            <span>Đăng xuất</span>
          </button>
        </div>
      )}
    </div>
  );
}
