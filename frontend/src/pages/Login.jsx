import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="seal">د</div>
        <h2>ورود به سیستم آموزشی</h2>
        <p className="sub">سیستم آموزشی جامع دانشگاه</p>

        {error && <div className="error">{error}</div>}

        <div className="field">
          <label className="field-label">شماره دانشجویی / پرسنلی</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="مثال: 40012345"
            required
          />
        </div>
        <div className="field">
          <label className="field-label">رمز عبور</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>

        <button className="btn gold block" type="submit" disabled={loading}>
          {loading ? 'در حال ورود...' : 'ورود ←'}
        </button>

        <div className="hint">
          حساب‌های نمونه برای تست:<br />
          دانشجو: <b>40012345</b> / student123<br />
          استاد: <b>P-1042</b> / prof123<br />
          ادمین: <b>admin</b> / admin123
        </div>
      </form>
    </div>
  );
}
