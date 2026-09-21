import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';

function toman(n) {
  return `${Number(n).toLocaleString('fa-IR')} تومان`;
}

function formatDate(isoLike) {
  // مقدار ذخیره‌شده در SQLite به‌صورت "YYYY-MM-DD HH:MM:SS" (میلادی) است
  try {
    const d = new Date(isoLike.replace(' ', 'T') + 'Z');
    return d.toLocaleDateString('fa-IR') + ' — ' + d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return isoLike;
  }
}

const STATUS_LABEL = {
  completed: { text: 'موفق', bg: 'var(--success-bg)', color: 'var(--success)' },
  pending: { text: 'در حال بررسی', bg: 'var(--gold-tint)', color: 'var(--gold-deep)' },
  failed: { text: 'ناموفق', bg: 'var(--danger-bg)', color: 'var(--danger)' },
};

export default function PaymentHistory() {
  const { auth } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getPayments(auth.token).then((d) => setPayments(d.payments)).finally(() => setLoading(false));
  }, [auth]);

  if (loading) return <div className="loading">در حال بارگذاری...</div>;

  return (
    <div>
      <div className="topbar">
        <div><h1>لیست پرداخت‌ها</h1><p>تاریخچه کامل پرداخت‌های شهریه شما</p></div>
        <span className="badge gold">{payments.length} تراکنش</span>
      </div>

      {payments.length === 0 ? (
        <div className="panel"><div className="empty-state">هنوز پرداختی ثبت نشده است.</div></div>
      ) : (
        <div className="panel">
          <table>
            <thead><tr><th>تاریخ</th><th>ترم</th><th>مبلغ</th><th>روش پرداخت</th><th>کد پیگیری</th><th>وضعیت</th></tr></thead>
            <tbody>
              {payments.map((p) => {
                const st = STATUS_LABEL[p.status] || STATUS_LABEL.completed;
                return (
                  <tr key={p.id}>
                    <td style={{ fontSize: 12.5 }}>{formatDate(p.paid_at)}</td>
                    <td>{p.semester_name}</td>
                    <td><b>{toman(p.amount)}</b></td>
                    <td style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{p.method}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.reference_code}</td>
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
