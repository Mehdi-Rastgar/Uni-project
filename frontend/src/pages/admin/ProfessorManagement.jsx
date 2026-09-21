import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';

const EMPTY_FORM = { fullName: '', employeeNumber: '', rank: 'استادیار', username: '', password: '' };

export default function ProfessorManagement() {
  const { auth } = useAuth();
  const [professors, setProfessors] = useState([]);
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [assignPick, setAssignPick] = useState({}); // professorId -> courseId
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [profRes, courseRes] = await Promise.all([
        api.getAdminProfessors(auth.token),
        api.getAdminCourses(auth.token),
      ]);
      setProfessors(profRes.professors);
      setCourses(courseRes.courses);
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
    setSaving(true);
    try {
      await api.createProfessor(auth.token, form);
      showToast(`استاد «${form.fullName}» با موفقیت افزوده شد.`);
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setSaving(false);
    }
  }

  async function handleAssign(profId) {
    const courseId = assignPick[profId];
    if (!courseId) return showToast('ابتدا یک درس انتخاب کنید.', true);
    try {
      await api.assignCourse(auth.token, profId, courseId);
      showToast('درس با موفقیت تخصیص داده شد.');
      await load();
    } catch (err) {
      showToast(err.message, true);
    }
  }

  return (
    <div>
      <div className="topbar">
        <div><h1>مدیریت اساتید</h1><p>افزودن، مشاهده و تخصیص درس به اساتید</p></div>
      </div>

      <form className="panel" style={{ padding: 20, marginBottom: 22 }} onSubmit={handleAdd}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
          <div className="field">
            <label className="field-label">نام استاد</label>
            <input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="مثال: دکتر کریمی" />
          </div>
          <div className="field">
            <label className="field-label">کد پرسنلی</label>
            <input required value={form.employeeNumber} onChange={(e) => setForm({ ...form, employeeNumber: e.target.value })} placeholder="مثال: P-1042" />
          </div>
          <div className="field">
            <label className="field-label">مرتبه علمی</label>
            <select value={form.rank} onChange={(e) => setForm({ ...form, rank: e.target.value })}>
              <option>مربی</option><option>استادیار</option><option>دانشیار</option><option>استاد</option>
            </select>
          </div>
          <div className="field">
            <label className="field-label">نام کاربری (برای ورود)</label>
            <input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="معمولاً همان کد پرسنلی" />
          </div>
          <div className="field">
            <label className="field-label">رمز عبور اولیه</label>
            <input required type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="رمز عبور موقت" />
          </div>
        </div>
        <button className="btn gold" type="submit" disabled={saving}>{saving ? 'در حال ثبت...' : 'افزودن استاد'}</button>
      </form>

      <div className="panel">
        <div className="panel-head"><h3>فهرست اساتید ({professors.length} نفر)</h3></div>
        {loading ? <div className="empty-state">در حال بارگذاری...</div> : (
          <table>
            <thead><tr><th>نام استاد</th><th>کد پرسنلی</th><th>مرتبه</th><th>دروس تخصیص‌یافته</th><th>تخصیص درس جدید</th></tr></thead>
            <tbody>
              {professors.map((p) => (
                <tr key={p.id}>
                  <td>{p.full_name}</td>
                  <td>{p.employee_number}</td>
                  <td>{p.rank}</td>
                  <td>{p.courses.length > 0 ? p.courses.map((c) => c.title).join('، ') : '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <select
                        style={{ width: 140 }}
                        value={assignPick[p.id] || ''}
                        onChange={(e) => setAssignPick({ ...assignPick, [p.id]: e.target.value })}
                      >
                        <option value="">انتخاب درس...</option>
                        {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                      </select>
                      <button className="btn sm" onClick={() => handleAssign(p.id)}>تخصیص</button>
                    </div>
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
