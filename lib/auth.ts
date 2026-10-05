import GoogleProvider from 'next-auth/providers/google';
import type { NextAuthOptions } from 'next-auth';

/* Cấu hình NextAuth v4 duy nhất — route handler (app/api/auth/[...nextauth]/route.ts),
   proxy.ts và getServerSession (app/api/data/route.ts, app/page.tsx) đều import từ đây. */

export const ALLOWED_EMAILS = new Set(
  (process.env.ALLOWED_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/',
    error: '/',
  },
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID ?? '',
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? '',
      // Luôn hiện màn chọn tài khoản — người bị từ chối có thể đổi tài khoản ngay,
      // không bị Google tự đăng nhập lại đúng email vừa bị từ chối.
      authorization: { params: { prompt: 'select_account' } },
    }),
  ],
  callbacks: {
    /**
     * Chặn ở đúng MỘT chỗ: email không nằm trong ALLOWED_EMAILS bị từ chối trước khi
     * NextAuth tạo session. Trả về chuỗi URL thay vì `false` để mang theo email bị từ chối
     * sang trang login — yêu cầu "hiển thị thông báo ... vui lòng liên hệ Admin" cần biết
     * đang từ chối AI, không chỉ báo lỗi chung chung.
     */
    async signIn({ user }) {
      const email = user.email?.toLowerCase();
      if (!email || !ALLOWED_EMAILS.has(email)) {
        return `/?error=access-denied&email=${encodeURIComponent(user.email ?? '')}`;
      }
      return true;
    },
  },
};
