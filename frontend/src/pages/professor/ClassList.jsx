import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';

export default function ClassList() {
  const { auth } = useAuth();
  const [courses, setCourses] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getProfessorCourses(auth.token).then((d) => {
      setCourses(d.courses);
      if (d.courses.length > 0) setSelectedId(String(d.courses[0].id));
    }).finally(() => setLoading(false));
  }, [auth]);

  useEffect(() => {
    if (!selectedId) return;
    api.getClassList(auth.token, selectedId).then(setData);
  }, [selectedId, auth]);

  if (loading) return <div className="loading">در حال بارگذاری...</div>;
  if (courses.length === 0) return (
    <div><div className="topbar"><div><h1>لیست کلاسی</h1></div></div>
      <div className="panel"><div className="empty-state">درسی به شما تخصیص داده نشده است.</div></div>
    </div>
  );

  const selectedCourse = courses.find((c) => String(c.id) === selectedId);

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>لیست کلاسی</h1>
          <p>{auth.user.fullName} {selectedCourse ? `· درس ${selectedCourse.title} (${selectedCourse.code})` : ''}</p>
        </div>
        {data && <span className="badge gold">{data.students.length} دانشجو</span>}
      </div>

      <div className="field" style={{ maxWidth: 300 }}>
        <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.title} — {c.code}</option>
          ))}
        </select>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>دانشجویان ثبت‌نامی</h3></div>
        {!data || data.students.length === 0 ? (
          <div className="empty-state">لیست خالی است — هیچ دانشجویی در این درس ثبت‌نام نکرده است.</div>
        ) : (
          <table>
            <thead><tr><th>شماره دانشجویی</th><th>نام دانشجو</th><th>وضعیت</th></tr></thead>
            <tbody>
              {data.students.map((s) => (
                <tr key={s.id}>
                  <td>{s.username}</td>
                  <td>{s.full_name}</td>
                  <td><span className="pill" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>ثبت‌نام‌شده</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
