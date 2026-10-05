import type { Aggregate, Filters, Grain, PageId, ParamKey, Preset, Row, Sel } from '@/lib/types';
import { THRESHOLD } from '@/lib/tokens';

/* ═══════════════════════════════════════════════════════════════════════════
   lib/aggregate.ts — toàn bộ toán tổng hợp của dashboard.
   Luật số một: mọi tỷ lệ tính SUM(tử) / SUM(mẫu), KHÔNG lấy trung bình tỷ lệ
   từng ngày (specification.md §8). `orders` là đơn PHÂN BỔ nên SUM được ở mọi mức gộp (G4).
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Schema — đúng thứ tự cột A..O của Sheet (specification.md §7) ───────── */
export const COLUMNS = [
  'date', 'region', 'category', 'traffic_source', 'order_status', 'sales', 'net_profit', 'quantity',
  'marketing_cost', 'shipping_cost', 'order_lines', 'orders', 'returned_lines', 'rating_sum', 'rating_count',
] as const;

export const SCHEMA: { col: (typeof COLUMNS)[number]; field: keyof Row; type: string; role: string }[] = [
  { col: 'date',           field: 'date',        type: 'date',   role: 'DATE' },
  { col: 'region',         field: 'region',      type: 'text',   role: 'PRIMARY_DIM' },
  { col: 'category',       field: 'category',    type: 'text',   role: 'SECONDARY_DIM' },
  { col: 'traffic_source', field: 'source',      type: 'text',   role: 'SECONDARY_DIM' },
  { col: 'order_status',   field: 'status',      type: 'text',   role: 'SECONDARY_DIM' },
  { col: 'sales',          field: 'sales',       type: 'number', role: 'METRIC' },
  { col: 'net_profit',     field: 'profit',      type: 'number', role: 'METRIC' },
  { col: 'quantity',       field: 'quantity',    type: 'number', role: 'METRIC' },
  { col: 'marketing_cost', field: 'mkt',         type: 'number', role: 'METRIC' },
  { col: 'shipping_cost',  field: 'ship',        type: 'number', role: 'METRIC' },
  { col: 'order_lines',    field: 'lines',       type: 'number', role: 'METRIC' },
  { col: 'orders',         field: 'orders',      type: 'number', role: 'METRIC · phân bổ' },
  { col: 'returned_lines', field: 'returned',    type: 'number', role: 'METRIC' },
  { col: 'rating_sum',     field: 'ratingSum',   type: 'number', role: 'METRIC' },
  { col: 'rating_count',   field: 'ratingCount', type: 'number', role: 'METRIC' },
];

/* ── Bốn lựa chọn chỉ số (specification.md §6) ──────────────────────────── */
export const PARAMS: { key: ParamKey; label: string }[] = [
  { key: 'sales',  label: 'Doanh thu' },
  { key: 'orders', label: 'Số đơn' },
  { key: 'aov',    label: 'AOV' },
  { key: 'margin', label: 'Biên LN' },
];
const PARAM_LABEL: Record<ParamKey, string> = { sales: 'Doanh thu', orders: 'Số đơn', aov: 'AOV', margin: 'Biên lợi nhuận' };
export const paramLabel = (p: ParamKey): string => PARAM_LABEL[p];

/** Donut chỉ vẽ chỉ số cộng được; AOV và Biên là tỷ lệ nên vẽ Doanh thu (G12). */
export const donutParam = (p: ParamKey): 'sales' | 'orders' => (p === 'orders' ? 'orders' : 'sales');

/* ── Tổng hợp ────────────────────────────────────────────────────────────── */
const SUMMED = ['sales', 'profit', 'quantity', 'mkt', 'ship', 'lines', 'orders', 'returned', 'ratingSum', 'ratingCount'] as const;
const div = (a: number, b: number): number => (b ? a / b : NaN);

export function agg(rows: Row[]): Aggregate {
  const a = { sales: 0, profit: 0, quantity: 0, mkt: 0, ship: 0, lines: 0, orders: 0, returned: 0, ratingSum: 0, ratingCount: 0 };
  for (const r of rows) for (const k of SUMMED) a[k] += r[k];
  return {
    ...a,
    aov:            div(a.sales, a.orders),
    margin:         div(a.profit, a.sales),
    returnRate:     div(a.returned, a.lines),
    costPerOrder:   div(a.mkt + a.ship, a.orders),
    profitPerOrder: div(a.profit, a.orders),
    rating:         div(a.ratingSum, a.ratingCount),
  };
}

export type Dim = 'region' | 'category' | 'source';
export type GroupAgg = Aggregate & { key: string };

export function group(rows: Row[], key: Dim): GroupAgg[] {
  const m = new Map<string, Row[]>();
  for (const r of rows) {
    const list = m.get(r[key]);
    if (list) list.push(r); else m.set(r[key], [r]);
  }
  return [...m.entries()].map(([k, rs]) => ({ key: k, ...agg(rs) }));
}

const orderVal = (v: number): number => (Number.isFinite(v) ? v : -Infinity);
export function rankBy<T extends Aggregate>(list: T[], p: ParamKey): T[] {
  return [...list].sort((a, b) => {
    const x = orderVal(b[p]), y = orderVal(a[p]);
    return x === y ? 0 : x > y ? 1 : -1;
  });
}

export function distinct(rows: Row[], key: Dim): string[] {
  return [...new Set(rows.map((r) => r[key]))].sort((a, b) => a.localeCompare(b, 'vi'));
}

/* ── Lọc ─────────────────────────────────────────────────────────────────── */
export const inSel = (sel: Sel, v: string): boolean => sel === 'all' || sel.includes(v);

export const dimMatch = (r: Row, f: Filters): boolean =>
  inSel(f.regions, r.region) && inSel(f.categories, r.category) && inSel(f.sources, r.source);

export const applyFilters = (rows: Row[], f: Filters): Row[] =>
  rows.filter((r) => r.t >= f.from && r.t <= f.to && dimMatch(r, f));

export const dateRows = (rows: Row[], f: Filters): Row[] =>
  rows.filter((r) => r.t >= f.from && r.t <= f.to);

/** Kỳ trước = cùng số NGÀY LỊCH, liền ngay trước kỳ đang chọn (G13). null nếu dữ liệu không đủ dài. */
export function prevRows(rows: Row[], f: Filters): Row[] | null {
  const len = f.to - f.from + 1;
  const start = f.from - len;
  if (start < 0) return null;
  return rows.filter((r) => r.t >= start && r.t < f.from && dimMatch(r, f));
}

export const PRESETS: { key: Exclude<Preset, 'custom'>; label: string }[] = [
  { key: 30, label: '30 ngày' },
  { key: 90, label: '90 ngày' },
  { key: 365, label: '12 tháng' },
  { key: 'all', label: 'Toàn bộ' },
];

/** `maxT` = chỉ số ngày lịch cuối cùng; t là ngày lịch nên "90 ngày" đúng 90 ngày lịch (G13). */
export function presetRange(p: Exclude<Preset, 'custom'>, maxT: number): { from: number; to: number } {
  const to = Math.max(0, maxT);
  return p === 'all' ? { from: 0, to } : { from: Math.max(0, to - p + 1), to };
}

/** Mặc định: Biên lợi nhuận, 90 ngày lịch CUỐI CÙNG TRONG DỮ LIỆU — không tính từ hôm nay (G10, G13). */
export function defaultFilters(maxT: number): Filters {
  return {
    param: 'margin', preset: 90, ...presetRange(90, maxT),
    regions: 'all', categories: 'all', sources: 'all',
  };
}

/** Sau khi đồng bộ lại, giữ bộ lọc nhưng kéo khoảng ngày về trong dữ liệu mới. */
export function clampFilters(f: Filters, maxT: number): Filters {
  if (f.preset !== 'custom') return { ...f, ...presetRange(f.preset, maxT) };
  const to = Math.min(f.to, Math.max(0, maxT));
  return { ...f, from: Math.min(f.from, to), to };
}

export function toggleSel(sel: Sel, all: string[], v: string): Sel {
  const cur = sel === 'all' ? all : sel;
  const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
  return next.length === all.length ? 'all' : next;
}

/* ── Kỳ thời gian ────────────────────────────────────────────────────────── */
export const GRAINS: { key: Grain; label: string }[] = [
  { key: 'day', label: 'Ngày' }, { key: 'week', label: 'Tuần' }, { key: 'month', label: 'Tháng' },
];
export const GRAIN_WORD: Record<Grain, string> = { day: 'ngày', week: 'tuần', month: 'tháng' };

/** Hạt tự động của line trang 2, 3 (G14). */
export const autoGrain = (days: number): Grain => (days <= 31 ? 'day' : days <= 120 ? 'week' : 'month');

function periodKey(iso: string, g: Grain): string {
  if (g === 'day') return iso;
  if (g === 'month') return iso.slice(0, 7);
  // Tính bằng UTC để không lệch ngày theo múi giờ của máy xem
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - ((dt.getUTCDay() + 6) % 7));   // về thứ hai đầu tuần ISO
  return dt.toISOString().slice(0, 10);
}

const periodLabel = (key: string, g: Grain): string =>
  g === 'month' ? `${key.slice(5, 7)}/${key.slice(0, 4)}` : ddmm(key);

/** Gom theo kỳ trên TRỤC NGÀY LỊCH [from..to]: kỳ không có dòng nào vẫn có mặt (giá trị 0 / '—'), không bị nhảy cóc. */
function byGrain(rows: Row[], g: Grain, dates: string[], from: number, to: number): { label: string; rows: Row[] }[] {
  const keys: string[] = [];
  for (let t = from; t <= to; t++) {
    const k = periodKey(dates[t], g);
    if (keys[keys.length - 1] !== k) keys.push(k);
  }
  const m = new Map<string, Row[]>(keys.map((k) => [k, []]));
  for (const r of rows) m.get(periodKey(r.date, g))?.push(r);
  return keys.map((k) => ({ label: periodLabel(k, g), rows: m.get(k) ?? [] }));
}

const finiteOrNull = (v: number): number | null => (Number.isFinite(v) ? v : null);

export type TrendPoint = { label: string; value: number | null };
export const trend = (rows: Row[], g: Grain, p: ParamKey, dates: string[], f: Filters): TrendPoint[] =>
  byGrain(rows, g, dates, f.from, f.to).map((b) => ({ label: b.label, value: finiteOrNull(agg(b.rows)[p]) }));

/* ── Xếp hạng, tỷ trọng, nhiều đường ─────────────────────────────────────── */
export type RankItem = { name: string; value: number; margin: number | null };

export const ranking = (rows: Row[], dim: Dim, p: ParamKey, limit = Infinity): RankItem[] =>
  rankBy(group(rows, dim), p)
    .filter((g) => Number.isFinite(g[p]))
    .slice(0, limit)
    .map((g) => ({ name: g.key, value: g[p], margin: finiteOrNull(g.margin) }));

export type Slice = { name: string; value: number; margin: number | null; other: boolean };

/** Mỗi dimension chỉ 4 nhóm ⇒ vẽ đủ, không có "Khác" (G14). Giữ nhánh "Khác" cho dữ liệu mới có > 6 nhóm. */
export function slices(rows: Row[], dim: Dim, p: 'sales' | 'orders'): Slice[] {
  const list = rankBy(group(rows, dim), p).filter((g) => g[p] > 0);
  const toSlice = (g: GroupAgg): Slice => ({ name: g.key, value: g[p], margin: finiteOrNull(g.margin), other: false });
  if (list.length <= 6) return list.map(toSlice);
  const rest = list.slice(5);
  return [
    ...list.slice(0, 5).map(toSlice),
    { name: `Khác (${rest.length})`, value: rest.reduce((s, g) => s + g[p], 0), margin: null, other: true },
  ];
}

export type LineData = {
  series: { key: string; name: string; margin: number | null }[];
  data: Record<string, string | number | null>[];
};

export function multiLine(rows: Row[], dim: Dim, p: ParamKey, g: Grain, dates: string[], f: Filters): LineData {
  const top = ranking(rows, dim, p, 5);
  const series = top.map((s, i) => ({ key: `s${i}`, name: s.name, margin: s.margin }));
  const data = byGrain(rows, g, dates, f.from, f.to).map((b) => {
    const o: Record<string, string | number | null> = { label: b.label };
    for (const s of series) o[s.key] = finiteOrNull(agg(b.rows.filter((r) => r[dim] === s.name))[p]);
    return o;
  });
  return { series, data };
}

/* ── Ma trận vùng × 8 tháng gần nhất của kỳ đang chọn (G14) ──────────────── */
export type Matrix = {
  cols: { label: string; title: string }[];
  rows: { key: string; cells: number[] }[];
};

export function monthMatrix(rows: Row[], f: Filters, dates: string[], p: ParamKey): Matrix {
  const months: string[] = [];
  for (let t = f.to; t >= 0 && months.length < 8; t--) {
    const m = dates[t].slice(0, 7);
    if (months[0] !== m) months.unshift(m);
  }
  const keep = new Set(months);
  const scoped = rows.filter((r) => dimMatch(r, f) && r.t <= f.to && keep.has(r.date.slice(0, 7)));
  const cols = months.map((m) => ({ label: `${m.slice(5, 7)}/${m.slice(2, 4)}`, title: `tháng ${m.slice(5, 7)}/${m.slice(0, 4)}` }));
  const out = rankBy(group(scoped, 'region'), p).map((g) => ({
    key: g.key,
    cells: months.map((m) => agg(scoped.filter((r) => r.region === g.key && r.date.startsWith(m)))[p]),
  }));
  return { cols, rows: out };
}

/* ── Bảng chỉ số đầy đủ ──────────────────────────────────────────────────── */
export type MetricRow = { key: string; a: Aggregate; share: number };

/** Sắp theo chỉ số đang chọn giảm dần (G31); `share` = tỷ trọng doanh thu trong tập đang lọc. */
export function metricRows(rows: Row[], dim: Dim, p: ParamKey): MetricRow[] {
  const total = agg(rows).sales;
  return rankBy(group(rows, dim), p).map((g) => ({ key: g.key, a: g, share: div(g.sales, total) }));
}

/* ── Cảnh báo (components.md §8) ─────────────────────────────────────────── */
export type Alert = {
  id: string; level: 'bad' | 'warn'; text: string; value: string;
  page: PageId; region?: string; category?: string; source?: string;
};

/** Nhóm dưới số đơn này không sinh cảnh báo hoàn trả — 1 đơn hoàn / 10 đơn đã là 10% (G30). */
export const MIN_ORDERS_FOR_RETURN_ALERT = 20;

export function alerts(rowsInRange: Row[]): Alert[] {
  const out: Alert[] = [];
  const dims: { dim: 'region' | 'category'; page: PageId; word: string }[] = [
    { dim: 'region', page: 'region', word: 'Vùng' },
    { dim: 'category', page: 'category', word: 'Ngành hàng' },
  ];
  for (const { dim, page, word } of dims) {
    for (const g of group(rowsInRange, dim)) {
      const target = dim === 'region' ? { region: g.key } : { category: g.key };
      if (Number.isFinite(g.margin) && g.margin < THRESHOLD.loss)
        out.push({ id: `loss-${dim}-${g.key}`, level: 'bad', text: `${word} ${g.key} đang lỗ`, value: fmtPct(g.margin), page, ...target });
      if (Number.isFinite(g.returnRate) && g.returnRate > THRESHOLD.returns && g.orders >= MIN_ORDERS_FOR_RETURN_ALERT)
        out.push({ id: `ret-${dim}-${g.key}`, level: 'warn', text: `Hoàn trả ${g.key} vượt ngưỡng`, value: fmtPct(g.returnRate), page, ...target });
    }
  }
  for (const g of group(rowsInRange, 'source')) {
    if (Number.isFinite(g.costPerOrder) && g.costPerOrder > THRESHOLD.cost)
      out.push({ id: `cost-${g.key}`, level: 'warn', text: `Chi phí / đơn ${g.key} vượt ngưỡng`, value: fmtMoney2(g.costPerOrder), page: 'home', source: g.key });
  }
  return out.sort((a, b) => (a.level === b.level ? 0 : a.level === 'bad' ? -1 : 1));
}

/* ── Năm thẻ KPI (specification.md §5) ───────────────────────────────────── */
export const KPI_LABELS = ['Doanh thu', 'Số đơn', 'AOV', 'Biên lợi nhuận', 'Tỷ lệ hoàn trả'] as const;
export type Tone = 'ok' | 'warn' | 'bad' | null;
export type KpiModel = {
  value: string; full: string; delta: number | null; inverse: boolean;
  spark: number[]; baseline: number; tone: Tone; note: string;
};

const mean = (v: number[]): number => (v.length ? v.reduce((s, x) => s + x, 0) / v.length : NaN);

/** Giá trị theo từng ngày có dữ liệu — tỷ lệ vẫn SUM/SUM trong ngày; ngày không có mẫu số thì bỏ. */
function daily(rows: Row[], pick: (a: Aggregate) => number): number[] {
  const m = new Map<number, Row[]>();
  for (const r of rows) {
    const list = m.get(r.t);
    if (list) list.push(r); else m.set(r.t, [r]);
  }
  return [...m.keys()].sort((a, b) => a - b)
    .map((t) => pick(agg(m.get(t) ?? [])))
    .filter((v) => Number.isFinite(v));
}

/** Sparkline theo TUẦN: theo ngày, ngày có 1–2 đơn làm đường nhảy loạn (biên −3.430% ở ngày toàn đơn hoàn). */
function weekly(rows: Row[], pick: (a: Aggregate) => number): number[] {
  const m = new Map<string, Row[]>();
  for (const r of rows) {
    const k = periodKey(r.date, 'week');
    const list = m.get(k);
    if (list) list.push(r); else m.set(k, [r]);
  }
  return [...m.keys()].sort().map((k) => pick(agg(m.get(k) ?? []))).filter((v) => Number.isFinite(v));
}

function change(now: number, prev: number | null): number | null {
  if (prev == null || !Number.isFinite(now) || !Number.isFinite(prev) || prev === 0) return null;
  return (now - prev) / prev;
}

export function kpiModels(cur: Row[], prev: Row[] | null, days: number): KpiModel[] {
  const a = agg(cur);
  const b = prev ? agg(prev) : null;
  const series = days > 31 ? weekly : daily;
  const defs: { id: string; pick: (x: Aggregate) => number; inverse: boolean; fmt: (v: number) => string; full: (v: number) => string }[] = [
    { id: 'sales',  pick: (x) => x.sales,      inverse: false, fmt: fmtMoneyShort, full: fmtMoney },
    { id: 'orders', pick: (x) => x.orders,     inverse: false, fmt: fmtOrders,     full: fmtOrders },
    { id: 'aov',    pick: (x) => x.aov,        inverse: false, fmt: fmtMoney1,     full: fmtMoney1 },
    { id: 'margin', pick: (x) => x.margin,     inverse: false, fmt: fmtPct,        full: (v) => fmtPct(v, 2) },
    { id: 'return', pick: (x) => x.returnRate, inverse: true,  fmt: fmtPct,        full: (v) => fmtPct(v, 2) },
  ];

  return defs.map((d) => {
    const v = d.pick(a);
    const spark = series(cur, d.pick);
    let baseline = mean(spark);
    let tone: Tone = null;
    let note = `TB ${days > 31 ? 'tuần' : 'ngày'} ${d.id === 'sales' ? fmtMoneyShort(baseline) : d.fmt(baseline)}`;

    if (d.id === 'margin') {
      const target = THRESHOLD.target;
      baseline = target;
      tone = !Number.isFinite(v) ? null : v < THRESHOLD.loss ? 'bad' : v < target ? 'warn' : 'ok';
      note = !Number.isFinite(v) ? `mục tiêu ${fmtPct(target, 0)}`
        : v < target ? `mục tiêu ${fmtPct(target, 0)} · đang thiếu ${fmtPts(target - v)}`
        : `mục tiêu ${fmtPct(target, 0)} · đang vượt ${fmtPts(v - target)}`;
    }
    if (d.id === 'return') {
      const th = THRESHOLD.returns;
      baseline = th;
      tone = Number.isFinite(v) ? (v > th ? 'bad' : 'ok') : null;
      note = !Number.isFinite(v) ? `ngưỡng ${fmtPct(th)}`
        : v > th ? `ngưỡng ${fmtPct(th)} · đang vượt ${fmtPts(v - th)}`
        : `ngưỡng ${fmtPct(th)} · còn cách ${fmtPts(th - v)}`;
    }

    return {
      value: d.fmt(v), full: d.full(v),
      delta: change(v, b ? d.pick(b) : null),
      inverse: d.inverse, spark,
      baseline: Number.isFinite(baseline) ? baseline : 0,
      tone, note,
    };
  });
}

/* ── Định dạng số — tiếng Việt: chấm hàng nghìn, phẩy thập phân; tiền USD đứng trước (G19) ── */
const nf = (d: number) => new Intl.NumberFormat('vi-VN', { minimumFractionDigits: d, maximumFractionDigits: d });
const NF0 = nf(0), NF1 = nf(1), NF2 = nf(2);
const sign = (v: number, s: string): string => (v < 0 ? `−${s}` : s);

export const fmtInt = (v: number): string => (Number.isFinite(v) ? NF0.format(v) : '—');
export const fmtMoney = (v: number): string => (Number.isFinite(v) ? sign(v, `$${NF0.format(Math.abs(v))}`) : '—');
export const fmtMoney1 = (v: number): string => (Number.isFinite(v) ? sign(v, `$${NF1.format(Math.abs(v))}`) : '—');
export const fmtMoney2 = (v: number): string => (Number.isFinite(v) ? sign(v, `$${NF2.format(Math.abs(v))}`) : '—');
export function fmtMoneyShort(v: number): string {
  if (!Number.isFinite(v)) return '—';
  const a = Math.abs(v);
  if (a >= 1e6) return sign(v, `$${NF2.format(a / 1e6)}tr`);
  if (a >= 1e4) return sign(v, `$${NF1.format(a / 1e3)}k`);
  return fmtMoney(v);
}
export const fmtOrders = (v: number): string => (Number.isFinite(v) ? NF1.format(v) : '—');
export const fmtPct = (v: number, d = 1): string =>
  Number.isFinite(v) ? `${(d === 0 ? NF0 : d === 2 ? NF2 : NF1).format(v * 100)}%` : '—';
/** Chênh giữa hai tỷ lệ: "điểm phần trăm", không phải %. */
export const fmtPts = (v: number): string => (Number.isFinite(v) ? `${NF1.format(v * 100)} điểm` : '—');
export const fmtRating = (v: number): string => (Number.isFinite(v) ? NF2.format(v) : '—');

export const fmtParam = (v: number, p: ParamKey): string =>
  p === 'margin' ? fmtPct(v) : p === 'orders' ? fmtOrders(v) : p === 'aov' ? fmtMoney1(v) : fmtMoneyShort(v);
export const fmtAxis = (v: number, p: ParamKey): string =>
  p === 'margin' ? `${NF0.format(v * 100)}%` : p === 'orders' ? NF0.format(v) : fmtMoneyShort(v);

export const ddmm = (iso?: string): string => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '—');
export const ddmmyyyy = (iso?: string): string => (iso ? `${ddmm(iso)}/${iso.slice(0, 4)}` : '—');

/* ── Giờ Việt Nam (UTC+7) — không theo giờ máy ───────────────────────────── */
const TZ = 'Asia/Ho_Chi_Minh';
const hourVN = (d: Date): number =>
  Number(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hourCycle: 'h23' }).format(d));

/** Sáng 05–12 · chiều 12–18 · tối 18–05 (G34). */
export function greetVN(d: Date): string {
  const h = hourVN(d);
  return h >= 5 && h < 12 ? 'Chào buổi sáng' : h >= 12 && h < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
}
export function todayVN(d: Date): string {
  const s = new Intl.DateTimeFormat('vi-VN', {
    timeZone: TZ, weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}
export const clockVN = (d: Date): string =>
  new Intl.DateTimeFormat('vi-VN', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d);
