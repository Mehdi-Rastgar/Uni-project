import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';

function toman(n) {
  return `${Number(n).toLocaleString('fa-IR')} تومان`;
}

export default function Payment() {
  const { auth } = useAuth();
  const [statement, setStatement] = useState(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [toast, setToast] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const data = await api.getFinancialStatement(auth.token);
      setStatement(data);
      const current = data.semesters.find((s) => s.isCurrent);
      setAmount(current && current.remaining > 0 ? String(current.remaining) : '');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function showToast(msg, isError = false) {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 4000);
  }

  async function handlePay(e) {
    e.preventDefault();
    setPaying(true);
    setReceipt(null);
    try {
      const res = await api.payTuition(auth.token, Number(amount));
      setReceipt(res.payment);
      showToast('پرداخت با موفقیت انجام شد.');
      await load();
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setPaying(false);
    }
  }

  const current = statement?.semesters.find((s) => s.isCurrent);

  if (loading) return <div className="loading">در حال بارگذاری...</div>;

  return (
    <div>
      <div className="topbar">
        <div><h1>پرداخت شهریه</h1><p>{current ? current.semesterName : 'ترم جاری'}</p></div>
        {current && (
          <span className={`badge ${current.status === 'paid' ? 'success' : 'gold'}`}>
            {current.status === 'paid' ? 'تسویه‌شده' : `مانده: ${toman(current.remaining)}`}
          </span>
        )}
      </div>

      {!current ? (
        <div className="panel"><div className="empty-state">شهریه‌ای برای ترم جاری تعریف نشده یا هنوز در درسی ثبت‌نام نکرده‌اید.</div></div>
      ) : (
        <div className="stat-row">
          <div className="stat"><div className="label">مبلغ کل شهریه</div><div className="value">{toman(current.tuitionAmount)}</div></div>
          <div className="stat"><div className="label">پرداخت‌شده</div><div className="value" style={{ color: 'var(--success)' }}>{toman(current.paidAmount)}</div></div>
          <div className="stat"><div className="label">مانده بدهی</div><div className="value gold">{toman(current.remaining)}</div></div>
        </div>
      )}

      {current && current.remaining > 0 && (
        <form className="panel" style={{ padding: 24, maxWidth: 420 }} onSubmit={handlePay}>
          <div className="field">
            <label className="field-label">مبلغ پرداختی (تومان)</label>
            <input
              type="number" min="1" max={current.remaining} required
              value={amount} onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <button className="btn gold block" type="submit" disabled={paying}>
            {paying ? 'در حال پردازش پرداخت...' : 'پرداخت ' + (amount ? toman(amount) : '')}
          </button>
          <p style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 10, marginBottom: 0 }}>
            ⚠️ این پرداخت به‌صورت شبیه‌سازی‌شده است و به درگاه بانکی واقعی متصل نیست — مخصوص محیط دمو/پروژه دانشگاهی.
          </p>
        </form>
      )}

      {receipt && (
        <div className="panel" style={{ padding: 24, marginTop: 20, maxWidth: 420, borderColor: 'var(--success)' }}>
          <div className="section-title" style={{ margin: '0 0 12px', color: 'var(--success)' }}>✅ رسید پرداخت</div>
          <p style={{ margin: '4px 0', fontSize: 13 }}>مبلغ: <b>{toman(receipt.amount)}</b></p>
          <p style={{ margin: '4px 0', fontSize: 13 }}>ترم: {receipt.semesterName}</p>
          <p style={{ margin: '4px 0', fontSize: 13 }}>کد پیگیری: <b style={{ fontFamily: 'monospace' }}>{receipt.referenceCode}</b></p>
        </div>
      )}

      {toast && <div className={`toast ${toast.isError ? 'error' : ''}`}>{toast.msg}</div>}
    </div>
  );
}
