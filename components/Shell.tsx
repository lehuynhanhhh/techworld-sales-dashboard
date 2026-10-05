'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { CV } from '@/lib/tokens';

/* #viewport (mặt bàn --page, lề sinh bằng `scale: .94` trong CSS) bọc #stage (tấm
   1600×900). #stage là nơi DUY NHẤT có transform — gán inline bởi hàm fit.
   `stageId="login"` dùng hộp #login của CSS mẫu (nền --sub, nội dung canh giữa)
   cho trang giới thiệu. */
export function Shell({ children, className = '', stageId = 'stage' }: {
  children: ReactNode;
  className?: string;
  stageId?: 'stage' | 'login';
}) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const fit = () => setScale(Math.min(innerWidth / CV.w, innerHeight / CV.h));
    fit();
    addEventListener('resize', fit);
    return () => removeEventListener('resize', fit);
  }, []);

  return (
    <div id="viewport">
      <div id={stageId} className={className} style={{ transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}
