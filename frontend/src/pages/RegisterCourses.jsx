import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export default function RegisterCourses() {
  const { auth } = useAuth();
  const [semester, setSemester] = useState(null);
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const data = await api.getCourses(auth.token);
      setSemester(data.semester);
      setCourses(data.courses);
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function showToast(msg, isError = false) {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleRegister(course) {
    setBusyId(course.id);
    try {
      await api.register(auth.token, course.id);
      showToast(`ثبت‌نام در «${course.title}» با موفقیت انجام شد.`);
      await load();
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDrop(course) {
    setBusyId(course.id);
    try {
      await api.drop(auth.token, course.enrollmentId);
      showToast(`ثبت‌نام «${course.title}» حذف شد.`);
      await load();
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setBusyId(null);
    }
  }

  const filtered = courses.filter((c) =>
    (c.title + c.code).toLowerCase().includes(search.toLowerCase())
  );
  const enrolledCount = courses.filter((c) => c.isEnrolled).length;

  // واحدهای انتخاب‌شده رو با یه حلقه ساده جمع می‌زنیم
  let enrolledCredits = 0;
  for (const course of courses) {
    if (course.isEnrolled) {
      enrolledCredits += course.credits;
    }
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>ثبت‌نام دروس</h1>
          <p>{semester ? semester.name : '...'}{semester && !semester.registration_open ? ' · مهلت ثبت‌نام به پایان رسیده' : ''}</p>
        </div>
        <span className="badge gold">{enrolledCount} درس · {enrolledCredits} واحد انتخاب‌شده</span>
      </div>

      <div className="field" style={{ maxWidth: 340 }}>
        <input
          type="text"
          placeholder="جستجوی نام یا کد درس"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="panel">
        {loading ? (
          <div className="empty-state">در حال بارگذاری...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">درسی یافت نشد.</div>
        ) : (
          <table>
            <thead>
              <tr><th>درس</th><th>استاد</th><th>ظرفیت</th><th>وضعیت</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td>
                    <b>{c.title}</b> <span style={{ color: 'var(--text-3)' }}>({c.code})</span>
                    <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
                      {c.credits} واحد · {c.day_of_week} {c.start_time}–{c.end_time} · {c.room}
                    </div>
                  </td>
                  <td>{c.professor_name || '—'}</td>
                  <td>{c.enrolled_count}/{c.capacity}</td>
                  <td>
                    {c.isEnrolled ? (
                      <span className="pill" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>انتخاب شد</span>
                    ) : c.isFull ? (
                      <span className="pill" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>ظرفیت پر</span>
                    ) : (
                      <span className="pill" style={{ background: 'var(--ink-tint)', color: 'var(--ink)' }}>قابل انتخاب</span>
                    )}
                  </td>
                  <td>
                    {c.isEnrolled ? (
                      <button className="btn sm" disabled={busyId === c.id} onClick={() => handleDrop(c)}>
                        {busyId === c.id ? '...' : 'حذف'}
                      </button>
                    ) : (
                      <button className="btn sm primary" disabled={c.isFull || busyId === c.id} onClick={() => handleRegister(c)}>
                        {busyId === c.id ? '...' : 'افزودن'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {toast && <div className={`toast ${toast.isError ? 'error' : ''}`}>{toast.msg}</div>}
    </div>
  );
}
