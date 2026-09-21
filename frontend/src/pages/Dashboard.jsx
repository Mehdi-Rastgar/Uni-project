import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

function ActionCard({ to, icon, title, desc, cta }) {
  return (
    <Link to={to} className="action-card" style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="ic">{icon}</div>
      <h3>{title}</h3>
      <p>{desc}</p>
      <span className="btn sm primary">{cta}</span>
    </Link>
  );
}

function StudentDashboard({ auth }) {
  const [transcript, setTranscript] = useState(null);
  const [scheduleCount, setScheduleCount] = useState(null);
  const [statement, setStatement] = useState(null);

  useEffect(() => {
    api.getTranscript(auth.token).then(setTranscript).catch(() => {});
    api.getSchedule(auth.token).then((d) => setScheduleCount(d.items.length)).catch(() => {});
    api.getFinancialStatement(auth.token).then(setStatement).catch(() => {});
  }, [auth]);

  return (
    <div>
      <div className="topbar">
        <div><h1>سلام، {auth.user.fullName} 👋</h1><p>سیستم آموزشی جامع دانشگاه</p></div>
        {transcript?.gpa != null && <span className="badge gold">معدل کل: {transcript.gpa}</span>}
      </div>

      <div className="stat-row">
        <div className="stat"><div className="label">معدل کل</div><div className="value gold">{transcript?.gpa ?? '—'}</div><div className="sub">از ۲۰</div></div>
        <div className="stat"><div className="label">واحد گذرانده</div><div className="value">{transcript?.totalCredits ?? '—'}</div></div>
        <div className="stat"><div className="label">دروس ترم جاری</div><div className="value">{scheduleCount ?? '—'}</div></div>
        {statement && (
          <div className="stat">
            <div className="label">مانده بدهی شهریه</div>
            <div className="value" style={{ color: statement.totalRemaining > 0 ? 'var(--danger)' : 'var(--success)' }}>
              {statement.totalRemaining > 0 ? `${statement.totalRemaining.toLocaleString('fa-IR')} ت` : 'تسویه'}
            </div>
          </div>
        )}
      </div>

      <div className="section-title">آموزشی</div>
      <div className="cards-grid">
        <ActionCard to="/register" icon="📋" title="ثبت‌نام دروس" desc="انتخاب و ثبت‌نام دروس ترم جاری بر اساس پیش‌نیاز و ظرفیت." cta="مشاهده دروس" />
        <ActionCard to="/schedule" icon="📅" title="برنامه هفتگی" desc="مشاهده برنامه کلاسی هفتگی بر اساس دروس ثبت‌نامی." cta="مشاهده برنامه" />
        <ActionCard to="/transcript" icon="🎓" title="کارنامه من" desc="مشاهده نمرات دروس گذرانده و معدل کل به تفکیک نیمسال." cta="مشاهده کارنامه" />
      </div>

      <div className="section-title">مالی</div>
      <div className="cards-grid">
        <ActionCard to="/payment" icon="💳" title="پرداخت شهریه" desc="پرداخت آنلاین (شبیه‌سازی‌شده) مانده شهریه ترم جاری." cta="پرداخت" />
        <ActionCard to="/financial-statement" icon="🧾" title="کارنامه مالی" desc="مشاهده وضعیت بدهی و پرداختی به‌تفکیک هر ترم." cta="مشاهده کارنامه مالی" />
        <ActionCard to="/payment-history" icon="📜" title="لیست پرداخت‌ها" desc="تاریخچه کامل تراکنش‌های پرداخت‌شده." cta="مشاهده لیست" />
      </div>
    </div>
  );
}

function ProfessorDashboard({ auth }) {
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    api.getProfessorCourses(auth.token).then((d) => setCourses(d.courses)).catch(() => {});
  }, [auth]);

  // مجموع تعداد دانشجویان همه دروس این استاد رو با یه حلقه ساده جمع می‌زنیم
  let totalStudents = 0;
  for (const course of courses) {
    totalStudents += course.enrolled_count;
  }
  const pendingCourses = courses.filter((c) => !c.grades_finalized).length;

  return (
    <div>
      <div className="topbar">
        <div><h1>سلام، {auth.user.fullName} 👋</h1><p>پنل استاد · نیمسال جاری</p></div>
      </div>

      <div className="stat-row">
        <div className="stat"><div className="label">دروس ترم جاری</div><div className="value">{courses.length}</div></div>
        <div className="stat"><div className="label">مجموع دانشجویان</div><div className="value">{totalStudents}</div></div>
        <div className="stat"><div className="label">در انتظار ثبت نمره</div><div className="value gold">{pendingCourses}</div></div>
      </div>

      <div className="section-title">دسترسی سریع</div>
      <div className="cards-grid">
        <ActionCard to="/classlist" icon="👥" title="لیست کلاسی" desc="مشاهده فهرست دانشجویان ثبت‌نامی در هر یک از دروس شما." cta="مشاهده لیست" />
        <ActionCard to="/grades" icon="✏️" title="ثبت نمره" desc="وارد کردن و ویرایش نمرات دانشجویان تا پیش از قطعی‌شدن." cta="ثبت نمره" />
      </div>

      {courses.length > 0 && (
        <>
          <div className="section-title">دروس من</div>
          <div className="panel">
            <table>
              <thead><tr><th>کد</th><th>عنوان درس</th><th>دانشجویان</th><th>وضعیت نمرات</th></tr></thead>
              <tbody>
                {courses.map((c) => (
                  <tr key={c.id}>
                    <td>{c.code}</td>
                    <td>{c.title}</td>
                    <td>{c.enrolled_count}/{c.capacity}</td>
                    <td>
                      {c.grades_finalized
                        ? <span className="pill" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>قطعی‌شده</span>
                        : <span className="pill" style={{ background: 'var(--ink-tint)', color: 'var(--ink)' }}>در حال ثبت</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function AdminDashboard({ auth }) {
  const [capacity, setCapacity] = useState(null);

  useEffect(() => {
    api.getCapacityReport(auth.token).then(setCapacity).catch(() => {});
  }, [auth]);

  return (
    <div>
      <div className="topbar">
        <div><h1>سلام، {auth.user.fullName} 👋</h1><p>پنل کارشناس آموزش</p></div>
      </div>

      <div className="stat-row">
        <div className="stat"><div className="label">میانگین تکمیل ظرفیت</div><div className="value gold">{capacity?.summary?.avgPercent ?? '—'}٪</div></div>
        <div className="stat"><div className="label">کل ثبت‌نامی‌ها</div><div className="value">{capacity?.summary?.totalEnrollments ?? '—'}</div></div>
        <div className="stat"><div className="label">دروس با ظرفیت پر</div><div className="value">{capacity?.summary?.fullCourses ?? '—'}</div></div>
      </div>

      <div className="section-title">دسترسی سریع</div>
      <div className="cards-grid">
        <ActionCard to="/admin/courses" icon="📖" title="مدیریت دروس" desc="تعریف درس جدید یا ویرایش دروس ارائه‌شده در ترم جاری." cta="مدیریت دروس" />
        <ActionCard to="/admin/semesters" icon="🗓" title="مدیریت ترم" desc="تعریف ترم تحصیلی جدید و کنترل وضعیت ثبت‌نام." cta="مدیریت ترم" />
        <ActionCard to="/admin/professors" icon="⭐" title="مدیریت اساتید" desc="افزودن اساتید و تخصیص دروس به آن‌ها." cta="مدیریت اساتید" />
        <ActionCard to="/admin/reports" icon="📊" title="گزارش‌گیری" desc="گزارش آماری ثبت‌نام و کارنامه کلی دانشجویان." cta="مشاهده گزارش" />
        <ActionCard to="/admin/finance" icon="💰" title="مدیریت مالی" desc="وضعیت پرداخت شهریه دانشجویان و مجموع دریافتی." cta="مشاهده وضعیت مالی" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { auth } = useAuth();
  if (auth.user.role === 'professor') return <ProfessorDashboard auth={auth} />;
  if (auth.user.role === 'admin') return <AdminDashboard auth={auth} />;
  return <StudentDashboard auth={auth} />;
}
