import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';

const DAYS = ['شنبه', 'یک‌شنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه'];
const EMPTY_FORM = { code: '', title: '', credits: 3, capacity: 30, professorId: '', dayOfWeek: DAYS[0], startTime: '08:00', endTime: '10:00', room: '' };

export default function CourseManagement() {
  const { auth } = useAuth();
  const [courses, setCourses] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [semester, setSemester] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [semRes, courseRes, profRes] = await Promise.all([
        api.getSemesters(auth.token),
        api.getAdminCourses(auth.token),
        api.getAdminProfessors(auth.token),
      ]);
      const current = semRes.semesters.find((s) => s.is_current);
      setSemester(current);
      setCourses(courseRes.courses);
      setProfessors(profRes.professors);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function showToast(msg, isError = false) {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!semester) return showToast('ابتدا یک ترم جاری تعریف کنید.', true);
    setSaving(true);
    try {
      await api.createCourse(auth.token, { ...form, semesterId: semester.id, professorId: form.professorId || null });
      showToast(`درس «${form.title}» با موفقیت افزوده شد.`);
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setSaving(false);
    }
  }

  async function handleFinalize(course) {
    if (!confirm(`آیا از قطعی‌کردن نمرات درس «${course.title}» مطمئن هستید؟ پس از این کار، استاد دیگر نمی‌تواند نمرات را ویرایش کند.`)) return;
    try {
      await api.finalizeGrades(auth.token, course.id);
      showToast(`نمرات «${course.title}» قطعی اعلام شد.`);
      await load();
    } catch (err) {
      showToast(err.message, true);
    }
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>مدیریت دروس</h1>
          <p>تعریف و ویرایش دروس ارائه‌شده در {semester ? semester.name : 'ترم جاری'}</p>
        </div>
      </div>

      <form className="panel" style={{ padding: 20, marginBottom: 22 }} onSubmit={handleAdd}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
          <div className="field">
            <label className="field-label">کد درس</label>
            <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="مثال: CS310" />
          </div>
          <div className="field">
            <label className="field-label">عنوان درس</label>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثال: مهندسی نرم‌افزار" />
          </div>
          <div className="field">
            <label className="field-label">تعداد واحد</label>
            <input required type="number" min="1" max="4" value={form.credits} onChange={(e) => setForm({ ...form, credits: Number(e.target.value) })} />
          </div>
          <div className="field">
            <label className="field-label">ظرفیت کلاس</label>
            <input required type="number" min="1" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} />
          </div>
          <div className="field">
            <label className="field-label">استاد</label>
            <select value={form.professorId} onChange={(e) => setForm({ ...form, professorId: e.target.value })}>
              <option value="">— بدون استاد —</option>
              {professors.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="field-label">روز برگزاری</label>
            <select value={form.dayOfWeek} onChange={(e) => setForm({ ...form, dayOfWeek: e.target.value })}>
              {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="field-label">ساعت شروع</label>
            <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
          </div>
          <div className="field">
            <label className="field-label">ساعت پایان</label>
            <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
          </div>
          <div className="field">
            <label className="field-label">مکان کلاس</label>
            <input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="مثال: کلاس ۲۰۱" />
          </div>
        </div>
        <button className="btn gold" type="submit" disabled={saving}>{saving ? 'در حال ثبت...' : 'افزودن درس جدید'}</button>
      </form>

      <div className="panel">
        <div className="panel-head"><h3>دروس ترم جاری ({courses.length} درس)</h3></div>
        {loading ? <div className="empty-state">در حال بارگذاری...</div> : courses.length === 0 ? (
          <div className="empty-state">هنوز درسی تعریف نشده است.</div>
        ) : (
          <table>
            <thead><tr><th>کد</th><th>عنوان درس</th><th>استاد</th><th>واحد</th><th>ظرفیت</th><th>زمان</th><th>نمرات</th><th></th></tr></thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.id}>
                  <td>{c.code}</td>
                  <td>{c.title}</td>
                  <td>{c.professor_name || '—'}</td>
                  <td>{c.credits}</td>
                  <td>{c.enrolled_count}/{c.capacity}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{c.day_of_week} {c.start_time}-{c.end_time}</td>
                  <td>
                    {c.grades_finalized
                      ? <span className="pill" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>قطعی</span>
                      : <span className="pill" style={{ background: 'var(--ink-tint)', color: 'var(--ink)' }}>موقت</span>}
                  </td>
                  <td>
                    {!c.grades_finalized && (
                      <button className="btn sm" onClick={() => handleFinalize(c)}>قطعی‌کردن نمرات</button>
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
