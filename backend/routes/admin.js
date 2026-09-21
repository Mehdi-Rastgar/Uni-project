import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db, runInTransaction } from '../db/database.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// همه‌ی مسیرهای این فایل مخصوص نقش «ادمین (کارشناس آموزش)» هستند
router.use(requireAuth, requireRole('admin'));

function getCurrentSemester() {
  return db.prepare('SELECT * FROM semesters WHERE is_current = 1').get();
}

// ===================================================================
// یوزکیس ۶: مدیریت دروس
// ===================================================================

router.get('/admin/courses', (req, res) => {
  const semesterId = req.query.semesterId || getCurrentSemester()?.id;
  if (!semesterId) return res.json({ courses: [] });

  const courses = db.prepare(`
    SELECT c.*, u.full_name AS professor_name,
           (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id AND e.status='active') AS enrolled_count
    FROM courses c
    LEFT JOIN users u ON u.id = c.professor_id
    WHERE c.semester_id = ?
    ORDER BY c.code
  `).all(semesterId);

  res.json({ courses });
});

router.post('/admin/courses', (req, res) => {
  const { code, title, credits, capacity, semesterId, professorId, dayOfWeek, startTime, endTime, room } = req.body;

  if (!code || !title || !credits || !capacity || !semesterId) {
    return res.status(400).json({ error: 'کد درس، عنوان، تعداد واحد، ظرفیت و ترم الزامی است.' });
  }

  const duplicate = db.prepare('SELECT id FROM courses WHERE code = ? AND semester_id = ?').get(code, semesterId);
  if (duplicate) {
    return res.status(409).json({ error: 'این کد درس در این ترم قبلاً ثبت شده است.' });
  }

  const info = db.prepare(`
    INSERT INTO courses (code, title, credits, capacity, professor_id, semester_id, day_of_week, start_time, end_time, room)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(code, title, credits, capacity, professorId || null, semesterId, dayOfWeek || null, startTime || null, endTime || null, room || null);

  res.status(201).json({ success: true, courseId: info.lastInsertRowid });
});

router.put('/admin/courses/:id', (req, res) => {
  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id);
  if (!course) return res.status(404).json({ error: 'درس یافت نشد.' });

  const { title, credits, capacity, professorId, dayOfWeek, startTime, endTime, room } = req.body;

  db.prepare(`
    UPDATE courses SET title = ?, credits = ?, capacity = ?, professor_id = ?, day_of_week = ?, start_time = ?, end_time = ?, room = ?
    WHERE id = ?
  `).run(
    title ?? course.title, credits ?? course.credits, capacity ?? course.capacity,
    professorId !== undefined ? professorId : course.professor_id,
    dayOfWeek ?? course.day_of_week, startTime ?? course.start_time, endTime ?? course.end_time, room ?? course.room,
    course.id
  );

  res.json({ success: true });
});

// یوزکیس ۴ (بخشی از FR-17): اعلام قطعی‌بودن نمرات یک درس توسط ادمین
router.put('/admin/courses/:id/finalize-grades', (req, res) => {
  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id);
  if (!course) return res.status(404).json({ error: 'درس یافت نشد.' });

  db.prepare('UPDATE courses SET grades_finalized = 1 WHERE id = ?').run(course.id);
  res.json({ success: true });
});

// ===================================================================
// یوزکیس ۷: مدیریت ترم تحصیلی
// ===================================================================

router.get('/admin/semesters', (req, res) => {
  const semesters = db.prepare('SELECT * FROM semesters ORDER BY start_date DESC').all();
  res.json({ semesters });
});

router.post('/admin/semesters', (req, res) => {
  const { name, startDate, endDate, setCurrent } = req.body;
  if (!name || !startDate || !endDate) {
    return res.status(400).json({ error: 'نام ترم و بازه تاریخی الزامی است.' });
  }

  const semesterId = runInTransaction(() => {
    if (setCurrent) {
      db.prepare('UPDATE semesters SET is_current = 0, registration_open = 0').run();
    }
    return db.prepare(`
      INSERT INTO semesters (name, start_date, end_date, is_current, registration_open)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, startDate, endDate, setCurrent ? 1 : 0, setCurrent ? 1 : 0).lastInsertRowid;
  });

  res.status(201).json({ success: true, semesterId });
});

router.put('/admin/semesters/:id/registration', (req, res) => {
  const { open } = req.body; // true/false
  const semester = db.prepare('SELECT * FROM semesters WHERE id = ?').get(req.params.id);
  if (!semester) return res.status(404).json({ error: 'ترم یافت نشد.' });

  db.prepare('UPDATE semesters SET registration_open = ? WHERE id = ?').run(open ? 1 : 0, semester.id);
  res.json({ success: true });
});

// تعیین/ویرایش مبلغ شهریه یک ترم
router.put('/admin/semesters/:id/tuition', (req, res) => {
  const { amount } = req.body;
  const numAmount = Number(amount);
  if (!Number.isFinite(numAmount) || numAmount < 0) {
    return res.status(400).json({ error: 'مبلغ شهریه نامعتبر است.' });
  }
  const semester = db.prepare('SELECT * FROM semesters WHERE id = ?').get(req.params.id);
  if (!semester) return res.status(404).json({ error: 'ترم یافت نشد.' });

  db.prepare('UPDATE semesters SET tuition_amount = ? WHERE id = ?').run(numAmount, semester.id);
  res.json({ success: true });
});

// ===================================================================
// یوزکیس ۸: مدیریت اساتید
// ===================================================================

router.get('/admin/professors', (req, res) => {
  const semester = getCurrentSemester();
  const professors = db.prepare(`
    SELECT u.id, u.username, u.full_name, p.employee_number, p.rank
    FROM users u JOIN professors p ON p.user_id = u.id
    ORDER BY u.full_name
  `).all();

  const withCourses = professors.map((prof) => {
    const courses = semester
      ? db.prepare('SELECT id, code, title FROM courses WHERE professor_id = ? AND semester_id = ?').all(prof.id, semester.id)
      : [];
    return { ...prof, courses };
  });

  res.json({ professors: withCourses });
});

router.post('/admin/professors', (req, res) => {
  const { fullName, employeeNumber, rank, username, password } = req.body;
  if (!fullName || !employeeNumber || !username || !password) {
    return res.status(400).json({ error: 'نام، کد پرسنلی، نام کاربری و رمز عبور الزامی است.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) return res.status(409).json({ error: 'این نام کاربری قبلاً استفاده شده است.' });

  // یه کاربر با نقش «استاد» می‌سازیم و بعد ردیف تکمیلیش رو توی جدول professors هم اضافه می‌کنیم.
  // این دو تا کار باید با هم انجام بشن (تراکنش)، وگرنه ممکنه یکیش موفق بشه و اون یکی نه.
  try {
    const userId = runInTransaction(() => {
      const newUserId = db.prepare('INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)')
        .run(username, bcrypt.hashSync(password, 10), fullName, 'professor').lastInsertRowid;
      db.prepare('INSERT INTO professors (user_id, employee_number, rank) VALUES (?, ?, ?)').run(newUserId, employeeNumber, rank || 'استادیار');
      return newUserId;
    });
    res.status(201).json({ success: true, professorId: userId });
  } catch (err) {
    res.status(409).json({ error: 'این کد پرسنلی قبلاً ثبت شده است.' });
  }
});

// تخصیص درس به استاد
router.post('/admin/professors/:id/assign', (req, res) => {
  const { courseId } = req.body;
  const professor = db.prepare(`SELECT u.id FROM users u WHERE u.id = ? AND u.role = 'professor'`).get(req.params.id);
  if (!professor) return res.status(404).json({ error: 'استاد یافت نشد.' });

  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId);
  if (!course) return res.status(404).json({ error: 'درس یافت نشد.' });

  if (course.professor_id === professor.id) {
    return res.status(409).json({ error: 'این درس قبلاً به همین استاد تخصیص داده شده است.' });
  }

  db.prepare('UPDATE courses SET professor_id = ? WHERE id = ?').run(professor.id, course.id);
  res.json({ success: true });
});

// ===================================================================
// یوزکیس ۹: گزارش‌گیری
// ===================================================================

// گزارش درصد تکمیل ظرفیت دروس یک ترم
router.get('/admin/reports/capacity', (req, res) => {
  const semesterId = req.query.semesterId || getCurrentSemester()?.id;
  if (!semesterId) return res.json({ courses: [], summary: null });

  const courses = db.prepare(`
    SELECT c.code, c.title, c.capacity,
           (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id AND e.status='active') AS enrolled_count
    FROM courses c WHERE c.semester_id = ? ORDER BY c.code
  `).all(semesterId);

  // برای هر درس، درصد پر شدن ظرفیتش رو حساب می‌کنیم
  const withPct = courses.map((c) => ({
    ...c,
    percent: c.capacity > 0 ? Math.round((c.enrolled_count / c.capacity) * 100) : 0,
  }));

  // و بعد چندتا آمار کلی روی همه دروس
  let totalEnrollments = 0;
  let percentSum = 0;
  let fullCourses = 0;
  for (const c of withPct) {
    totalEnrollments += c.enrolled_count;
    percentSum += c.percent;
    if (c.enrolled_count >= c.capacity) fullCourses++;
  }
  const avgPercent = withPct.length > 0 ? Math.round(percentSum / withPct.length) : 0;

  res.json({ courses: withPct, summary: { totalEnrollments, avgPercent, fullCourses } });
});

// گزارش کارنامه کلی دانشجویان (میانگین معدل، تعداد دانشجویان و ...) برای یک ترم مشخص
router.get('/admin/reports/transcript-summary', (req, res) => {
  const semesterId = req.query.semesterId || getCurrentSemester()?.id;
  if (!semesterId) return res.json({ students: [] });

  const rows = db.prepare(`
    SELECT u.id, u.full_name, u.username, c.credits, g.score
    FROM enrollments e
    JOIN users u ON u.id = e.student_id
    JOIN courses c ON c.id = e.course_id
    LEFT JOIN grades g ON g.enrollment_id = e.id
    WHERE c.semester_id = ? AND c.grades_finalized = 1 AND e.status = 'active'
  `).all(semesterId);

  const byStudent = {};
  for (const r of rows) {
    if (!byStudent[r.id]) byStudent[r.id] = { fullName: r.full_name, username: r.username, totalPoints: 0, totalCredits: 0 };
    if (r.score != null) {
      byStudent[r.id].totalPoints += r.score * r.credits;
      byStudent[r.id].totalCredits += r.credits;
    }
  }

  const students = Object.values(byStudent).map((s) => ({
    fullName: s.fullName, username: s.username,
    gpa: s.totalCredits > 0 ? +(s.totalPoints / s.totalCredits).toFixed(2) : null,
  }));

  res.json({ students });
});

// ===================================================================
// مدیریت مالی: نمای کلی پرداخت‌های دانشجویان در یک ترم
// ===================================================================
router.get('/admin/finance/overview', (req, res) => {
  const semester = req.query.semesterId
    ? db.prepare('SELECT * FROM semesters WHERE id = ?').get(req.query.semesterId)
    : getCurrentSemester();
  if (!semester) return res.json({ semester: null, students: [], summary: null });

  // همه دانشجویانی که در این ترم حداقل یک درس ثبت‌نام کرده‌اند
  const students = db.prepare(`
    SELECT DISTINCT u.id, u.username, u.full_name
    FROM users u
    JOIN enrollments e ON e.student_id = u.id
    JOIN courses c ON c.id = e.course_id
    WHERE u.role = 'student' AND c.semester_id = ?
    ORDER BY u.full_name
  `).all(semester.id);

  // مجموع پرداختی هر دانشجو در این ترم رو جمع می‌زنیم و توی یه آبجکت ساده نگه می‌داریم
  const paidRows = db.prepare(
    `SELECT student_id, SUM(amount) AS total FROM payments WHERE semester_id = ? AND status='completed' GROUP BY student_id`
  ).all(semester.id);
  const paidMap = {};
  for (const p of paidRows) {
    paidMap[p.student_id] = p.total;
  }

  const rows = students.map((s) => {
    const paid = paidMap[s.id] || 0;
    const remaining = Math.max(semester.tuition_amount - paid, 0);
    let status = 'unpaid';
    if (remaining === 0) status = 'paid';
    else if (paid > 0) status = 'partial';
    return { ...s, tuitionAmount: semester.tuition_amount, paid, remaining, status };
  });

  let totalCollected = 0;
  let fullyPaidCount = 0;
  for (const r of rows) {
    totalCollected += r.paid;
    if (r.status === 'paid') fullyPaidCount++;
  }

  res.json({
    semester,
    students: rows,
    summary: { totalCollected, fullyPaidCount, totalStudents: rows.length },
  });
});

export default router;
