'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Shell } from '@/components/Shell';
import { Sidebar, PAGES } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { GreetBar, type FilterChip } from '@/components/GreetBar';
import { KpiCard } from '@/components/KpiCard';
import { ChartCard, CardState } from '@/components/ChartCard';
import { Legend } from '@/components/Legend';
import { FilterDrawer } from '@/components/FilterDrawer';
import { ExportModal } from '@/components/ExportModal';
import { Icon } from '@/components/Icon';
import { DonutChart, sliceColor } from '@/components/charts/DonutChart';
import { TrendAreaChart } from '@/components/charts/TrendAreaChart';
import { MultiLineChart } from '@/components/charts/MultiLineChart';
import { RankBarChart } from '@/components/charts/RankBarChart';
import { MatrixTable } from '@/components/charts/MatrixTable';
import { layout, seriesColor, LGD1, LGD2, SIDE_RAIL, SIDE_WIDE, THRESHOLD } from '@/lib/tokens';
import * as A from '@/lib/aggregate';
import type { DataPayload, Filters, Grain, PageId, Row, Sel } from '@/lib/types';

/* Trang này CHỈ giữ state + bố cục. Toán tổng hợp ở lib/aggregate.ts, JSX chart ở components/charts.
   Không có lượt đọc tự động: tab chỉ đổi khi pipeline publish lại — chỉ nút Đồng bộ (components.md §8, G28). */

type LoadState = 'loading' | 'error' | 'ready';
type Region = 'loading' | 'error' | 'empty' | 'ready';
type Dim = 'region' | 'category';

const NO_ROWS: Row[] = [];
const NO_DATES: string[] = [];
const ENV_VARS = ['GOOGLE_SHEETS_SPREADSHEET_ID', 'GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_PRIVATE_KEY'];
const BAD: CSSProperties = { color: 'var(--bad)', fontWeight: 600 };
const WARN: CSSProperties = { color: 'var(--warn)', fontWeight: 600 };
const LEFT: CSSProperties = { textAlign: 'left' };
/* Bảng schema trang 4 cuộn theo BỘI SỐ hàng — cắt nửa dòng trông như lỗi (layout.md §6). Chiều cao ô khoá cứng
   (padding 0, line-height = chiều cao) thì mới cộng đúng; vùng cuộn = 1 hàng tiêu đề + 7 hàng, thấp hơn khung card. */
const SCHEMA_ROW_H = 26;
const SCHEMA_VISIBLE = 8;
const SROW: CSSProperties = { height: SCHEMA_ROW_H, padding: '0 8px', lineHeight: `${SCHEMA_ROW_H - 1}px`, boxSizing: 'border-box' };

/** Nhóm đang lỗ: thêm chữ "(lỗ)" sau tên trong legend — màu --bad không đứng một mình (G37). */
const lossName = (name: string, margin: number | null): string =>
  margin != null && margin < THRESHOLD.loss ? `${name} (lỗ)` : name;

type LoadResult = { ok: true; json: DataPayload } | { ok: false; message: string };

/** Chỉ gọi route của chính app — client không bao giờ chạm credential. */
async function fetchData(): Promise<LoadResult> {
  try {
    const res = await fetch('/api/data', { cache: 'no-store' });
    const json = (await res.json()) as DataPayload;
    if (!res.ok || json.error) return { ok: false, message: json.error ?? `Máy chủ trả mã ${res.status}` };
    return { ok: true, json };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Lỗi không xác định' };
  }
}

export default function DashboardPage() {
  const [data, setData] = useState<DataPayload | null>(null);
  const [state, setState] = useState<LoadState>('loading');
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(true);
  const [filters, setFilters] = useState<Filters | null>(null);
  const [page, setPage] = useState<PageId>('home');
  const [grain, setGrain] = useState<Grain>('week');
  const [rail, setRail] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [drawer, setDrawer] = useState(false);
  const [exporting, setExporting] = useState(false);

  const busyRef = useRef(false);       // chặn hai lượt fetch chồng nhau
  const mountedRef = useRef(true);
  /* setup PHẢI đặt lại true — React Strict Mode (dev) chạy setup → cleanup → setup; effect chỉ có cleanup
     sẽ kẹt mountedRef ở false ⇒ dashboard treo mãi ở "Đang tải…" (đã xảy ra thật ở dashboards_marketing). */
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const apply = useCallback((r: LoadResult) => {
    if (!mountedRef.current) return;
    if (r.ok) {
      const maxT = r.json.dates.length - 1;
      setData(r.json);
      setFilters((f) => (f ? A.clampFilters(f, maxT) : A.defaultFilters(maxT)));
      setState('ready');
    } else {
      setError(r.message);
      setState('error');
    }
    setSyncing(false);
    busyRef.current = false;
  }, []);

  /** Bấm Đồng bộ / Thử lại: mọi vùng dữ liệu về trạng thái đang tải; đang có lượt chạy thì bỏ qua. */
  const runFetch = useCallback(() => {
    if (busyRef.current) return;
    busyRef.current = true;
    setSyncing(true);
    setState('loading');
    void fetchData().then(apply);
  }, [apply]);

  /* Fetch MỘT lần khi mount; mọi thao tác lọc chạy trên mảng đã có trong bộ nhớ.
     Không gọi runFetch() ở đây: nó setState đồng bộ trong thân effect (react-hooks/set-state-in-effect). */
  useEffect(() => {
    busyRef.current = true;
    void fetchData().then(apply);
  }, [apply]);

  const retry = runFetch;

  const L = useMemo(() => layout(rail ? SIDE_RAIL : SIDE_WIDE), [rail]);
  const rows = data?.rows ?? NO_ROWS;
  const dates = data?.dates ?? NO_DATES;
  const f = useMemo(() => filters ?? A.defaultFilters(0), [filters]);
  const ready = state === 'ready' && filters !== null;
  const days = f.to - f.from + 1;

  const cur = useMemo(() => (ready ? A.applyFilters(rows, f) : NO_ROWS), [ready, rows, f]);
  const kpis = useMemo(() => (ready ? A.kpiModels(cur, A.prevRows(rows, f), days) : null), [ready, cur, rows, f, days]);
  const alerts = useMemo(() => (ready ? A.alerts(A.dateRows(rows, f)) : []), [ready, rows, f]);

  const region: Region = state !== 'ready' ? state : cur.length ? 'ready' : 'empty';
  const P = f.param;
  const PL = A.paramLabel(P);
  const fmt = (v: number) => A.fmtParam(v, P);
  const axis = (v: number) => A.fmtAxis(v, P);

  const setF = (patch: Partial<Filters>) => setFilters((x) => (x ? { ...x, ...patch } : x));

  /* Bấm donut (vùng) / bar (nguồn traffic) ở trang 1: lọc ngay, hiện thành chip; bấm lại cùng nhóm là bỏ (G32). */
  const pickOnly = (key: 'regions' | 'sources', name: string) => setFilters((x) => {
    if (!x) return x;
    const s = x[key];
    const next: Sel = s !== 'all' && s.length === 1 && s[0] === name ? 'all' : [name];
    return { ...x, [key]: next };
  });

  /* Chip bộ lọc đang áp ở thanh chào — × bỏ ngay (G32). */
  const chips: FilterChip[] = [];
  const addChip = (key: string, label: string, sel: Sel, unit: string, clear: () => void) => {
    if (sel === 'all') return;
    const value = sel.length === 0 ? 'không chọn' : sel.length <= 2 ? sel.join(', ') : `${sel.length} ${unit}`;
    chips.push({ key, label, value, onRemove: clear });
  };
  if (filters) {
    addChip('rg', 'Vùng', filters.regions, 'vùng', () => setF({ regions: 'all' }));
    addChip('ct', 'Ngành hàng', filters.categories, 'ngành hàng', () => setF({ categories: 'all' }));
    addChip('src', 'Nguồn', filters.sources, 'nguồn', () => setF({ sources: 'all' }));
  }
  const clearDims = () => setF({ regions: 'all', categories: 'all', sources: 'all' });

  const context = page === 'source'
    ? 'Trang này không áp bộ lọc'
    : ready && dates.length ? `Kỳ ${A.ddmm(dates[f.from])} → ${A.ddmmyyyy(dates[f.to])} · ${days} ngày` : '';

  /* Cảnh báo: lọc sẵn nhóm vượt ngưỡng rồi nhảy trang (components.md §8). */
  const onAlert = (a: A.Alert) => {
    setF({
      regions: a.region ? [a.region] : 'all',
      categories: a.category ? [a.category] : 'all',
      sources: a.source ? [a.source] : 'all',
    });
    setPage(a.page);
  };

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;   // đặt trước khi render lại để CSS() đọc đúng token mới
    setTheme(next);
  };

  const stateBody = (r: Region): ReactNode =>
    r === 'ready' ? null : <CardState state={r} message={error} onRetry={retry} />;
  const sb = stateBody(region);
  const isReady = region === 'ready';

  /* ── Nội dung Row 2 / Row 3 theo trang (layout.md §6) ──────────────────── */
  let row2: ReactNode;
  let row3: ReactNode;

  if (page === 'home') {
    const sl = isReady ? A.slices(cur, 'region', 'sales') : [];
    const trendData = isReady ? A.trend(cur, grain, P, dates, f) : [];
    const bySource = isReady ? A.ranking(cur, 'source', P) : [];
    const matrix = isReady ? A.monthMatrix(rows, f, dates, P) : null;

    row2 = (
      <>
        <ChartCard width={L.a} title="Tỷ trọng Doanh thu theo vùng" subtitle="Bấm một phần để lọc theo vùng"
                   legend={isReady ? <Legend two items={sl.map((s, i) => ({ name: lossName(s.name, s.margin), color: sliceColor(s, i) }))} /> : undefined}>
          {sb ?? <DonutChart data={sl} width={L.p2a.w} height={L.p2a.h - LGD2} format={A.fmtMoney}
                             onSelect={(n) => pickOnly('regions', n)} />}
        </ChartCard>
        <ChartCard width={L.b} title={`Xu hướng ${PL}`} subtitle={`Theo ${A.GRAIN_WORD[grain]}`}
                   control={
                     <div className="seg sm">
                       {A.GRAINS.map((g) => (
                         <button key={g.key} className={grain === g.key ? 'on' : ''} onClick={() => setGrain(g.key)}>{g.label}</button>
                       ))}
                     </div>
                   }>
          {sb ?? <TrendAreaChart data={trendData} width={L.p2b.w} height={L.p2b.h} format={fmt} axis={axis} name={PL} />}
        </ChartCard>
      </>
    );
    row3 = (
      <>
        <ChartCard width={L.c} title={`Nguồn traffic theo ${PL}`} subtitle="Bấm một thanh để lọc theo nguồn">
          {sb ?? <RankBarChart data={bySource} width={L.p3c.w} height={L.p3c.h} format={fmt} marginNote={P !== 'margin'}
                               onSelect={(n) => pickOnly('sources', n)} />}
        </ChartCard>
        <ChartCard width={L.d} title={`${PL} theo vùng × 8 tháng gần nhất`} subtitle="Mỗi cột một tháng lịch, tính đến tháng cuối kỳ">
          {sb ?? (matrix && <MatrixTable matrix={matrix} rowLabel="Vùng" width={L.p3d.w} height={L.p3d.h} format={fmt}
                                          badIf={P === 'margin' ? (v) => v < THRESHOLD.loss : undefined} />)}
        </ChartCard>
      </>
    );
  } else if (page === 'region' || page === 'category') {
    const dim: Dim = page;
    const word = dim === 'region' ? 'vùng' : 'ngành hàng';
    const g = A.autoGrain(days);
    const dp = A.donutParam(P);
    const rank = isReady ? A.ranking(cur, dim, P) : [];
    const lines = isReady ? A.multiLine(cur, dim, P, g, dates, f) : null;
    const series = lines ? lines.series.map((s, i) => ({ key: s.key, name: lossName(s.name, s.margin), rank: i, color: seriesColor({ margin: s.margin }, i) })) : [];
    const sl = isReady ? A.slices(cur, dim, dp) : [];
    const table = isReady ? A.metricRows(cur, dim, P) : [];

    row2 = (
      <>
        <ChartCard width={L.a} title={`Xếp hạng ${word} theo ${PL}`}>
          {sb ?? <RankBarChart data={rank} width={L.p2a.w} height={L.p2a.h} format={fmt} marginNote={P !== 'margin'} />}
        </ChartCard>
        <ChartCard width={L.b} title={`${PL} theo ${word}`} subtitle={`Theo ${A.GRAIN_WORD[g]}`}
                   legend={isReady ? <Legend items={series.map((s) => ({ name: s.name, color: s.color }))} /> : undefined}>
          {sb ?? (lines && <MultiLineChart data={lines.data} series={series} width={L.p2b.w} height={L.p2b.h - LGD1}
                                           format={fmt} axis={axis} />)}
        </ChartCard>
      </>
    );
    row3 = (
      <>
        <ChartCard width={L.c} title={`Tỷ trọng ${A.paramLabel(dp)} theo ${word}`}
                   legend={isReady ? <Legend two items={sl.map((s, i) => ({ name: lossName(s.name, s.margin), color: sliceColor(s, i) }))} /> : undefined}>
          {sb ?? <DonutChart data={sl} width={L.p3c.w} height={L.p3c.h - LGD2} format={(v) => A.fmtParam(v, dp)} />}
        </ChartCard>
        <ChartCard width={L.d} title={`Chỉ số đầy đủ theo ${word}`} subtitle={`Sắp theo ${PL} giảm dần`}>
          {sb ?? <MetricsTable rows={table} dim={dim} width={L.p3d.w} height={L.p3d.h} />}
        </ChartCard>
      </>
    );
  } else {
    /* Trang 4 · Nguồn dữ liệu — không băng KPI, không áp bộ lọc. */
    const s = state === 'ready' ? null : stateBody(state);
    const first = rows[0];
    const info: [string, string][] = data ? [
      ['Nguồn', 'Google Sheets'],
      ['Tab', data.tab],
      ['Nguồn gốc', 'analytics_sales → pipeline dashboard'],
      ['Số dòng', A.fmtInt(data.count)],
      ['Ngày có đơn', `${A.fmtInt(data.activeDays)} / ${A.fmtInt(dates.length)} ngày lịch`],
      ['Khoảng ngày', `${A.ddmmyyyy(dates[0])} → ${A.ddmmyyyy(dates[dates.length - 1])}`],
      ['Quyền', 'spreadsheets.readonly'],
      ['Đồng bộ gần nhất', `${A.clockVN(new Date(data.fetchedAt))} · ${A.todayVN(new Date(data.fetchedAt))}`],
    ] : [];

    row2 = (
      <>
        <ChartCard width={L.a} title="Thông tin kết nối">
          {s ?? (
            <div className="tscroll">
              <table>
                <tbody>
                  {info.map(([k, v]) => (
                    <tr key={k}>
                      <td>{k}</td>
                      <td>
                        {k === 'Đồng bộ gần nhất'
                          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="clock" className="lu lu-xs" />{v}</span>
                          : v}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ChartCard>
        <ChartCard width={L.b} title="Schema và vai trò từng cột" subtitle="Theo specification.md §7">
          {s ?? (
            <div className="tscroll" style={{ height: SCHEMA_ROW_H * SCHEMA_VISIBLE, flex: '0 0 auto', overflowY: 'auto' }}>
              <table>
                <thead><tr><th style={SROW}>Cột</th><th style={{ ...SROW, ...LEFT }}>Kiểu</th><th style={{ ...SROW, ...LEFT }}>Vai trò</th><th style={SROW}>Ví dụ</th></tr></thead>
                <tbody>
                  {A.SCHEMA.map((c) => (
                    <tr key={c.col}>
                      <td className="mono" style={SROW}>{c.col}</td>
                      <td style={{ ...SROW, ...LEFT }}>{c.type}</td>
                      <td style={{ ...SROW, ...LEFT }}><span className="role">{c.role}</span></td>
                      <td style={SROW}>{first ? String(first[c.field]) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ChartCard>
      </>
    );
    row3 = (
      <>
        <ChartCard width={L.c} title="Biến môi trường" subtitle="Chỉ tên biến — giá trị chỉ đọc ở server">
          {s ?? (
            <div className="tscroll">
              <table>
                <thead><tr><th>Biến</th><th>Đọc ở</th></tr></thead>
                <tbody>{ENV_VARS.map((v) => <tr key={v}><td className="mono">{v}</td><td>server</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </ChartCard>
        <ChartCard width={L.d} title="Kiểm tra chất lượng dữ liệu" subtitle="Chạy trên giá trị thô của Sheet">
          {s ?? (
            <div className="tscroll">
              <table>
                <thead><tr><th>Kiểm tra</th><th>Số dòng lỗi</th><th>Trạng thái</th></tr></thead>
                <tbody>
                  {(data?.quality ?? []).map((q) => (
                    <tr key={q.id}>
                      <td>{q.label}</td>
                      <td>{A.fmtInt(q.count)}</td>
                      <td>
                        {q.count === 0
                          ? <span className="ok"><Icon name="circle-check" className="lu lu-xs" />Đạt</span>
                          : <span style={{ ...WARN, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                                  title={q.note}>
                              <Icon name="triangle-alert" className="lu lu-xs" />
                              {q.expected === q.count ? 'Đã biết' : 'Cần xem'}
                            </span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ChartCard>
      </>
    );
  }

  const meta = PAGES.find((p) => p.id === page) ?? PAGES[0];
  const stageClass = [rail && 'rail', drawer && 'drawer', exporting && 'modal'].filter(Boolean).join(' ');

  return (
    <Shell className={stageClass}>
      <Sidebar rail={rail} page={page} onPage={setPage} onToggleRail={() => setRail((v) => !v)} />

      <main id="main">
        <TopBar label={meta.label} icon={meta.icon}
                syncing={syncing} syncedAt={data ? A.clockVN(new Date(data.fetchedAt)) : ''} onSync={retry}
                alerts={alerts} onAlert={onAlert}
                theme={theme} onTheme={toggleTheme}
                onExport={() => { if (ready) setExporting(true); }}
                onFilter={() => { if (ready) setDrawer(true); }}
                filterCount={chips.length} />

        <div id="body" className={page === 'source' ? 'nokpi' : ''}>
          <GreetBar context={context} chips={page === 'source' ? [] : chips} onClearAll={clearDims} />

          {page !== 'source' && (
            <div id="kpis">
              {A.KPI_LABELS.map((label, i) => (
                <KpiCard key={label} label={label} model={kpis?.[i] ?? null} state={region}
                         sparkWidth={L.kpiW - 28} onRetry={retry} />
              ))}
            </div>
          )}

          {/* Trang 4 giãn hai hàng bằng flex 1 1 0; minHeight 0 để bảng dài cuộn trong khối. */}
          <div id="row2" style={page === 'source' ? { minHeight: 0 } : undefined}>{row2}</div>
          <div id="row3" style={page === 'source' ? { minHeight: 0 } : undefined}>{row3}</div>
        </div>
      </main>

      {data && filters && (
        <FilterDrawer open={drawer} filters={filters} rows={rows} dates={dates}
                      onApply={(next) => { setFilters(next); setDrawer(false); }}
                      onClose={() => setDrawer(false)} />
      )}
      {data && filters && (
        <ExportModal open={exporting} onClose={() => setExporting(false)}
                     filteredRows={cur} allRows={rows} dates={dates} range={{ from: f.from, to: f.to }} />
      )}
    </Shell>
  );
}

/* Bảng chỉ số đầy đủ (components.md §12). Ô chỉ tô màu khi so với ngưỡng, luôn kèm giá trị (G31).
   Rộng hơn khung thì cuộn ngang trong khối, cột tên ghim cố định; tiền rút gọn, đầy đủ trong tooltip (G38). */
const CELL: CSSProperties = { padding: '5px 5px' };
const PIN: CSSProperties = { position: 'sticky', left: 0, zIndex: 1, background: 'var(--card)' };
const PIN_HEAD: CSSProperties = { position: 'sticky', left: 0, zIndex: 3 };
const METRIC_HEADS = ['Doanh thu', 'Lợi nhuận', 'Biên LN', 'Số đơn', 'AOV', 'Số lượng', 'Hoàn trả', 'Chi phí / đơn', 'Điểm TB'];

function MetricsTable({ rows, dim, width, height }: {
  rows: A.MetricRow[];
  dim: Dim;
  width: number;
  height: number;
}) {
  const money = (v: number) => <td style={CELL} title={A.fmtMoney(v)}>{A.fmtMoneyShort(v)}</td>;
  const flag = (on: boolean, tone: CSSProperties): CSSProperties => (on ? { ...CELL, ...tone } : CELL);

  return (
    <div style={{ width, height, overflow: 'auto' }}>
      <table>
        <thead>
          <tr>
            <th style={{ ...CELL, ...PIN_HEAD }}>{dim === 'region' ? 'Vùng' : 'Ngành hàng'}</th>
            {METRIC_HEADS.map((h) => <th key={h} style={CELL}>{h}</th>)}
            {dim === 'category' && <th style={CELL}>Tỷ trọng DT</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <td style={{ ...CELL, ...PIN }}><span className="cn"><span className="nm">{r.key}</span></span></td>
              {money(r.a.sales)}
              {money(r.a.profit)}
              <td style={flag(r.a.margin < THRESHOLD.loss, BAD)}>{A.fmtPct(r.a.margin)}</td>
              <td style={CELL}>{A.fmtOrders(r.a.orders)}</td>
              <td style={CELL}>{A.fmtMoney1(r.a.aov)}</td>
              <td style={CELL}>{A.fmtInt(r.a.quantity)}</td>
              <td style={flag(r.a.returnRate > THRESHOLD.returns, WARN)}>{A.fmtPct(r.a.returnRate)}</td>
              <td style={flag(r.a.costPerOrder > THRESHOLD.cost, WARN)}>{A.fmtMoney2(r.a.costPerOrder)}</td>
              <td style={CELL}>{A.fmtRating(r.a.rating)}</td>
              {dim === 'category' && <td style={CELL}>{A.fmtPct(r.share)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

