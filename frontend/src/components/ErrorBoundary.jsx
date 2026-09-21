import { Component } from 'react';

// اگر هر کامپوننتی داخل اپ یک خطای غیرمنتظره در حین رندر پرتاب کند،
// به‌جای اینکه کل صفحه سفید/خالی شود (رفتار پیش‌فرض React)،
// این کامپوننت خطا را می‌گیرد و یک پیام قابل‌فهم + دکمه تلاش دوباره نشان می‌دهد.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // برای دیباگ توسعه‌دهنده — در کنسول مرورگر (F12) قابل مشاهده است
    console.error('خطای غیرمنتظره در رابط کاربری:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: 'center', fontFamily: 'Tahoma, sans-serif', direction: 'rtl' }}>
          <h2 style={{ color: '#A13B32' }}>⚠️ خطایی در نمایش این صفحه رخ داد</h2>
          <p style={{ color: '#5B6472', maxWidth: 480, margin: '12px auto' }}>
            {this.state.error?.message || 'خطای ناشناخته‌ای رخ داده است.'}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/'; }}
            style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#1B2A4A', color: '#fff', cursor: 'pointer', fontSize: 14 }}
          >
            بازگشت به داشبورد
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
