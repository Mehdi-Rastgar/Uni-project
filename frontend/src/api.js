const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// یک wrapper ساده روی fetch که توکن را خودکار اضافه می‌کند و خطاها را یکدست برمی‌گرداند
async function request(path, options = {}) {
  const method = options.method || 'GET';
  const body = options.body;
  const token = options.token;

  // هدرهای پایه رو می‌سازیم، اگه توکن داشتیم اضافه‌ش می‌کنیم
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = 'Bearer ' + token;
  }

  const res = await fetch(BASE_URL + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = {};
  try {
    data = await res.json();
  } catch (err) {
    // بدنه پاسخ خالی بود یا JSON نبود، مشکلی نیست
  }

  if (!res.ok) {
    throw new Error(data.error || `خطای ناشناخته (${res.status})`);
  }
  return data;
}

export const api = {
  login: (username, password) => request('/auth/login', { method: 'POST', body: { username, password } }),
  me: (token) => request('/auth/me', { token }),

  getCourses: (token) => request('/courses', { token }),
  register: (token, courseId) => request('/enrollments', { method: 'POST', body: { courseId }, token }),
  drop: (token, enrollmentId) => request(`/enrollments/${enrollmentId}`, { method: 'DELETE', token }),

  getSchedule: (token) => request('/schedule/me', { token }),
  getTranscript: (token) => request('/transcript/me', { token }),

  // ---- استاد ----
  getProfessorCourses: (token) => request('/professor/courses', { token }),
  getClassList: (token, courseId) => request(`/professor/courses/${courseId}/students`, { token }),
  getGradeSheet: (token, courseId) => request(`/professor/courses/${courseId}/grades`, { token }),
  submitGrades: (token, courseId, grades) => request(`/professor/courses/${courseId}/grades`, { method: 'PUT', body: { grades }, token }),

  // ---- ادمین: دروس ----
  getAdminCourses: (token, semesterId) => request(`/admin/courses${semesterId ? `?semesterId=${semesterId}` : ''}`, { token }),
  createCourse: (token, course) => request('/admin/courses', { method: 'POST', body: course, token }),
  updateCourse: (token, id, course) => request(`/admin/courses/${id}`, { method: 'PUT', body: course, token }),
  finalizeGrades: (token, courseId) => request(`/admin/courses/${courseId}/finalize-grades`, { method: 'PUT', token }),

  // ---- ادمین: ترم‌ها ----
  getSemesters: (token) => request('/admin/semesters', { token }),
  createSemester: (token, semester) => request('/admin/semesters', { method: 'POST', body: semester, token }),
  setRegistrationOpen: (token, semesterId, open) => request(`/admin/semesters/${semesterId}/registration`, { method: 'PUT', body: { open }, token }),

  // ---- ادمین: اساتید ----
  getAdminProfessors: (token) => request('/admin/professors', { token }),
  createProfessor: (token, professor) => request('/admin/professors', { method: 'POST', body: professor, token }),
  assignCourse: (token, professorId, courseId) => request(`/admin/professors/${professorId}/assign`, { method: 'POST', body: { courseId }, token }),

  // ---- ادمین: گزارش‌گیری ----
  getCapacityReport: (token, semesterId) => request(`/admin/reports/capacity${semesterId ? `?semesterId=${semesterId}` : ''}`, { token }),
  getTranscriptSummary: (token, semesterId) => request(`/admin/reports/transcript-summary${semesterId ? `?semesterId=${semesterId}` : ''}`, { token }),

  // ---- دانشجو: مدیریت مالی ----
  getFinancialStatement: (token) => request('/finance/statement', { token }),
  getPayments: (token) => request('/finance/payments', { token }),
  payTuition: (token, amount) => request('/finance/pay', { method: 'POST', body: { amount }, token }),

  // ---- ادمین: مدیریت مالی ----
  setTuitionAmount: (token, semesterId, amount) => request(`/admin/semesters/${semesterId}/tuition`, { method: 'PUT', body: { amount }, token }),
  getFinanceOverview: (token, semesterId) => request(`/admin/finance/overview${semesterId ? `?semesterId=${semesterId}` : ''}`, { token }),
};
