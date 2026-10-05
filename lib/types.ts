export type Row = {
  date: string;            // ISO 'yyyy-mm-dd', GIỮ NGUYÊN chuỗi
  t: number;               // chỉ số NGÀY LỊCH 0..n-1 tính từ ngày đầu tiên (specification.md G13) — không phải chỉ số ngày có dữ liệu
  region: string;
  category: string;
  source: string;          // cột traffic_source
  status: string;          // cột order_status — Completed | Returned (không lọc, G11)
  sales: number;
  profit: number;          // cột net_profit — có thể âm (đơn hoàn trả mang chi phí)
  quantity: number;
  mkt: number;             // cột marketing_cost
  ship: number;            // cột shipping_cost
  lines: number;           // cột order_lines
  orders: number;          // đơn PHÂN BỔ — cộng được (specification.md §7, G4)
  returned: number;        // cột returned_lines
  ratingSum: number;
  ratingCount: number;
};

export type PageId = 'home' | 'region' | 'category' | 'source';
export type Grain = 'day' | 'week' | 'month';
export type ParamKey = 'sales' | 'orders' | 'aov' | 'margin';
export type Preset = 30 | 90 | 365 | 'all' | 'custom';

/** 'all' = không lọc; mảng = chỉ những giá trị này (mảng rỗng = không chọn gì ⇒ trạng thái rỗng). */
export type Sel = 'all' | string[];

export type Filters = {
  param: ParamKey;
  preset: Preset;
  from: number;            // chỉ số ngày lịch, KHÔNG phải chuỗi
  to: number;
  regions: Sel;
  categories: Sel;
  sources: Sel;
};

/** Tỷ lệ = NaN khi mẫu số bằng 0 — hiển thị '—' (specification.md §8). */
export type Aggregate = {
  sales: number; profit: number; quantity: number; mkt: number; ship: number;
  lines: number; orders: number; returned: number; ratingSum: number; ratingCount: number;
  aov: number; margin: number; returnRate: number; costPerOrder: number; profitPerOrder: number; rating: number;
};

export type QualityCheck = { id: string; label: string; count: number; expected?: number; note?: string };

export type DataPayload = {
  rows: Row[];
  count: number;
  dates: string[];         // MỌI ngày lịch từ ngày đầu đến ngày cuối; dates[t] là ngày của chỉ số t
  activeDays: number;      // số ngày có ít nhất một dòng
  header: string[];
  quality: QualityCheck[];
  fetchedAt: string;       // ISO, lúc server đọc Sheet
  tab: string;
  error?: string;
};
