'use client';

import { Icon } from '@/components/Icon';
import { SparkLine } from '@/components/charts/SparkLine';
import { fmtPct, type KpiModel } from '@/lib/aggregate';

type RegionState = 'loading' | 'error' | 'empty' | 'ready';

/* Thẻ KPI theo CSS mẫu: nhãn (26) · số + pill so kỳ trước (32) · sparkline (34) · chân ngưỡng (26).
   Chỉ KPI có ngưỡng (Biên lợi nhuận, Tỷ lệ hoàn trả) mới mang tone; còn lại giữ mực. */
export function KpiCard({ label, model, state, sparkWidth, onRetry }: {
  label: string;
  model: KpiModel | null;
  state: RegionState;
  sparkWidth: number;
  onRetry: () => void;
}) {
  const tone = state === 'ready' ? model?.tone ?? null : null;

  return (
    <div className="card kpi">
      <div className="kl">
        <span style={{ width: 7, height: 7, flex: '0 0 7px', borderRadius: '50%',
                       background: tone ? `var(--${tone})` : 'var(--series-2)' }} />
        {label}
      </div>

      {state === 'ready' && model ? (
        <>
          <div className="kv" title={model.full}>
            {model.value}
            <Delta delta={model.delta} inverse={model.inverse} />
          </div>
          <div className="kspark">
            <SparkLine values={model.spark} baseline={model.baseline} width={sparkWidth} height={30} tone={tone} />
          </div>
          {/* Không dùng class .ok: CSS mẫu có .ok toàn cục (chữ xanh đậm) đè lên .ks.ok.
              Chỉ icon mang màu ngưỡng; chữ chú thích giữ mực như mọi thẻ khác. */}
          <div className="ks">
            <span style={{ display: 'inline-flex', color: tone ? `var(--${tone})` : undefined }}>
              <Icon name={tone === 'ok' ? 'circle-check' : tone ? 'triangle-alert' : 'activity'} className="lu lu-xs" />
            </span>
            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {model.note}
            </span>
          </div>
        </>
      ) : (
        <div className="kv" style={{ fontSize: 12, fontWeight: 400, letterSpacing: 0, color: 'var(--ink3)', alignItems: 'center' }}>
          {state === 'loading' ? <><span className="spin" />Đang tải…</>
            : state === 'error' ? (
              <>
                Chưa đọc được dữ liệu
                <button className="ibtn" onClick={onRetry} style={{ height: 24, marginLeft: 'auto' }}>
                  <Icon name="refresh-cw" className="lu lu-xs" />Thử lại
                </button>
              </>
            )
            : 'Không có dòng nào khớp'}
        </div>
      )}
    </div>
  );
}

/** Mũi tên theo hướng số; màu theo chiều tốt — chỉ số nghịch tăng là xấu. */
function Delta({ delta, inverse }: { delta: number | null; inverse: boolean }) {
  if (delta == null) return <span className="del n" title="Không đủ dữ liệu kỳ trước">—</span>;
  const good = inverse ? delta < 0 : delta > 0;
  const cls = Math.abs(delta) < 0.002 ? 'n' : good ? 'u' : 'd';
  return (
    <span className={`del ${cls}`} title="So với kỳ trước cùng độ dài">
      <Icon name={delta < 0 ? 'arrow-down' : 'arrow-up'} />
      {fmtPct(Math.abs(delta))}
    </span>
  );
}
