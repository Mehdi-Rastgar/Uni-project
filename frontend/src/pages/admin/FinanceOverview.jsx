import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';

function toman(n) {
  return `${Number(n || 0).toLocaleString('fa-IR')} تومان`;
}

const STATUS_LABEL = {
  paid: { text: 'تسویه‌شده', bg: 'var(--success-bg)', color: 'var(--success)' },
  partial: { text: 'پرداخت جزئی', bg: 'var(--gold-tint)', color: 'var(--gold-deep)' },
  unpaid: { text: 'پرداخت‌نشده', bg: 'var(--danger-bg)', color: 'var(--danger)' },
};

const EMPTY = { semester: null, students: [], summary: { totalCollected: 0, fullyPaidCount: 0, totalStudents: 0 } };

export default function FinanceOverview() {
  const { auth } = useAuth();
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    api.getFinanceOverview(auth.token)
      .then((res) => setData(res || EMPTY))
      .catch((err) => setError(err.message || 'خطا در دریافت اطلاعات مالی.'))
      .finally(() => setLoading(false));
  }, [auth]);

  if (loading) return <div className="loading">در حال بارگذاری...</div>;

  return (
    <div>
      <div className="topbar">
        <div><h1>مدیریت مالی</h1><p>{data.semester ? data.semester.name : 'ترم جاری'} · وضعیت پرداخت شهریه دانشجویان</p></div>
      </div>

      {error && (
        <div className="panel" style={{ padding: 20, marginBottom: 20, borderColor: 'var(--danger)' }}>
          <p style={{ margin: 0, color: 'var(--danger)', fontSize: 13 }}>⚠️ {error}</p>
        </div>
      )}

      {!data.semester ? (
        <div className="panel"><div className="empty-state">ترم جاری تعریف نشده است.</div></div>
      ) : (
        <>
          <div className="stat-row">
            <div className="stat"><div className="label">مجموع دریافتی</div><div className="value gold">{toman(data.summary.totalCollected)}</div></div>
            <div className="stat"><div className="label">دانشجویان تسویه‌شده</div><div className="value">{data.summary.fullyPaidCount} / {data.summary.totalStudents}</div></div>
            <div className="stat"><div className="label">شهریه هر نفر</div><div className="value">{toman(data.semester.tuition_amount)}</div></div>
          </div>

          <div className="panel">
            <div className="panel-head"><h3>وضعیت پرداخت دانشجویان</h3></div>
            {data.students.length === 0 ? (
              <div className="empty-state">دانشجویی در این ترم ثبت‌نام نکرده است.</div>
            ) : (
              <table>
                <thead><tr><th>شماره دانشجویی</th><th>نام دانشجو</th><th>پرداخت‌شده</th><th>مانده</th><th>وضعیت</th></tr></thead>
                <tbody>
                  {data.students.map((s) => {
                    const st = STATUS_LABEL[s.status] || STATUS_LABEL.unpaid;
                    return (
                      <tr key={s.id}>
                        <td>{s.username}</td>
                        <td>{s.full_name}</td>
                        <td>{toman(s.paid)}</td>
                        <td>{toman(s.remaining)}</td>
                        <td><span className="pill" style={{ background: st.bg, color: st.color }}>{st.text}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
