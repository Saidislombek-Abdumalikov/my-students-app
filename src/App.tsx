import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { GroupsPage } from './pages/GroupsPage';
import { GroupDetailPage } from './pages/GroupDetailPage';
import { StudentsPage } from './pages/StudentsPage';
import { StudentDetailPage } from './pages/StudentDetailPage';
import { AttendancePage } from './pages/AttendancePage';
import { PaymentsPage } from './pages/PaymentsPage';
import { DailyWorkspacePage } from './pages/DailyWorkspacePage';
import { HomeworkCheckPage } from './pages/HomeworkCheckPage';
import { HomeworkAddPage } from './pages/HomeworkAddPage';
import { ScreenshotHubPage } from './pages/ScreenshotHubPage';
import { TestsPage } from './pages/TestsPage';
import { FilesPage } from './pages/FilesPage';
import { ReportsPage } from './pages/ReportsPage';
import { CommunicationsPage } from './pages/CommunicationsPage';
import { TelegramPage } from './pages/TelegramPage';
import { CalendarPage } from './pages/CalendarPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { UsersManagementPage } from './pages/UsersManagementPage';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { seedInitialData } from './db';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner label="Akkount ma'lumotlari tekshirilmoqda..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const AppContent: React.FC = () => {
  useEffect(() => {
    seedInitialData().catch(console.error);
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="groups" element={<GroupsPage />} />
        <Route path="groups/:id" element={<GroupDetailPage />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="students/:id" element={<StudentDetailPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="homework-check" element={<HomeworkCheckPage />} />
        <Route path="homework-add" element={<HomeworkAddPage />} />
        <Route path="screenshots" element={<ScreenshotHubPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="workspace" element={<DailyWorkspacePage />} />
        <Route path="tests" element={<TestsPage />} />
        <Route path="communications" element={<CommunicationsPage />} />
        <Route path="telegram" element={<TelegramPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="users" element={<UsersManagementPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
