import { createContext, useContext, useState } from 'react';
import { api } from '../api';

// این Context اطلاعات کاربر لاگین‌شده (توکن + نام + نقش) رو نگه می‌داره
// و در کل اپ در دسترس می‌ذاره، بدون اینکه لازم باشه از هر کامپوننت به بعدی دستی پاسش بدیم
const AuthContext = createContext(null);

const STORAGE_KEY = 'university_auth';

// وقتی صفحه برای اولین بار باز می‌شه، ببینیم قبلاً یه لاگین ذخیره‌شده توی مرورگر هست یا نه
function loadSavedAuth() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  return JSON.parse(raw);
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(loadSavedAuth());

  async function login(username, password) {
    const data = await api.login(username, password); // اگه رمز اشتباه باشه، اینجا throw می‌شه
    const newAuth = { token: data.token, user: data.user };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newAuth));
    setAuth(newAuth);
    return newAuth;
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setAuth(null);
  }

  const value = { auth, login, logout, isAuthenticated: !!auth };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// یه هوک کوچیک که کار گرفتن اطلاعات auth رو راحت‌تر می‌کنه
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth باید داخل AuthProvider استفاده شود.');
  }
  return ctx;
}
