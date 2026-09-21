import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/database.js';
import { JWT_SECRET } from '../middleware/auth.js';

const router = Router();

// بعد از ۵ بار رمز اشتباه، حساب رو ۵ دقیقه قفل می‌کنیم
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 5;
const failedAttempts = new Map(); // username -> { count, lockedUntil }

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'شماره دانشجویی/پرسنلی و رمز عبور الزامی است.' });
  }

  // اول چک می‌کنیم این کاربر قفل نیست
  const state = failedAttempts.get(username);
  if (state && state.lockedUntil && state.lockedUntil > Date.now()) {
    const secondsLeft = Math.ceil((state.lockedUntil - Date.now()) / 1000);
    return res.status(423).json({ error: `حساب موقتاً قفل است. ${secondsLeft} ثانیه دیگر تلاش کنید.` });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  // رمز رو با bcrypt چک می‌کنیم - چون توی دیتابیس هش‌شده ذخیره شده، نه متن ساده
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    const prev = failedAttempts.get(username) || { count: 0 };
    const count = prev.count + 1;

    if (count >= MAX_FAILED_ATTEMPTS) {
      failedAttempts.set(username, { count: 0, lockedUntil: Date.now() + LOCK_MINUTES * 60 * 1000 });
      return res.status(423).json({ error: `به‌دلیل ${MAX_FAILED_ATTEMPTS} تلاش ناموفق، حساب برای ${LOCK_MINUTES} دقیقه قفل شد.` });
    }

    failedAttempts.set(username, { count });
    return res.status(401).json({ error: 'شماره کاربری یا رمز عبور نادرست است.' });
  }

  // ورود موفق بود، پس دیگه شمارنده تلاش‌های ناموفق رو پاک می‌کنیم
  failedAttempts.delete(username);

  const payload = { id: user.id, username: user.username, role: user.role, fullName: user.full_name };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });

  res.json({ token, user: payload });
});

// این برای وقتیه که کاربر صفحه رو رفرش می‌کنه و باید دوباره بفهمیم کیه
router.get('/me', (req, res) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'توکن ارسال نشده است.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    res.json({ user: payload });
  } catch {
    res.status(401).json({ error: 'توکن نامعتبر است.' });
  }
});

export default router;
