import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';

export default function GradeEntry() {
  const { auth } = useAuth();
  const [courses, setCourses] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [data, setData] = useState(null);
  const [scores, setScores] = useState({}); // enrollmentId -> string
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    api.getProfessorCourses(auth.token).then((d) => {
      setCourses(d.courses);
      if (d.courses.length > 0) setSelectedId(String(d.courses[0].id));
    }).finally(() => setLoading(false));
  }, [auth]);

  useEffect(() => {
    if (!selectedId) return;
    api.getGradeSheet(auth.token, selectedId).then((d) => {
      setData(d);
      const initial = {};
      d.students.forEach((s) => { initial[s.enrollment_id] = s.score != null ? String(s.score) : ''; });
      setScores(initial);
    });
  }, [selectedId, auth]);

  function showToast(msg, isError = false) {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleSubmit() {
    setSaving(true);
    try {
      const payload = Object.entries(scores).map(([enrollmentId, score]) => ({ enrollmentId: Number(enrollmentId), score }));
      await api.submitGrades(auth.token, selectedId, payload);
      showToast('نمرات با موفقیت ثبت شدند.');
      const refreshed = await api.getGradeSheet(auth.token, selectedId);
      setData(refreshed);
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="loading">در حال بارگذاری...</div>;
  if (courses.length === 0) return (
    <div><div className="topbar"><div><h1>ثبت نمره</h1></div></div>
      <div className="panel"><div className="empty-state">درسی به شما تخصیص داده نشده است.</div></div>
    </div>
  );

  const selectedCourse = courses.find((c) => String(c.id) === selectedId);
  const isLocked = selectedCourse?.grades_finalized;

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>ثبت نمره</h1>
          <p>{auth.user.fullName} {selectedCourse ? `· درس ${selectedCourse.title} (${selectedCourse.code})` : ''}</p>
        </div>
        {isLocked && <span className="badge danger">نمرات قطعی شده — غیرقابل‌ویرایش</span>}
      </div>

      <div className="field" style={{ maxWidth: 300 }}>
        <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.title} — {c.code} {c.grades_finalized ? '(قطعی)' : ''}</option>
          ))}
        </select>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3>فهرست دانشجویان ({data?.students.length ?? 0} نفر)</h3>
          <button className="btn gold sm" disabled={isLocked || saving} onClick={handleSubmit}>
            {saving ? 'در حال ثبت...' : 'ثبت نهایی نمرات'}
          </button>
        </div>
        {!data || data.students.length === 0 ? (
          <div className="empty-state">دانشجویی برای ثبت نمره یافت نشد.</div>
        ) : (
          <table>
            <thead><tr><th>شماره دانشجویی</th><th>نام دانشجو</th><th>نمره (از ۲۰)</th></tr></thead>
            <tbody>
              {data.students.map((s) => (
                <tr key={s.enrollment_id}>
                  <td>{s.username}</td>
                  <td>{s.full_name}</td>
                  <td>
                    <input
                      type="number" min="0" max="20" step="0.25"
                      style={{ width: 90, textAlign: 'center' }}
                      value={scores[s.enrollment_id] ?? ''}
                      disabled={isLocked}
                      onChange={(e) => setScores((prev) => ({ ...prev, [s.enrollment_id]: e.target.value }))}
                      placeholder="—"
                    />
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
