/* Chế độ dữ liệu mẫu — CHỈ cho `dashboards/scripts/check_app.py` chụp và đo dashboard mà không cần đăng nhập Google
   (Playwright không đăng nhập Google tự động được).

   Bật khi đủ cả ba: QA_FIXTURE=1 · có QA_FIXTURE_FILE · KHÔNG chạy trên Vercel.
   Vercel luôn đặt VERCEL=1 cho cả build lẫn runtime ⇒ bản production không bật được chế độ này, kể cả khi ai đó lỡ
   khai QA_FIXTURE trên Vercel. check_app.py chạy một server thứ hai với VERCEL=1 để chứng minh điều đó (bước
   `fixture_guard`), và smoke_test.py kiểm /api/data trả 401 trên URL production.

   File này không import gì: proxy.ts cũng dùng nó. */
export const qaFixtureOn = (): boolean =>
  process.env.QA_FIXTURE === '1' && process.env.VERCEL !== '1' && Boolean(process.env.QA_FIXTURE_FILE);
