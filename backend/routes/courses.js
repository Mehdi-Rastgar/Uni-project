import { Router } from 'express';
import { db } from '../db/database.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
const PASSING_GRADE = 10; // حداقل نمره قبولی، برای حساب‌کردن پیش‌نیازها لازمه

function getCurrentSemester() {
  return db.prepare('SELECT * FROM semesters WHERE is_current = 1').get();
}

// فهرست دروس ترم جاری + وضعیت هرکدوم برای دانشجوی لاگین‌شده (پره؟ قبلاً برداشته؟)
router.get('/courses', requireAuth, (req, res) => {
  const semester = getCurrentSemester();
  if (!semester) {
    return res.json({ semester: null, courses: [] });
  }

  const courses = db.prepare(`
    SELECT c.id, c.code, c.title, c.credits, c.capacity, c.day_of_week, c.start_time, c.end_time, c.room,
           u.full_name AS professor_name,
           (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id AND e.status = 'active') AS enrolled_count
    FROM courses c
    LEFT JOIN users u ON u.id = c.professor_id
    WHERE c.semester_id = ?
    ORDER BY c.code
  `).all(semester.id);

  // می‌خوایم بدونیم دانشجو کدوم درس‌ها رو از قبل برداشته، تا جلوی هر درس نشون بدیم
  let myEnrollments = [];
  if (req.user.role === 'student') {
    myEnrollments = db.prepare(
      `SELECT id, course_id FROM enrollments WHERE student_id = ? AND status = 'active'`
    ).all(req.user.id);
  }

  // یه دیکشنری ساده می‌سازیم: courseId -> enrollmentId (برای اینکه سریع چک کنیم)
  const enrollmentByCourse = {};
  for (const en of myEnrollments) {
    enrollmentByCourse[en.course_id] = en.id;
  }

  const result = courses.map((c) => ({
    ...c,
    isFull: c.enrolled_count >= c.capacity,
    isEnrolled: c.id in enrollmentByCourse,
    enrollmentId: enrollmentByCourse[c.id] || null,
  }));

  res.json({ semester, courses: result });
});

// ثبت‌نام دانشجو در یه درس. قبلش چندتا شرط رو باید چک کنیم.
router.post('/enrollments', requireAuth, requireRole('student'), (req, res) => {
  const { courseId } = req.body;
  const semester = getCurrentSemester();

  if (!semester || !semester.registration_open) {
    return res.status(400).json({ error: 'زمان ثبت‌نام فعال نیست.' });
  }

  const course = db.prepare('SELECT * FROM courses WHERE id = ? AND semester_id = ?').get(courseId, semester.id);
  if (!course) {
    return res.status(404).json({ error: 'درس یافت نشد.' });
  }

  const alreadyActive = db.prepare(
    `SELECT id FROM enrollments WHERE student_id = ? AND course_id = ? AND status = 'active'`
  ).get(req.user.id, courseId);
  if (alreadyActive) {
    return res.status(409).json({ error: 'شما قبلاً در این درس ثبت‌نام کرده‌اید.' });
  }

  // برای هر پیش‌نیاز این درس، چک می‌کنیم دانشجو با نمره قبولی گذرونده یا نه
  const prereqs = db.prepare('SELECT prereq_code FROM prerequisites WHERE course_code = ?').all(course.code);
  for (const row of prereqs) {
    const passed = db.prepare(`
      SELECT g.score FROM grades g
      JOIN enrollments e ON e.id = g.enrollment_id
      JOIN courses c ON c.id = e.course_id
      WHERE e.student_id = ? AND c.code = ? AND c.grades_finalized = 1 AND g.score >= ?
    `).get(req.user.id, row.prereq_code, PASSING_GRADE);

    if (!passed) {
      return res.status(400).json({ error: `پیش‌نیاز این درس (${row.prereq_code}) با نمره قبولی گذرانده نشده است.` });
    }
  }

  const enrolledCount = db.prepare(
    `SELECT COUNT(*) AS c FROM enrollments WHERE course_id = ? AND status = 'active'`
  ).get(courseId).c;
  if (enrolledCount >= course.capacity) {
    return res.status(400).json({ error: 'ظرفیت این درس تکمیل است.' });
  }

  // نکته مهم: اگه دانشجو قبلاً همین درس رو گرفته بود و بعد انصراف داده بود،
  // یه ردیف با status='dropped' ازش توی جدول enrollments مونده (چون توی
  // انصراف، ردیف رو پاک نمی‌کنیم، فقط وضعیتش رو عوض می‌کنیم). پس اول چک
  // می‌کنیم همچین ردیفی هست یا نه؛ اگه بود، همونو برمی‌گردونیم به active،
  // وگرنه یه ردیف کاملاً جدید می‌سازیم.
  const droppedBefore = db.prepare(
    `SELECT id FROM enrollments WHERE student_id = ? AND course_id = ? AND status = 'dropped'`
  ).get(req.user.id, courseId);

  let enrollmentId;
  if (droppedBefore) {
    db.prepare(`UPDATE enrollments SET status = 'active', registered_at = datetime('now') WHERE id = ?`)
      .run(droppedBefore.id);
    enrollmentId = droppedBefore.id;
  } else {
    const info = db.prepare('INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)').run(req.user.id, courseId);
    enrollmentId = info.lastInsertRowid;
  }

  res.status(201).json({ success: true, enrollmentId });
});

// انصراف از یه درس - رکورد رو پاک نمی‌کنیم، فقط وضعیتش رو dropped می‌کنیم
router.delete('/enrollments/:id', requireAuth, requireRole('student'), (req, res) => {
  const semester = getCurrentSemester();
  if (!semester || !semester.registration_open) {
    return res.status(400).json({ error: 'مهلت ثبت‌نام (و انصراف) به پایان رسیده است.' });
  }

  const enrollment = db.prepare('SELECT * FROM enrollments WHERE id = ? AND student_id = ?').get(req.params.id, req.user.id);
  if (!enrollment) {
    return res.status(404).json({ error: 'ثبت‌نامی یافت نشد.' });
  }

  db.prepare(`UPDATE enrollments SET status = 'dropped' WHERE id = ?`).run(enrollment.id);
  res.json({ success: true });
});

// برنامه هفتگی دانشجو، بر اساس دروسی که توشون ثبت‌نامه
router.get('/schedule/me', requireAuth, requireRole('student'), (req, res) => {
  const semester = getCurrentSemester();
  if (!semester) {
    return res.json({ items: [] });
  }

  const items = db.prepare(`
    SELECT c.code, c.title, c.day_of_week, c.start_time, c.end_time, c.room
    FROM enrollments e
    JOIN courses c ON c.id = e.course_id
    WHERE e.student_id = ? AND e.status = 'active' AND c.semester_id = ?
    ORDER BY c.day_of_week, c.start_time
  `).all(req.user.id, semester.id);

  res.json({ semester, items });
});

// کارنامه - نمرات همه دروس، گروه‌بندی‌شده بر اساس ترم، به‌همراه معدل کل
router.get('/transcript/me', requireAuth, requireRole('student'), (req, res) => {
  const rows = db.prepare(`
    SELECT s.id AS semester_id, s.name AS semester_name, s.is_current,
           c.code, c.title, c.credits, c.grades_finalized,
           g.score
    FROM enrollments e
    JOIN courses c ON c.id = e.course_id
    JOIN semesters s ON s.id = c.semester_id
    LEFT JOIN grades g ON g.enrollment_id = e.id
    WHERE e.student_id = ? AND e.status = 'active'
    ORDER BY s.start_date DESC, c.code
  `).all(req.user.id);

  // می‌خوایم نمره‌ها رو زیر هم ترم بچینیم، پس یه آبجکت می‌سازیم که کلیدش شماره ترمه
  const bySemester = {};
  let totalPoints = 0;
  let totalCredits = 0;

  for (const r of rows) {
    if (!bySemester[r.semester_id]) {
      bySemester[r.semester_id] = { semesterName: r.semester_name, isCurrent: !!r.is_current, courses: [] };
    }
    bySemester[r.semester_id].courses.push({
      code: r.code,
      title: r.title,
      credits: r.credits,
      score: r.score,
      isFinal: !!r.grades_finalized,
    });

    // معدل رو فقط از نمره‌های قطعی‌شده حساب می‌کنیم، نه چیزایی که هنوز در انتظارن
    if (r.grades_finalized && r.score != null) {
      totalPoints += r.score * r.credits;
      totalCredits += r.credits;
    }
  }

  const gpa = totalCredits > 0 ? +(totalPoints / totalCredits).toFixed(2) : null;

  res.json({ semesters: Object.values(bySemester), gpa, totalCredits });
});

export default router;
