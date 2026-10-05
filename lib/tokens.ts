/* ═══════════════════════════════════════════════════════════════════════════
   lib/tokens.ts — CHÉP NGUYÊN VĂN, KHÔNG SỬA
   Trích từ bản chuẩn: docs/syllabus/AIDA/B5&6/prototype/design-systems/_base.html
   Đây là NGUỒN DUY NHẤT cho mọi kích thước chart.
   Không đọc clientWidth, không ResizeObserver, không ResponsiveContainer
   ⇒ mọi máy vẽ ra cùng một pixel.

   Chỉ được sửa MỘT thứ trong file này: hằng số THRESHOLD ở cuối, cho khớp
   mục "Ngưỡng nghiệp vụ" của specification.md.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Canvas cố định ────────────────────────────────────────────────────────
   Toàn bộ dashboard vẽ trên khung 1600×900 rồi thu vừa cửa sổ.
   Nhờ vậy: không bao giờ phải cuộn, và không có breakpoint nào để sai. */
export const CV = { w: 1600, h: 900 } as const;

export const SIDE_BORDER = 1;    // hairline ngăn sidebar với nội dung
export const HDR         = 46;   // chiều cao header
export const BODY_PAD_X  = 24;   // padding ngang của #body
export const BODY_PAD_Y  = 20;   // padding dọc của #body
export const GAP         = 14;   // khe giữa 2 card trong một hàng
export const KPI_GAP     = 12;   // khe giữa 5 thẻ KPI

/* Chiều cao 4 băng ngang. row2 === row3 ⇒ 4 chart cao bằng nhau.
   46 + 20 + 52 + 14 + 118 + 14 + 301 + 14 + 301 + 20 = 900  ✓  */
export const BAND = { greet: 52, kpi: 118, row2: 301, row3: 301 } as const;

export const CARD_PAD = 14;    // padding trong card — xem cảnh báo bên dưới
export const CHEAD    = 43;    // chiều cao khối tiêu đề trong card
export const LGD1     = 24;    // dải chú giải 1 hàng — line nhiều đường
export const LGD2     = 44;    // dải chú giải 2 hàng — donut

export const SIDE_WIDE = 206;  // sidebar mở
export const SIDE_RAIL = 58;   // sidebar thu gọn

/* ⚠ CARD_PAD là hợp đồng giữa JS và CSS.
   layout() tính bề rộng <svg> bằng chính hằng số này. Nếu CSS đặt
   .card{padding:16px} cho "đúng thang spacing", hộp chứa sẽ hẹp hơn svg
   4px mỗi bên và overflow:hidden cắt mép phải CẢ 4 CHART.
   Muốn đổi nhịp đệm thì đổi ở ĐÂY trước, rồi CSS theo sau. */

export type Plot = { w: number; h: number };
export type Layout = {
  mainW: number; innerW: number;
  a: number; b: number; c: number; d: number;
  kpiW: number;
  p2a: Plot; p2b: Plot; p3c: Plot; p3d: Plot;
};

/* ── Mọi kích thước suy ra từ MỘT biến: bề rộng sidebar ──────────────────── */
export function layout(side: number = SIDE_WIDE): Layout {
  const mainW  = CV.w - side - SIDE_BORDER;
  const innerW = mainW - BODY_PAD_X * 2;

  const a = Math.floor((innerW - GAP) * 0.30), b = innerW - GAP - a;  // Row 2 = 30/70
  const c = Math.floor((innerW - GAP) * 0.40), d = innerW - GAP - c;  // Row 3 = 40/60

  const plot = (w: number, bandH: number): Plot => ({
    w: w - CARD_PAD * 2,
    h: bandH - CARD_PAD * 2 - CHEAD,
  });

  return {
    mainW, innerW, a, b, c, d,
    kpiW: Math.floor((innerW - KPI_GAP * 4) / 5),
    p2a: plot(a, BAND.row2), p2b: plot(b, BAND.row2),
    p3c: plot(c, BAND.row3), p3d: plot(d, BAND.row3),
  };
}

/* Số cụ thể để đối chiếu khi kiểm tra:

   sidebar 206 → mainW 1393 · innerW 1345
                 Row 2: 399 / 932    Row 3: 532 / 799
                 kpiW 259 · chiều cao vẽ của cả 4 chart = 230

   sidebar  58 → mainW 1541 · innerW 1493
                 Row 2: 443 / 1036   Row 3: 591 / 888
                 kpiW 289 · chiều cao vẽ = 230

   Card có legend thì TRỪ LGD1 (24) hoặc LGD2 (44) khỏi chiều cao vẽ khi gọi
   hàm chart, nếu không card sẽ tràn.                                        */

/* ── Đọc token CSS ────────────────────────────────────────────────────────
   Chart đọc màu qua đây nên đổi theme là chart tự đổi màu theo, không cần
   truyền prop màu xuống từng component. */
export const CSS = (name: string): string =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/* ── Thang chuỗi dữ liệu ──────────────────────────────────────────────────
   5 bậc mực, chênh nhau về ĐỘ SÁNG chứ không về sắc — điều kiện để phân
   biệt được khi in đen trắng và với người mù màu. */
export const SER = [
  '--series-1', '--series-2', '--series-3', '--series-4', '--series-5',
] as const;

/* ── SỬA Ở ĐÂY cho khớp specification.md ──────────────────────────────────
   Bốn ngưỡng nghiệp vụ. Phải là số cụ thể, không được để "cao"/"thấp". */
export const THRESHOLD = {
  loss:    0,      // ngưỡng lỗ — biên lợi nhuận dưới mức này là đang lỗ (specification.md §9, G5)
  target:  0.33,   // mục tiêu biên lợi nhuận (G6)
  cost:    22,     // chi phí bán hàng / đơn, USD — vượt là cảnh báo (G7)
  returns: 0.03,   // tỷ lệ hoàn trả theo dòng — vượt là cảnh báo (G8)
} as const;

/* ── Quyết định màu cho một chuỗi dữ liệu ─────────────────────────────────
   Đọc từ trên xuống, gặp điều kiện nào đúng thì dừng. Thứ tự này quan
   trọng: ngưỡng đứng trên cùng nghĩa là một vùng đang lỗ phải đỏ KỂ CẢ khi
   nó đứng hạng 1 doanh thu. "Lỗ" = biên lợi nhuận < THRESHOLD.loss (design.md §5). */
export function seriesColor(
  item: { margin?: number | null },
  rank: number,
): string {
  if (item.margin != null && item.margin < THRESHOLD.loss) return CSS('--bad');
  if (rank === 0) return CSS('--focus');
  return CSS(SER[Math.min(4, rank)]);
}

/* ── Tìm giá trị lớn nhất — ĐỪNG viết lại bằng Math.max ───────────────────
   Math.max(1, ...values) ép max = 1 với chỉ số tỷ lệ (0,0121) ⇒ thanh dài
   nhất teo còn 10px và KHÔNG báo lỗi.
   Math.max(...v) || 1 cũng không cứu được: mảng rỗng cho -Infinity, mà
   -Infinity là truthy nên || không chạy. */
export function maxOf(values: number[]): number {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return 1;
  const m = Math.max(...finite);
  return m > 0 ? m : 1;
}
