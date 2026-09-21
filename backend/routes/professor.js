import { Router } from 'express';
import { db, runInTransaction } from '../db/database.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

function getCurrentSemester() {
  return db.prepare('SELECT * FROM semesters WHERE is_current = 1').get();
}

// همه‌ی مسیرهای این فایل مخصوص نقش «استاد» هستند
router.use(requireAuth, requireRole('professor'));

// یک تابع کمکی برای اطمینان از این‌که درس واقعاً متعلق به همین استاد است
function getOwnedCourseOrFail(courseId, professorId, res) {
  const course = db.prepare('SELECT * FROM courses WHERE id = ? AND professor_id = ?').get(courseId, professorId);
  if (!course) {
    res.status(404).json({ error: 'درس یافت نشد یا به شما تخصیص داده نشده است.' });
    return null;
  }
  return course;
}

// -----------------------------------------------------------------
// GET /api/professor/courses — دروس استاد در ترم جاری
// -----------------------------------------------------------------
router.get('/professor/courses', (req, res) => {
  const semester = getCurrentSemester();
  if (!semester) return res.json({ semester: null, courses: [] });

  const courses = db.prepare(`
    SELECT c.id, c.code, c.title, c.credits, c.capacity, c.grades_finalized,
           (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id AND e.status = 'active') AS enrolled_count
    FROM courses c
    WHERE c.professor_id = ? AND c.semester_id = ?
    ORDER BY c.code
  `).all(req.user.id, semester.id);

  res.json({ semester, courses });
});

// -----------------------------------------------------------------
// GET /api/professor/courses/:id/students — یوزکیس ۵: لیست کلاسی
// -----------------------------------------------------------------
router.get('/professor/courses/:id/students', (req, res) => {
  const course = getOwnedCourseOrFail(req.params.id, req.user.id, res);
  if (!course) return;

  const students = db.prepare(`
    SELECT u.id, u.username, u.full_name, e.registered_at
    FROM enrollments e
    JOIN users u ON u.id = e.student_id
    WHERE e.course_id = ? AND e.status = 'active'
    ORDER BY u.full_name
  `).all(course.id);

  res.json({ course, students });
});

// -----------------------------------------------------------------
// GET /api/professor/courses/:id/grades — یوزکیس ۴: فهرست دانشجویان + نمره فعلی
// -----------------------------------------------------------------
router.get('/professor/courses/:id/grades', (req, res) => {
  const course = getOwnedCourseOrFail(req.params.id, req.user.id, res);
  if (!course) return;

  const rows = db.prepare(`
    SELECT e.id AS enrollment_id, u.username, u.full_name, g.score
    FROM enrollments e
    JOIN users u ON u.id = e.student_id
    LEFT JOIN grades g ON g.enrollment_id = e.id
    WHERE e.course_id = ? AND e.status = 'active'
    ORDER BY u.full_name
  `).all(course.id);

  res.json({ course, students: rows });
});

// -----------------------------------------------------------------
// PUT /api/professor/courses/:id/grades — یوزکیس ۴: ثبت/ویرایش نمرات (دسته‌ای)
// بدنه درخواست: { grades: [{ enrollmentId, score }, ...] }
// -----------------------------------------------------------------
router.put('/professor/courses/:id/grades', (req, res) => {
  const course = getOwnedCourseOrFail(req.params.id, req.user.id, res);
  if (!course) return;

  if (course.grades_finalized) {
    return res.status(400).json({ error: 'نمرات این درس قبلاً توسط کارشناس آموزش «قطعی» اعلام شده و دیگر قابل ویرایش نیست.' });
  }

  const { grades } = req.body;
  if (!Array.isArray(grades)) {
    return res.status(400).json({ error: 'فرمت داده ارسالی نامعتبر است.' });
  }

  // برای هر دانشجو: اگه قبلاً نمره‌ای براش ثبت شده بود UPDATE می‌کنیم، وگرنه یه ردیف جدید INSERT می‌کنیم.
  // این ساده‌تره تا از تریگ‌های عجیب SQL مثل ON CONFLICT استفاده کنیم.
  const checkEnrollment = db.prepare('SELECT id FROM enrollments WHERE id = ? AND course_id = ?');
  const findExistingGrade = db.prepare('SELECT id FROM grades WHERE enrollment_id = ?');
  const updateGrade = db.prepare(`UPDATE grades SET score = ?, updated_at = datetime('now') WHERE enrollment_id = ?`);
  const insertGrade = db.prepare(`INSERT INTO grades (enrollment_id, score, updated_at) VALUES (?, ?, datetime('now'))`);

  const errors = [];
  function applyAll(items) {
    for (const item of items) {
      const { enrollmentId, score } = item;

      if (!checkEnrollment.get(enrollmentId, course.id)) {
        errors.push(`ثبت‌نام ${enrollmentId} متعلق به این درس نیست.`);
        continue;
      }
      if (score === null || score === '' || score === undefined) {
        continue; // نمره خالی یعنی دانشجو رو دست‌نخورده رها کن
      }
      const numScore = Number(score);
      if (Number.isNaN(numScore) || numScore < 0 || numScore > 20) {
        errors.push(`نمره «${score}» خارج از بازه مجاز (۰ تا ۲۰) است.`);
        continue;
      }

      const existing = findExistingGrade.get(enrollmentId);
      if (existing) {
        updateGrade.run(numScore, enrollmentId);
      } else {
        insertGrade.run(enrollmentId, numScore);
      }
    }
  }

  runInTransaction(() => applyAll(grades));

  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(' | '), partial: true });
  }

  res.json({ success: true });
});

export default router;
