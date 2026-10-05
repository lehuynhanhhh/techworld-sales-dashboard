import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { fetchSheetValues, SHEET_TAB } from '@/lib/google-sheets';
import { COLUMNS } from '@/lib/aggregate';
import { qaFixtureOn } from '@/lib/qa-mode';
import { readFixtureValues } from '@/lib/qa-fixture';
import type { DataPayload, QualityCheck, Row } from '@/lib/types';

/* Route Handler của Next 16 không cache mặc định ⇒ nút "Đồng bộ" đọc lại Sheet thật.
   Nơi DUY NHẤT chạm credential, cùng lib/google-sheets.ts. */

const NUMERIC = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14];   // sales … rating_count
const MAY_BE_NEGATIVE = new Set([6, 7]);                // net_profit, quantity (specification.md §7, G16)
const DAY = 86_400_000;
const isDate = (s: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const isNum = (s: string): boolean => s !== '' && Number.isFinite(Number(s));
const utc = (iso: string): number => Date.parse(`${iso}T00:00:00Z`);

function fail(error: string, fetchedAt: string, status: number) {
  const body: DataPayload = { error, rows: [], count: 0, dates: [], activeDays: 0, header: [], quality: [], fetchedAt, tab: SHEET_TAB };
  return NextResponse.json(body, { status });
}

/* Sáu kiểm tra ở trang Nguồn dữ liệu (components.md §4) — chạy trên giá trị THÔ,
   trước khi Number() || 0 che mất ô trống và ô sai kiểu. */
function qualityChecks(body: string[][]): QualityCheck[] {
  let empty = 0, badDate = 0, badNum = 0, dup = 0, negQty = 0, convention = 0;
  const seen = new Set<string>();
  for (const r of body) {
    const cell = (i: number) => (r[i] ?? '').trim();
    const num = (i: number) => Number(cell(i));
    if (COLUMNS.some((_, i) => cell(i) === '')) empty++;
    if (!isDate(cell(0))) badDate++;
    if (NUMERIC.some((i) => cell(i) !== '' && (!isNum(cell(i)) || (!MAY_BE_NEGATIVE.has(i) && num(i) < 0)))) badNum++;
    const key = [0, 1, 2, 3, 4].map(cell).join('|');
    if (seen.has(key)) dup++; else seen.add(key);
    if (num(7) < 0) negQty++;
    if ((cell(4) === 'Returned' && num(5) > 0) || num(12) > num(10) || num(11) > num(10) + 1e-9) convention++;
  }
  return [
    { id: 'empty',  label: 'Ô trống',             count: empty },
    { id: 'date',   label: 'Ngày không đọc được', count: badDate },
    { id: 'number', label: 'Số không hợp lệ',     count: badNum },
    { id: 'dup',    label: 'Trùng dòng',          count: dup },
    { id: 'negqty', label: 'Số lượng âm',         count: negQty, expected: 2, note: 'đã biết — specification.md G16' },
    { id: 'return', label: 'Quy ước hoàn trả',    count: convention },
  ];
}

export async function GET() {
  const fetchedAt = new Date().toISOString();

  const qa = qaFixtureOn();   // chế độ dữ liệu mẫu của check_app.py — không bao giờ bật trên Vercel (lib/qa-mode.ts)
  if (!qa) {
    /* proxy.ts chỉ chắn trang /dashboard — route này tự kiểm session để trả JSON 401,
       vì client gọi bằng fetch() và không xử lý được redirect HTML. */
    const session = await getServerSession(authOptions);
    if (!session) return fail('Chưa đăng nhập.', fetchedAt, 401);
  }

  try {
    const values = qa ? await readFixtureValues() : await fetchSheetValues();
    const header = (values[0] ?? []).map((h) => h.trim());
    const wrong = COLUMNS.filter((c, i) => header[i] !== c);
    if (wrong.length) {
      return fail(`Tiêu đề cột không khớp specification.md §7 — sai hoặc thiếu: ${wrong.join(', ')}`, fetchedAt, 500);
    }

    const body = values.slice(1).filter((r) => r.some((c) => c.trim() !== ''));   // bỏ dòng trống cuối
    if (body.length === 0) return fail('Sheet chỉ có dòng tiêu đề, chưa có dữ liệu.', fetchedAt, 500);

    const quality = qualityChecks(body);
    const valid = body.filter((r) => isDate((r[0] ?? '').trim()));
    const days = valid.map((r) => r[0].trim());
    const first = days.reduce((a, b) => (b < a ? b : a));
    const last = days.reduce((a, b) => (b > a ? b : a));

    /* Trục NGÀY LỊCH (specification.md §7, G13): ngày không có đơn vẫn nằm trên trục, = 0 cho mọi chỉ số cộng được.
       Đếm "90 ngày" theo số ngày có dữ liệu sẽ kéo kỳ dài quá 90 ngày lịch mà không ai thấy. */
    const t0 = utc(first);
    const n = Math.round((utc(last) - t0) / DAY) + 1;
    const dates = Array.from({ length: n }, (_, i) => new Date(t0 + i * DAY).toISOString().slice(0, 10));
    const num = (r: string[], i: number) => Number(r[i]) || 0;

    const rows: Row[] = valid.map((r) => ({
      date:        r[0].trim(),
      t:           Math.round((utc(r[0].trim()) - t0) / DAY),
      region:      (r[1] ?? '').trim(),
      category:    (r[2] ?? '').trim(),
      source:      (r[3] ?? '').trim(),
      status:      (r[4] ?? '').trim(),
      sales:       num(r, 5),
      profit:      num(r, 6),
      quantity:    num(r, 7),
      mkt:         num(r, 8),
      ship:        num(r, 9),
      lines:       num(r, 10),
      orders:      num(r, 11),
      returned:    num(r, 12),
      ratingSum:   num(r, 13),
      ratingCount: num(r, 14),
    }));

    const payload: DataPayload = {
      rows, count: rows.length, dates, activeDays: new Set(days).size, header, quality, fetchedAt, tab: SHEET_TAB,
    };
    return NextResponse.json(payload);
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Lỗi không xác định', fetchedAt, 500);
  }
}
