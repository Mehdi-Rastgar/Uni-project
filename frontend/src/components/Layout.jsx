import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_BY_ROLE = {
  student: [
    { to: '/', label: 'داشبورد', end: true },
    { to: '/register', label: 'ثبت‌نام دروس' },
    { to: '/schedule', label: 'برنامه هفتگی' },
    { to: '/transcript', label: 'کارنامه من' },
    { to: '/payment', label: 'پرداخت شهریه' },
    { to: '/financial-statement', label: 'کارنامه مالی' },
    { to: '/payment-history', label: 'لیست پرداخت‌ها' },
  ],
  professor: [
    { to: '/', label: 'داشبورد', end: true },
    { to: '/classlist', label: 'لیست کلاسی' },
    { to: '/grades', label: 'ثبت نمره' },
  ],
  admin: [
    { to: '/', label: 'داشبورد', end: true },
    { to: '/admin/courses', label: 'مدیریت دروس' },
    { to: '/admin/semesters', label: 'مدیریت ترم' },
    { to: '/admin/professors', label: 'مدیریت اساتید' },
    { to: '/admin/reports', label: 'گزارش‌گیری' },
    { to: '/admin/finance', label: 'مدیریت مالی' },
  ],
};

export default function Layout({ children }) {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const items = NAV_BY_ROLE[auth.user.role] || [];

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="seal">د</div>
          <div className="brand-text">سیستم آموزشی<span>دانشگاه</span></div>
        </div>
        <nav className="nav">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? 'active' : '')}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="user-chip">
            <div className="avatar">{auth.user.fullName?.[0] || '?'}</div>
            <div>
              <div className="name">{auth.user.fullName}</div>
              <div className="role">{roleLabel(auth.user.role)}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>خروج از حساب ←</button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

function roleLabel(role) {
  return { student: 'دانشجو', professor: 'استاد', admin: 'کارشناس آموزش' }[role] || role;
}
