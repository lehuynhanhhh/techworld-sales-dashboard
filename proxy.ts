import { NextResponse, type NextFetchEvent } from 'next/server';
import { withAuth, type NextRequestWithAuth } from 'next-auth/middleware';
import { qaFixtureOn } from '@/lib/qa-mode';

/* Next.js 16: quy ước file "middleware.ts" đã đổi tên thành "proxy.ts" (proxy.js|ts ở gốc
   project, cùng cấp package.json) — hàm bên trong không đổi, chỉ đổi tên file/export
   (xem node_modules/next/dist/docs/.../file-conventions/proxy.md).
   Chỉ chắn route /dashboard (yêu cầu #1) — /api/data tự kiểm session riêng
   (route.ts) để trả JSON 401 thay vì redirect HTML, vì client gọi bằng fetch(). */
const auth = withAuth({
  pages: { signIn: '/' },
  secret: process.env.AUTH_SECRET,
});

/* Chế độ dữ liệu mẫu của check_app.py bỏ qua đăng nhập — không bao giờ bật trên Vercel (lib/qa-mode.ts). */
export default function proxy(req: NextRequestWithAuth, event: NextFetchEvent) {
  if (qaFixtureOn()) return NextResponse.next();
  return auth(req, event);
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
