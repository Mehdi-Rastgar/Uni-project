import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

// وقتی کاربر لاگین می‌کنه یه توکن بهش می‌دیم، و از اون به بعد باید
// این توکن رو توی هدر Authorization بفرسته تا بفهمیم کیه.
// این تابع همون توکن رو چک می‌کنه.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'ورود لازم است. توکن ارسال نشده است.' });
  }

  try {
    // اگه توکن معتبر باشه، اطلاعات کاربر رو از توش در میاریم (id, username, role, fullName)
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'نشست شما منقضی شده یا نامعتبر است. دوباره وارد شوید.' });
  }
}

// برای صفحاتی که فقط یه نقش خاص بهشون دسترسی داره
// مثال: requireRole('admin')  یا  requireRole('professor', 'admin')
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'شما دسترسی لازم برای این بخش را ندارید.' });
    }
    next();
  };
}

export { JWT_SECRET };
