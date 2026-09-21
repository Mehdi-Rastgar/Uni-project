import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

const DAYS = ['شنبه', 'یک‌شنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه'];
const HOURS = ['08:00', '10:00', '13:00', '15:00']; // شروع بازه‌های ۲ ساعته

export default function Schedule() {
  const { auth } = useAuth();
  const [items, setItems] = useState([]);
  const [semester, setSemester] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getSchedule(auth.token)
      .then((d) => {
        setItems(d.items);
        setSemester(d.semester);
      })
      .finally(() => setLoading(false));
  }, [auth]);

  // برای یه روز و ساعت مشخص، می‌گرده ببینه آیا دانشجو درسی توی اون خونه از برنامه داره یا نه
  function findItem(day, hour) {
    for (const item of items) {
      if (item.day_of_week === day && item.start_time === hour) {
        return item;
      }
    }
    return null;
  }

  if (loading) {
    return <div className="loading">در حال بارگذاری برنامه...</div>;
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>برنامه هفتگی</h1>
          <p>بر اساس دروس ثبت‌نامی {semester ? semester.name : ''}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="panel">
          <div className="empty-state">برنامه‌ای برای نمایش وجود ندارد — هنوز در درسی ثبت‌نام نکرده‌اید.</div>
        </div>
      ) : (
        <div className="panel" style={{ padding: 20 }}>
          <table>
            <thead>
              <tr>
                <th></th>
                {DAYS.map((day) => (
                  <th key={day} style={{ textAlign: 'center' }}>{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HOURS.map((hour) => (
                <tr key={hour}>
                  <td style={{ color: 'var(--text-3)', fontSize: 12 }}>{hour}</td>
                  {DAYS.map((day) => {
                    const item = findItem(day, hour);
                    return (
                      <td key={day + hour} style={{ textAlign: 'center' }}>
                        {item ? (
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{item.title}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{item.room}</div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--border)' }}>—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
