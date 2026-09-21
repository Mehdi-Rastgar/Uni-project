import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

const EMPTY = { semesters: [], gpa: null, totalCredits: 0 };

export default function Transcript() {
  const { auth } = useAuth();
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    api.getTranscript(auth.token)
      .then((res) => setData(res || EMPTY))
      .catch((err) => setError(err.message || 'خطا در دریافت کارنامه.'))
      .finally(() => setLoading(false));
  }, [auth]);

  if (loading) return <div className="loading">در حال بارگذاری کارنامه...</div>;

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>کارنامه و نمرات</h1>
          <p>{auth.user.fullName} · شماره دانشجویی {auth.user.username}</p>
        </div>
        {data.gpa != null && <span className="badge gold">معدل کل: {data.gpa}</span>}
      </div>

      {error && (
        <div className="panel" style={{ padding: 20, marginBottom: 20, borderColor: 'var(--danger)' }}>
          <p style={{ margin: 0, color: 'var(--danger)', fontSize: 13 }}>⚠️ {error}</p>
        </div>
      )}

      {data.semesters.length === 0 ? (
        <div className="panel"><div className="empty-state">هنوز درسی ثبت‌نام نشده است.</div></div>
      ) : (
        data.semesters.map((sem) => (
          <div key={sem.semesterName} style={{ marginBottom: 26 }}>
            <div className="section-title">{sem.semesterName}{sem.isCurrent ? ' (جاری)' : ''}</div>
            <div className="panel">
              <table>
                <thead><tr><th>کد درس</th><th>نام درس</th><th>واحد</th><th>نمره</th></tr></thead>
                <tbody>
                  {sem.courses.map((c) => (
                    <tr key={c.code}>
                      <td>{c.code}</td>
                      <td>{c.title}</td>
                      <td>{c.credits}</td>
                      <td>
                        {c.isFinal && c.score != null ? (
                          <b style={{ color: 'var(--gold-deep)' }}>{c.score.toFixed(2)}</b>
                        ) : (
                          <span className="pill" style={{ background: 'var(--ink-tint)', color: 'var(--ink)' }}>در انتظار ثبت</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
