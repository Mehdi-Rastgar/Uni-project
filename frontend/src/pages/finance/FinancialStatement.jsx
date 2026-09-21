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

// مقدار پیش‌فرض امن — تا وقتی پاسخ سرور نرسیده یا با خطا مواجه شده،
// صفحه به‌جای کرش‌کردن، حالت خالی/امن نشان می‌دهد.
const EMPTY_STATEMENT = { semesters: [], totalDue: 0, totalPaid: 0, totalRemaining: 0 };

export default function FinancialStatement() {
  const { auth } = useAuth();
  const [data, setData] = useState(EMPTY_STATEMENT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    api.getFinancialStatement(auth.token)
      .then((res) => setData(res || EMPTY_STATEMENT))
      .catch((err) => setError(err.message || 'خطا در دریافت کارنامه مالی.'))
      .finally(() => setLoading(false));
  }, [auth]);

  if (loading) return <div className="loading">در حال بارگذاری کارنامه مالی...</div>;

  return (
    <div>
      <div className="topbar">
        <div><h1>کارنامه مالی</h1><p>{auth.user.fullName} · شماره دانشجویی {auth.user.username}</p></div>
        {data.totalRemaining > 0
          ? <span className="badge danger">مانده کل: {toman(data.totalRemaining)}</span>
          : <span className="badge success">بدون بدهی</span>}
      </div>

      {error && (
        <div className="panel" style={{ padding: 20, marginBottom: 20, borderColor: 'var(--danger)' }}>
          <p style={{ margin: 0, color: 'var(--danger)', fontSize: 13 }}>
            ⚠️ {error}
          </p>
        </div>
      )}

      <div className="stat-row">
        <div className="stat"><div className="label">مجموع شهریه</div><div className="value">{toman(data.totalDue)}</div></div>
        <div className="stat"><div className="label">مجموع پرداختی</div><div className="value" style={{ color: 'var(--success)' }}>{toman(data.totalPaid)}</div></div>
        <div className="stat"><div className="label">مانده کل</div><div className="value gold">{toman(data.totalRemaining)}</div></div>
      </div>

      {data.semesters.length === 0 ? (
        <div className="panel"><div className="empty-state">هنوز رکورد مالی‌ای ثبت نشده است.</div></div>
      ) : (
        <div className="panel">
          <table>
            <thead><tr><th>ترم</th><th>مبلغ شهریه</th><th>پرداخت‌شده</th><th>مانده</th><th>وضعیت</th></tr></thead>
            <tbody>
              {data.semesters.map((s) => {
                const st = STATUS_LABEL[s.status] || STATUS_LABEL.unpaid;
                return (
                  <tr key={s.semesterId}>
                    <td>{s.semesterName}{s.isCurrent ? ' (جاری)' : ''}</td>
                    <td>{toman(s.tuitionAmount)}</td>
                    <td>{toman(s.paidAmount)}</td>
                    <td>{toman(s.remaining)}</td>
                    <td><span className="pill" style={{ background: st.bg, color: st.color }}>{st.text}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
