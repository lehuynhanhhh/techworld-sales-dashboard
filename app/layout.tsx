import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import { Inter } from 'next/font/google';
import { IconSprite } from '@/components/Icon';
import { Providers } from '@/components/Providers';
import './globals.css';

const inter = Inter({ subsets: ['latin', 'vietnamese'], display: 'swap' });

export const metadata: Metadata = {
  title: 'Sales Performance Dashboard',
  description: 'Theo dõi doanh thu, số đơn, AOV, biên lợi nhuận và hoàn trả của TechWorld theo vùng và ngành hàng.',
};

/* globals.css khai báo --sans bắt đầu bằng 'Inter', nhưng next/font nạp font dưới một
   tên họ đã băm. Gán lại --sans inline trên <html> để mọi var(--sans) dùng đúng Inter
   đã nạp (có subset tiếng Việt) — không sửa globals.css. */
const fontVars = {
  '--sans': `${inter.style.fontFamily}, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`,
} as CSSProperties;

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="vi" data-theme="light" style={fontVars} suppressHydrationWarning>
      <body>
        <IconSprite />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
