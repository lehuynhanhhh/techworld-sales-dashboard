import 'server-only';
import { readFile } from 'node:fs/promises';

/* Đọc file dữ liệu mẫu do check_app.py sinh (CSV, dòng đầu là header, không có dấu phẩy trong ô) thành cùng dạng
   `string[][]` mà fetchSheetValues() trả về ⇒ route /api/data đi qua đúng một đường parse + kiểm chất lượng.
   Chỉ được gọi khi qaFixtureOn() đúng (lib/qa-mode.ts). */
export async function readFixtureValues(): Promise<string[][]> {
  const text = await readFile(process.env.QA_FIXTURE_FILE ?? '', 'utf8');
  return text
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '')
    .map((line) => line.split(','));
}
