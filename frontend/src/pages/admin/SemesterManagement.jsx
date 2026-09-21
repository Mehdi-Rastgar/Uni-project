import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';

function toman(n) {
  return `${Number(n || 0).toLocaleString('fa-IR')} تومان`;
}

export default function SemesterManagement() {
  const { auth } = useAuth();
  const [semesters, setSemesters] = useState([]);
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '', setCurrent: false, tuitionAmount: '' });
  const [tuitionEdits, setTuitionEdits] = useState({}); // semesterId -> string
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingTuitionId, setSavingTuitionId] = useState(null);
  const [toast, setToast] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const d = await api.getSemesters(auth.token);
      setSemesters(d.semesters);
      const edits = {};
      d.semesters.forEach((s) => { edits[s.id] = String(s.tuition_amount ?? 0); });
      setTuitionEdits(edits);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function showToast(msg, isError = false) {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 4000);
  }

  const hasActive = semesters.some((s) => s.is_current);

  async function handleSubmit(e) {
    e.preventDefault();
    if (hasActive && form.setCurrent) {
      const ok = confirm('یک ترم فعال دیگر وجود دارد. با ثبت این ترم به‌عنوان «جاری»، ترم قبلی غیرفعال می‌شود. ادامه می‌دهید؟');
      if (!ok) return;
    }
    setSaving(true);
    try {
      await api.createSemester(auth.token, { ...form, tuitionAmount: Number(form.tuitionAmount) || 0 });
      showToast(`ترم «${form.name}» با موفقیت ثبت شد.`);
      setForm({ name: '', startDate: '', endDate: '', setCurrent: false, tuitionAmount: '' });
      await load();
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setSaving(false);
    }
  }

  async function toggleRegistration(sem) {
    try {
      await api.setRegistrationOpen(auth.token, sem.id, !sem.registration_open);
      await load();
    } catch (err) {
      showToast(err.message, true);
    }
  }

  async function saveTuition(sem) {
    setSavingTuitionId(sem.id);
    try {
      await api.setTuitionAmount(auth.token, sem.id, Number(tuitionEdits[sem.id]) || 0);
      showToast(`شهریه «${sem.name}» به‌روزرسانی شد.`);
      await load();
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setSavingTuitionId(null);
    }
  }

  return (
    <div>
      <div className="topbar">
        <div><h1>مدیریت ترم تحصیلی</h1><p>تعریف و مدیریت نیمسال‌های تحصیلی دانشگاه و مبلغ شهریه هرکدام</p></div>
      </div>

      <form className="panel" style={{ padding: 20, marginBottom: 22 }} onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          <div className="field">
            <label className="field-label">نام ترم</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="نیمسال اول ۱۴۰۵-۱۴۰۴" />
          </div>
          <div className="field">
            <label className="field-label">تاریخ شروع</label>
            <input required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} placeholder="1404/06/15" />
          </div>
          <div className="field">
            <label className="field-label">تاریخ پایان</label>
            <input required value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} placeholder="1404/10/20" />
          </div>
          <div className="field">
            <label className="field-label">مبلغ شهریه (تومان)</label>
            <input type="number" min="0" value={form.tuitionAmount} onChange={(e) => setForm({ ...form, tuitionAmount: e.target.value })} placeholder="مثال: 12000000" />
          </div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 16, cursor: 'pointer' }}>
          <input type="checkbox" style={{ width: 'auto' }} checked={form.setCurrent} onChange={(e) => setForm({ ...form, setCurrent: e.target.checked })} />
          این ترم به‌عنوان ترم «جاری» و بازِ ثبت‌نام تنظیم شود
        </label>
        <button className="btn gold" type="submit" disabled={saving}>{saving ? 'در حال ثبت...' : 'ثبت ترم جدید'}</button>
      </form>

      <div className="panel">
        <div className="panel-head"><h3>ترم‌های تعریف‌شده</h3></div>
        {loading ? <div className="empty-state">در حال بارگذاری...</div> : (
          <table>
            <thead><tr><th>نام ترم</th><th>بازه زمانی</th><th>وضعیت</th><th>ثبت‌نام</th><th>شهریه (تومان)</th></tr></thead>
            <tbody>
              {semesters.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{s.start_date} تا {s.end_date}</td>
                  <td>
                    {s.is_current
                      ? <span className="pill" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>جاری</span>
                      : <span className="pill" style={{ background: 'var(--ink-tint)', color: 'var(--text-3)' }}>غیرفعال</span>}
                  </td>
                  <td>
                    {s.is_current ? (
                      <button className="btn sm" onClick={() => toggleRegistration(s)}>
                        {s.registration_open ? 'بستن ثبت‌نام' : 'بازکردن ثبت‌نام'}
                      </button>
                    ) : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        type="number" min="0" style={{ width: 130 }}
                        value={tuitionEdits[s.id] ?? ''}
                        onChange={(e) => setTuitionEdits((prev) => ({ ...prev, [s.id]: e.target.value }))}
                      />
                      <button className="btn sm" disabled={savingTuitionId === s.id} onClick={() => saveTuition(s)}>
                        {savingTuitionId === s.id ? '...' : 'ثبت'}
                      </button>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>فعلی: {toman(s.tuition_amount)}</div>
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
