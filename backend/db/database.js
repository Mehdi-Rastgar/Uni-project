// این فایل دیتابیس SQLite رو باز می‌کنه (یا اگه وجود نداره می‌سازتش)
// از node:sqlite استفاده می‌کنیم چون توکار node هست و نیازی به نصب/کامپایل جدا نداره
import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'university.db');

const isNewDatabase = !fs.existsSync(DB_PATH);

export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON');

// اجرای فایل schema.sql - چون همه چیز CREATE TABLE IF NOT EXISTS هست، اجرای دوباره‌ش مشکلی ایجاد نمی‌کنه
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

// این دوتا ستون رو بعداً به پروژه اضافه کردم، برای اینکه دیتابیس‌های قدیمی‌تر هم بشکنن نه،
// با try/catch چک می‌کنیم و اگه از قبل وجود داشتن، خطا رو نادیده می‌گیریم
function addColumnIfMissing(sql) {
  try {
    db.exec(sql);
  } catch (err) {
    // یعنی ستون از قبل بوده، مشکلی نیست
  }
}
addColumnIfMissing('ALTER TABLE courses ADD COLUMN grades_finalized INTEGER NOT NULL DEFAULT 0');
addColumnIfMissing('ALTER TABLE semesters ADD COLUMN tuition_amount INTEGER NOT NULL DEFAULT 0');

// node:sqlite یه تابع آماده برای تراکنش نداره (بر خلاف better-sqlite3)
// پس خودمون با BEGIN/COMMIT/ROLLBACK دستی می‌سازیمش
export function runInTransaction(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export { isNewDatabase };
