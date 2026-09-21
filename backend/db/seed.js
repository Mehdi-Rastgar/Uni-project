// اسکریپت پر کردن پایگاه‌داده با داده‌های نمونه برای تست و دمو
// اجرا: npm run seed
import bcrypt from 'bcryptjs';
import { db } from './database.js';

const hash = (plain) => bcrypt.hashSync(plain, 10);

function seed() {
  const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (userCount > 0) {
    console.log('پایگاه‌داده از قبل داده دارد — seed اجرا نشد. برای شروع تازه، فایل university.db را حذف کنید.');
    return;
  }

  const insertUser = db.prepare(
    'INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)'
  );

  // ---- کاربران ----
  const studentId = insertUser.run('40012345', hash('student123'), 'مهدی دشتی', 'student').lastInsertRowid;
  db.prepare('INSERT INTO students (user_id, entry_year, major) VALUES (?, ?, ?)').run(studentId, 1401, 'مهندسی کامپیوتر');

  const student2Id = insertUser.run('40012198', hash('student123'), 'مریم حسینی', 'student').lastInsertRowid;
  db.prepare('INSERT INTO students (user_id, entry_year, major) VALUES (?, ?, ?)').run(student2Id, 1401, 'مهندسی کامپیوتر');

  const student3Id = insertUser.run('40011876', hash('student123'), 'رضا کاظمی', 'student').lastInsertRowid;
  db.prepare('INSERT INTO students (user_id, entry_year, major) VALUES (?, ?, ?)').run(student3Id, 1402, 'مهندسی کامپیوتر');

  const student4Id = insertUser.run('40012501', hash('student123'), 'سارا محمدی', 'student').lastInsertRowid;
  db.prepare('INSERT INTO students (user_id, entry_year, major) VALUES (?, ?, ?)').run(student4Id, 1401, 'مهندسی کامپیوتر');

  const student5Id = insertUser.run('40011932', hash('student123'), 'امیر توکلی', 'student').lastInsertRowid;
  db.prepare('INSERT INTO students (user_id, entry_year, major) VALUES (?, ?, ?)').run(student5Id, 1402, 'مهندسی کامپیوتر');

  const profId = insertUser.run('P-1042', hash('prof123'), 'دکتر کریمی', 'professor').lastInsertRowid;
  db.prepare('INSERT INTO professors (user_id, employee_number, rank) VALUES (?, ?, ?)').run(profId, 'P-1042', 'استادیار');

  const prof2Id = insertUser.run('P-1015', hash('prof123'), 'دکتر احمدی', 'professor').lastInsertRowid;
  db.prepare('INSERT INTO professors (user_id, employee_number, rank) VALUES (?, ?, ?)').run(prof2Id, 'P-1015', 'دانشیار');

  insertUser.run('admin', hash('admin123'), 'مریم احمدی', 'admin');

  // ---- ترم‌ها (با مبلغ شهریه به تومان) ----
  const currentSemId = db.prepare(
    'INSERT INTO semesters (name, start_date, end_date, is_current, registration_open, tuition_amount) VALUES (?, ?, ?, 1, 1, ?)'
  ).run('نیمسال دوم ۱۴۰۴', '1404-11-01', '1405-03-20', 12000000).lastInsertRowid;

  const pastSemId = db.prepare(
    'INSERT INTO semesters (name, start_date, end_date, is_current, registration_open, tuition_amount) VALUES (?, ?, ?, 0, 0, ?)'
  ).run('نیمسال اول ۱۴۰۴', '1403-06-15', '1403-10-20', 11000000).lastInsertRowid;

  // ---- دروس ترم جاری ----
  const insertCourse = db.prepare(`
    INSERT INTO courses (code, title, credits, capacity, professor_id, semester_id, day_of_week, start_time, end_time, room)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const cCS201 = insertCourse.run('CS201', 'ساختمان داده', 3, 30, prof2Id, currentSemId, 'شنبه', '08:00', '10:00', 'کلاس ۲۰۱').lastInsertRowid;
  const cCS310 = insertCourse.run('CS310', 'مهندسی نرم‌افزار', 3, 25, profId, currentSemId, 'یک‌شنبه', '08:00', '10:00', 'کلاس ۲۰۱').lastInsertRowid;
  const cCS405 = insertCourse.run('CS405', 'یادگیری ماشین', 3, 30, prof2Id, currentSemId, 'دوشنبه', '10:00', '12:00', 'کلاس ۳۰۵').lastInsertRowid;
  const cMA210 = insertCourse.run('MA210', 'احتمال و آمار', 3, 40, profId, currentSemId, 'شنبه', '10:00', '12:00', 'کلاس ۳۰۲').lastInsertRowid;
  const cCS330 = insertCourse.run('CS330', 'پایگاه داده', 3, 30, prof2Id, currentSemId, 'یک‌شنبه', '15:00', '17:00', 'کلاس ۱۰۵').lastInsertRowid;

  // ---- دروس ترم قبل (برای کارنامه) — نمرات این ترم قطعی اعلام شده‌اند ----
  const insertPastCourse = db.prepare(`
    INSERT INTO courses (code, title, credits, capacity, professor_id, semester_id, day_of_week, start_time, end_time, room, grades_finalized)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);
  const pCS201 = insertPastCourse.run('CS201', 'ساختمان داده', 3, 30, prof2Id, pastSemId, 'شنبه', '08:00', '10:00', 'کلاس ۲۰۱').lastInsertRowid;
  const pCS220 = insertPastCourse.run('CS220', 'معماری کامپیوتر', 3, 30, prof2Id, pastSemId, 'یک‌شنبه', '08:00', '10:00', 'کلاس ۲۰۲').lastInsertRowid;
  const pMA110 = insertPastCourse.run('MA110', 'ریاضی عمومی ۲', 3, 40, profId, pastSemId, 'دوشنبه', '10:00', '12:00', 'کلاس ۱۰۱').lastInsertRowid;

  // ---- پیش‌نیازها ----
  db.prepare('INSERT INTO prerequisites (course_code, prereq_code) VALUES (?, ?)').run('CS310', 'CS201');
  db.prepare('INSERT INTO prerequisites (course_code, prereq_code) VALUES (?, ?)').run('CS405', 'MA210');

  // ---- ثبت‌نام‌های ترم جاری برای دانشجوی نمونه ----
  const insertEnroll = db.prepare('INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)');
  const eCS310 = insertEnroll.run(studentId, cCS310).lastInsertRowid;
  const eMA210 = insertEnroll.run(studentId, cMA210).lastInsertRowid;
  const eCS330 = insertEnroll.run(studentId, cCS330).lastInsertRowid;

  // سایر دانشجویان — برای این‌که لیست کلاسی و ثبت نمره استاد و گزارش‌گیری ادمین واقعی‌تر باشند
  insertEnroll.run(student2Id, cCS310);
  insertEnroll.run(student3Id, cCS310);
  insertEnroll.run(student4Id, cCS310);
  insertEnroll.run(student5Id, cCS310);
  insertEnroll.run(student2Id, cMA210);
  insertEnroll.run(student3Id, cMA210);
  insertEnroll.run(student2Id, cCS201);
  insertEnroll.run(student4Id, cCS201);
  insertEnroll.run(student5Id, cCS405);

  // یک نمره از قبل برای یکی از دانشجویان CS310 ثبت شده (برای دیدن حالت «ثبت‌شده» در فرم نمره استاد)
  const eMaryamCS310 = db.prepare('SELECT id FROM enrollments WHERE student_id=? AND course_id=?').get(student2Id, cCS310).id;
  db.prepare('INSERT INTO grades (enrollment_id, score) VALUES (?, ?)').run(eMaryamCS310, 18);

  // ---- ثبت‌نام‌ها و نمرات ترم قبل (قطعی) ----
  const insertGrade = db.prepare('INSERT INTO grades (enrollment_id, score) VALUES (?, ?)');
  const pe1 = insertEnroll.run(studentId, pCS201).lastInsertRowid;
  insertGrade.run(pe1, 18.5);
  const pe2 = insertEnroll.run(studentId, pCS220).lastInsertRowid;
  insertGrade.run(pe2, 17.25);
  const pe3 = insertEnroll.run(studentId, pMA110).lastInsertRowid;
  insertGrade.run(pe3, 16.0);

  // ---- پرداخت‌های نمونه ----
  const insertPayment = db.prepare(`
    INSERT INTO payments (student_id, semester_id, amount, status, reference_code) VALUES (?, ?, ?, 'completed', ?)
  `);
  insertPayment.run(studentId, pastSemId, 11000000, 'TXN-100001-DEMO1'); // ترم قبل: کامل پرداخت‌شده
  insertPayment.run(studentId, currentSemId, 6000000, 'TXN-100002-DEMO2'); // ترم جاری: نیمی پرداخت‌شده

  console.log('داده‌های نمونه با موفقیت اضافه شدند.');
  console.log('---------------------------------------------');
  console.log('حساب‌های کاربری برای تست:');
  console.log('دانشجو  → شماره: 40012345   رمز: student123');
  console.log('استاد   → شماره: P-1042     رمز: prof123');
  console.log('ادمین   → شماره: admin      رمز: admin123');
  console.log('---------------------------------------------');
}

seed();
