-- =========================================================
-- سیستم آموزشی جامع دانشگاه — اسکیمای پایگاه‌داده (SQLite)
-- =========================================================

PRAGMA foreign_keys = ON;

-- کاربران (پایه مشترک برای دانشجو، استاد، ادمین)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,        -- شماره دانشجویی یا کد پرسنلی
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'professor', 'admin')),
  created_at TEXT DEFAULT (datetime('now'))
);

-- اطلاعات تکمیلی دانشجو
CREATE TABLE IF NOT EXISTS students (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  entry_year INTEGER,
  major TEXT DEFAULT 'مهندسی کامپیوتر'
);

-- اطلاعات تکمیلی استاد
CREATE TABLE IF NOT EXISTS professors (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  employee_number TEXT UNIQUE,
  rank TEXT DEFAULT 'استادیار'
);

-- ترم‌های تحصیلی
CREATE TABLE IF NOT EXISTS semesters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  is_current INTEGER NOT NULL DEFAULT 0 CHECK (is_current IN (0,1)),
  registration_open INTEGER NOT NULL DEFAULT 1 CHECK (registration_open IN (0,1)),
  tuition_amount INTEGER NOT NULL DEFAULT 0   -- شهریه ثابت این ترم به تومان
);

-- پرداخت‌های شهریه دانشجویان
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  semester_id INTEGER NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  method TEXT NOT NULL DEFAULT 'آنلاین (شبیه‌سازی‌شده)',
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'pending')),
  reference_code TEXT UNIQUE,
  paid_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id);

-- دروس ارائه‌شده در یک ترم مشخص
CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  credits INTEGER NOT NULL DEFAULT 3,
  capacity INTEGER NOT NULL DEFAULT 30,
  professor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  semester_id INTEGER NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
  day_of_week TEXT,        -- شنبه/یک‌شنبه/دوشنبه/سه‌شنبه/چهارشنبه/پنج‌شنبه
  start_time TEXT,         -- "08:00"
  end_time TEXT,           -- "10:00"
  room TEXT,
  grades_finalized INTEGER NOT NULL DEFAULT 0 CHECK (grades_finalized IN (0,1)),
  UNIQUE(code, semester_id)
);

-- پیش‌نیازهای هر درس (self-referencing many-to-many)
CREATE TABLE IF NOT EXISTS prerequisites (
  course_code TEXT NOT NULL,      -- کد درسی که پیش‌نیاز می‌خواهد
  prereq_code TEXT NOT NULL,      -- کد درس پیش‌نیاز
  PRIMARY KEY (course_code, prereq_code)
);

-- ثبت‌نام دانشجو در درس
CREATE TABLE IF NOT EXISTS enrollments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'dropped')),
  registered_at TEXT DEFAULT (datetime('now')),
  UNIQUE(student_id, course_id)
);

-- نمرات (قطعی‌بودن نمره از طریق courses.grades_finalized مشخص می‌شود)
CREATE TABLE IF NOT EXISTS grades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  enrollment_id INTEGER UNIQUE NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  score REAL CHECK (score >= 0 AND score <= 20),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ایندکس‌های کمکی برای کوئری‌های پرتکرار
CREATE INDEX IF NOT EXISTS idx_courses_semester ON courses(semester_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);
