import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';

export default function Reports() {
  const { auth } = useAuth();
  const [reportType, setReportType] = useState('capacity');
  const [capacity, setCapacity] = useState(null);
  const [transcriptSummary, setTranscriptSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // بر اساس درصد تکمیل ظرفیت، رنگ مناسب برای میله نمودار رو برمی‌گردونه
  function getBarColor(percent) {
    if (percent >= 100) return 'var(--danger)';
    if (percent >= 80) return 'var(--gold)';
    return 'var(--ink)';
  }

  async function loadReport(type) {
    setLoading(true);
    setError('');
    try {
      if (type === 'capacity') {
        const data = await api.getCapacityReport(auth.token);
        setCapacity(data);
      } else {
        const data = await api.getTranscriptSummary(auth.token);
        setTranscriptSummary(data);
      }
    } catch (err) {
      setError(err.message || 'خطا در دریافت گزارش.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadReport(reportType); }, [reportType]);

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>گزارش‌گیری</h1>
          <p>تولید گزارش‌های آماری ثبت‌نام و کارنامه</p>
        </div>
      </div>

      {error && (
        <div className="panel" style={{ padding: 20, marginBottom: 22, borderColor: 'var(--danger)' }}>
          <p style={{ margin: 0, color: 'var(--danger)', fontSize: 13 }}>⚠️ {error}</p>
        </div>
      )}

      <div className="panel" style={{ padding: '16px 20px', marginBottom: 22, display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 220 }}>
          <label className="field-label">نوع گزارش</label>
          <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
            <option value="capacity">درصد تکمیل ظرفیت دروس</option>
            <option value="transcript">کارنامه کلی دانشجویان (بر اساس نمرات قطعی)</option>
          </select>
        </div>
        <button className="btn primary" onClick={() => loadReport(reportType)} disabled={loading}>
          {loading ? 'در حال دریافت...' : 'به‌روزرسانی گزارش'}
        </button>
      </div>

      {reportType === 'capacity' && capacity && (
        capacity.courses.length === 0 ? (
          <div className="panel"><div className="empty-state">داده‌ای برای نمایش وجود ندارد.</div></div>
        ) : (
          <>
            <div className="stat-row">
              <div className="stat">
                <div className="label">میانگین تکمیل ظرفیت</div>
                <div className="value gold">{capacity.summary.avgPercent}٪</div>
              </div>
              <div className="stat">
                <div className="label">کل ثبت‌نامی‌ها</div>
                <div className="value">{capacity.summary.totalEnrollments}</div>
              </div>
              <div className="stat">
                <div className="label">دروس با ظرفیت پر</div>
                <div className="value">{capacity.summary.fullCourses}</div>
              </div>
            </div>

            <div className="panel" style={{ padding: 24 }}>
              <h3 style={{ fontSize: '14.5px', margin: '0 0 18px' }}>درصد تکمیل ظرفیت به تفکیک درس</h3>
              <div style={{ display: 'flex', gap: 18, alignItems: 'flex-end', height: 160 }}>
                {capacity.courses.map((c) => (
                  <div key={c.code} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{c.percent}٪</div>
                    <div style={{ width: '100%', height: 110, display: 'flex', alignItems: 'flex-end' }}>
                      <div style={{
                        width: '100%',
                        height: `${Math.max(c.percent, 3)}%`,
                        background: getBarColor(c.percent),
                        borderRadius: '6px 6px 0 0',
                      }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{c.code}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )
      )}

      {reportType === 'transcript' && transcriptSummary && (
        transcriptSummary.students.length === 0 ? (
          <div className="panel"><div className="empty-state">هنوز نمره‌ای «قطعی» اعلام نشده — گزارش کارنامه پس از قطعی‌شدن نمرات دروس در دسترس است.</div></div>
        ) : (
          <div className="panel">
            <div className="panel-head"><h3>کارنامه کلی دانشجویان</h3></div>
            <table>
              <thead><tr><th>شماره دانشجویی</th><th>نام دانشجو</th><th>معدل</th></tr></thead>
              <tbody>
                {transcriptSummary.students.map((s) => (
                  <tr key={s.username}>
                    <td>{s.username}</td>
                    <td>{s.fullName}</td>
                    <td><b style={{ color: 'var(--gold-deep)' }}>{s.gpa ?? '—'}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
