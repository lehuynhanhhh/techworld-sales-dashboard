'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import { clockVN, greetVN, todayVN } from '@/lib/aggregate';

export type FilterChip = { key: string; label: string; value: string; onRemove: () => void };

/* Băng 52px: lời chào + ngày theo UTC+7, bên phải là chip bộ lọc đang áp.
   Giờ chỉ tính ở client (sau mount) để HTML server và client không lệch nhau. */
export function GreetBar({ context, chips, onClearAll }: {
  context: string;
  chips: FilterChip[];
  onClearAll: () => void;
}) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 30_000);   // tự đổi lời chào khi qua mốc giờ
    return () => { clearTimeout(first); clearInterval(id); };
  }, []);

  return (
    <div id="greet">
      <div style={{ minWidth: 0 }}>
        <div className="ghi">{now ? greetVN(now) : ' '}</div>
        <div className="gday">
          {now ? `${todayVN(now)} · ${clockVN(now)} giờ Việt Nam` : ' '}
          {context && ` · ${context}`}
        </div>
      </div>

      {chips.length > 0 && (
        <div className="chips">
          {chips.map((c) => (
            <span className="chip" key={c.key}>
              {c.label} <b>{c.value}</b>
              <button onClick={c.onRemove} aria-label={`Bỏ lọc ${c.label}`} title={`Bỏ lọc ${c.label}`}>
                <Icon name="x" className="lu lu-xs" />
              </button>
            </span>
          ))}
          {chips.length > 1 && <button className="chip" onClick={onClearAll}>Xoá tất cả</button>}
        </div>
      )}
    </div>
  );
}
