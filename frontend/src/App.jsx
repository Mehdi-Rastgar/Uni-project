import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RegisterCourses from './pages/RegisterCourses';
import Schedule from './pages/Schedule';
import Transcript from './pages/Transcript';

import ClassList from './pages/professor/ClassList';
import GradeEntry from './pages/professor/GradeEntry';

import CourseManagement from './pages/admin/CourseManagement';
import SemesterManagement from './pages/admin/SemesterManagement';
import ProfessorManagement from './pages/admin/ProfessorManagement';
import Reports from './pages/admin/Reports';
import FinanceOverview from './pages/admin/FinanceOverview';

import Payment from './pages/finance/Payment';
import FinancialStatement from './pages/finance/FinancialStatement';
import PaymentHistory from './pages/finance/PaymentHistory';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

          {/* دانشجو — آموزشی */}
          <Route path="/register" element={<ProtectedRoute><RegisterCourses /></ProtectedRoute>} />
          <Route path="/schedule" element={<ProtectedRoute><Schedule /></ProtectedRoute>} />
          <Route path="/transcript" element={<ProtectedRoute><Transcript /></ProtectedRoute>} />

          {/* دانشجو — مالی */}
          <Route path="/payment" element={<ProtectedRoute><Payment /></ProtectedRoute>} />
          <Route path="/financial-statement" element={<ProtectedRoute><FinancialStatement /></ProtectedRoute>} />
          <Route path="/payment-history" element={<ProtectedRoute><PaymentHistory /></ProtectedRoute>} />

          {/* استاد */}
          <Route path="/classlist" element={<ProtectedRoute><ClassList /></ProtectedRoute>} />
          <Route path="/grades" element={<ProtectedRoute><GradeEntry /></ProtectedRoute>} />

          {/* ادمین */}
          <Route path="/admin/courses" element={<ProtectedRoute><CourseManagement /></ProtectedRoute>} />
          <Route path="/admin/semesters" element={<ProtectedRoute><SemesterManagement /></ProtectedRoute>} />
          <Route path="/admin/professors" element={<ProtectedRoute><ProfessorManagement /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          <Route path="/admin/finance" element={<ProtectedRoute><FinanceOverview /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
