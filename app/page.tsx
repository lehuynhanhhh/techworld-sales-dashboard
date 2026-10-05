import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Shell } from '@/components/Shell';
import { Icon } from '@/components/Icon';
import { GoogleSignInButton, RetrySignInLink } from '@/components/GoogleSignInButton';

/* Trang đăng nhập thật (thay "trang giới thiệu" G21 — v1 chưa có đăng nhập).
   Cùng shell #login, cùng token với dashboard (design.md). Đã đăng nhập thì vào thẳng
   /dashboard, không hiện lại thẻ đăng nhập. */

export default async function HomePage({ searchParams }: PageProps<'/'>) {
  const session = await getServerSession(authOptions);
  if (session) redirect('/dashboard');

  const sp = await searchParams;
  const error = typeof sp.error === 'string' ? sp.error : '';
  const deniedEmail = typeof sp.email === 'string' ? sp.email : '';
  const denied = error === 'access-denied';
  const otherError = error !== '' && !denied;

  return (
    <Shell stageId="login">
      <div className="logincard">
        <div className="loginbrand">
          <span className="lmark"><Icon name="layout-dashboard" /></span>
          <b>Sales Performance Dashboard</b>
        </div>
        <h1>Đăng nhập để tiếp tục</h1>
        <p className="lead">
          Theo dõi doanh thu, số đơn, biên lợi nhuận và hoàn trả theo vùng, ngành hàng và nguồn traffic —
          nhóm nào lỗ, hoàn trả vượt ngưỡng, chi phí mỗi đơn quá cao.
        </p>

        <GoogleSignInButton callbackUrl="/dashboard" />

        {denied && (
          <div className="err">
            <b>Bạn không có quyền truy cập</b>
            Tài khoản {deniedEmail ? <code>{deniedEmail}</code> : 'Google vừa chọn'} chưa được Admin
            cấp quyền vào dashboard này. Vui lòng liên hệ Admin để được thêm vào danh sách truy cập.
            <RetrySignInLink callbackUrl="/dashboard" />
          </div>
        )}

        {otherError && (
          <div className="err">
            <b>Đăng nhập không thành công</b>
            Đã có lỗi khi đăng nhập bằng Google, vui lòng thử lại.
            <RetrySignInLink callbackUrl="/dashboard" />
          </div>
        )}

        {!denied && !otherError && (
          <div className="note">
            <i><Icon name="database" className="lu lu-sm" /></i>
            <span>Chỉ tài khoản Google đã được Admin cấp quyền mới xem được dữ liệu dashboard.</span>
          </div>
        )}

        <p className="legal">Dữ liệu chỉ đọc (quyền spreadsheets.readonly).</p>
      </div>
    </Shell>
  );
}
