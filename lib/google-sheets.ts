import 'server-only';
import { google } from 'googleapis';

/* Tab do pipeline dashboard đẩy lên — specification.md §7. Không sửa tay trên Sheet. */
export const SHEET_TAB = 'techworld_sales_daily';
const RANGE = `'${SHEET_TAB}'!A:O`;

export async function fetchSheetValues(): Promise<string[][]> {
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n');
  const email      = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? '';
  const sheetId    = process.env.GOOGLE_SHEETS_SPREADSHEET_ID ?? '';

  if (!privateKey || !email || !sheetId) {
    throw new Error(
      'Thiếu biến môi trường. Cần GOOGLE_SHEETS_SPREADSHEET_ID, ' +
      'GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY trong .env.local'
    );
  }

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  /* FORMATTED_VALUE mặc định: publish_to_sheets.py ghi RAW nên ngày về đúng chuỗi 'yyyy-mm-dd',
     số về dạng chuỗi có dấu chấm thập phân. */
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: RANGE });
  const values = (res.data.values ?? []) as unknown[][];
  return values.map((r) => r.map((c) => (c == null ? '' : String(c))));
}
