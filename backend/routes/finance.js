import { Router } from 'express';
import { db } from '../db/database.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// همه‌ی مسیرهای این فایل مخصوص نقش «دانشجو» هستند
router.use(requireAuth, requireRole('student'));

function generateReferenceCode() {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  const stamp = Date.now().toString().slice(-6);
  return `TXN-${stamp}-${rand}`;
}

// -----------------------------------------------------------------
// GET /api/finance/statement — کارنامه مالی: بدهی/پرداختی هر ترم + مانده کل
// -----------------------------------------------------------------
router.get('/finance/statement', (req, res) => {
  const semesters = db.prepare(`
    SELECT s.id, s.name, s.is_current, s.tuition_amount
    FROM semesters s
    -- فقط ترم‌هایی که دانشجو حداقل یک درس در آن‌ها ثبت‌نام کرده یا شهریه‌ای برایش تعریف شده
    WHERE EXISTS (
      SELECT 1 FROM enrollments e JOIN courses c ON c.id = e.course_id
      WHERE e.student_id = ? AND c.semester_id = s.id
    )
    ORDER BY s.start_date DESC
  `).all(req.user.id);

  // مجموع پرداختی هر ترم رو جمع می‌زنیم و توی یه آبجکت ساده نگه می‌داریم (کلیدش semester id)
  const paidRows = db.prepare(`
    SELECT semester_id, SUM(amount) AS total
    FROM payments WHERE student_id = ? AND status = 'completed'
    GROUP BY semester_id
  `).all(req.user.id);
  const paidBySemester = {};
  for (const p of paidRows) {
    paidBySemester[p.semester_id] = p.total;
  }

  let totalDue = 0;
  let totalPaid = 0;
  const rows = semesters.map((s) => {
    const paid = paidBySemester[s.id] || 0;
    const remaining = Math.max(s.tuition_amount - paid, 0);
    totalDue += s.tuition_amount;
    totalPaid += paid;

    let status = 'unpaid';
    if (remaining === 0) status = 'paid';
    else if (paid > 0) status = 'partial';

    return {
      semesterId: s.id,
      semesterName: s.name,
      isCurrent: !!s.is_current,
      tuitionAmount: s.tuition_amount,
      paidAmount: paid,
      remaining,
      status,
    };
  });

  res.json({ semesters: rows, totalDue, totalPaid, totalRemaining: Math.max(totalDue - totalPaid, 0) });
});

// -----------------------------------------------------------------
// GET /api/finance/payments — لیست پرداخت‌های دانشجو
// -----------------------------------------------------------------
router.get('/finance/payments', (req, res) => {
  const payments = db.prepare(`
    SELECT p.id, p.amount, p.method, p.status, p.reference_code, p.paid_at, s.name AS semester_name
    FROM payments p
    JOIN semesters s ON s.id = p.semester_id
    WHERE p.student_id = ?
    ORDER BY p.paid_at DESC
  `).all(req.user.id);

  res.json({ payments });
});

// -----------------------------------------------------------------
// POST /api/finance/pay — پرداخت شهریه (شبیه‌سازی‌شده — بدون درگاه واقعی)
// بدنه: { amount } — مبلغی که دانشجو می‌خواهد برای ترم جاری پرداخت کند
// -----------------------------------------------------------------
router.post('/finance/pay', (req, res) => {
  const semester = db.prepare('SELECT * FROM semesters WHERE is_current = 1').get();
  if (!semester) return res.status(400).json({ error: 'ترم جاری تعریف نشده است.' });

  const { amount } = req.body;
  const numAmount = Number(amount);
  if (!numAmount || numAmount <= 0) {
    return res.status(400).json({ error: 'مبلغ پرداختی نامعتبر است.' });
  }

  const paidSoFar = db.prepare(`
    SELECT COALESCE(SUM(amount),0) AS total FROM payments
    WHERE student_id = ? AND semester_id = ? AND status = 'completed'
  `).get(req.user.id, semester.id).total;

  const remaining = semester.tuition_amount - paidSoFar;
  if (remaining <= 0) {
    return res.status(400).json({ error: 'شهریه این ترم قبلاً به‌طور کامل پرداخت شده است.' });
  }
  if (numAmount > remaining) {
    return res.status(400).json({ error: `مبلغ وارد‌شده بیشتر از مانده بدهی (${remaining.toLocaleString('fa-IR')} تومان) است.` });
  }

  // در دنیای واقعی اینجا اتصال به درگاه پرداخت بانکی برقرار می‌شود.
  // برای این پروژه، پرداخت به‌صورت شبیه‌سازی‌شده و همیشه موفق ثبت می‌شود.
  const referenceCode = generateReferenceCode();
  const info = db.prepare(`
    INSERT INTO payments (student_id, semester_id, amount, status, reference_code)
    VALUES (?, ?, ?, 'completed', ?)
  `).run(req.user.id, semester.id, numAmount, referenceCode);

  res.status(201).json({
    success: true,
    payment: { id: info.lastInsertRowid, amount: numAmount, referenceCode, semesterName: semester.name },
  });
});

export default router;
