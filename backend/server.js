import express from 'express';
import cors from 'cors';
import 'dotenv/config';

import authRoutes from './routes/auth.js';
import courseRoutes from './routes/courses.js';
import professorRoutes from './routes/professor.js';
import adminRoutes from './routes/admin.js';
import financeRoutes from './routes/finance.js';
import './db/database.js'; // این خط دیتابیس رو می‌سازه/باز می‌کنه، همین که ایمپورتش کنیم کافیه

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// یه لاگر خیلی ساده که هر درخواست رو توی ترمینال چاپ می‌کنه، برای دیباگ کردن مفیده
app.use((req, res, next) => {
  console.log(req.method, req.path);
  next();
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// هر روت فایل خودشو داره، اینجا فقط بهشون وصل می‌کنیم
app.use('/api/auth', authRoutes);
app.use('/api', courseRoutes);
app.use('/api', professorRoutes);
app.use('/api', adminRoutes);
app.use('/api', financeRoutes);

// اگه یه جایی توی کد خطا بخوره و کسی catch نکنه، میاد اینجا
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'خطای داخلی سرور رخ داد.' });
});

app.listen(PORT, () => {
  console.log(`سرور روی پورت ${PORT} بالا اومد`);
});
