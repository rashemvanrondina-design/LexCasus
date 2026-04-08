import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import ClientLayout from './layouts/ClientLayout';
import AdminLayout from './layouts/AdminLayout';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/client/DashboardPage';
import SchedulePage from './pages/client/SchedulePage';
import PracticeBarPage from './pages/client/PracticeBarPage';
import LegalChatPage from './pages/client/LegalChatPage';
import ECodalsPage from './pages/client/ECodalsPage';
import NotesPage from './pages/client/NotesPage';
import CasesPage from './pages/client/CasesPage';
import BillingPage from './pages/client/BillingPage';
import ProfilePage from './pages/client/ProfilePage';
import DisclaimerPage from './pages/client/DisclaimerPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import ManageQuestionsPage from './pages/admin/ManageQuestionsPage';
import UserManagementPage from './pages/admin/UserManagementPage';
import SubscriptionControlPage from './pages/admin/SubscriptionControlPage';
import ManageCodalsPage from './pages/admin/ManageCodalsPage';
import AdminAnnouncementsPage from './pages/admin/AdminAnnouncementsPage'; 

// --- GUARDS ---

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  // 🟢 THE BAN HAMMER: Safely intercepts deactivated users without causing a redirect loop
  if (user && !user.isActive) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#02040A] text-white p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 mb-6">
          <span className="text-red-500 text-2xl font-bold">!</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight mb-2">Account Suspended</h1>
        <p className="text-white/60 max-w-md">
          Your access to LexCasus has been deactivated. Please contact the administrator to restore your firm privileges.
        </p>
      </div>
    );
  }
  
  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isAdmin } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isAdmin, user } = useAuthStore();
  
  if (isAuthenticated) {
    if (user && !user.isActive) return <Navigate to="/dashboard" replace />;
    return <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />;
  }
  return <>{children}</>;
};

const RootRedirect: React.FC = () => {
  const { isAuthenticated, isAdmin } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />;
};

// --- SINGLE APP COMPONENT ---

const App: React.FC = () => {
  const { initialize, loading } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-navy-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500"></div>
        <p className="ml-4 text-white font-medium">Securing Lex Casus session...</p>
      </div>
    );
  }

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/" element={<RootRedirect />} />

        {/* Client routes */}
        <Route
          element={
            <ProtectedRoute>
              <ClientLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/codals" element={<ECodalsPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/disclaimer" element={<DisclaimerPage />} />
          <Route path="/practice" element={<PracticeBarPage />} />
          <Route path="/chat" element={<LegalChatPage />} />
          <Route path="/cases" element={<CasesPage />} />
        </Route>

        {/* Admin routes */}
        <Route
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/questions" element={<ManageQuestionsPage />} />
          <Route path="/admin/users" element={<UserManagementPage />} />
          <Route path="/admin/subscriptions" element={<SubscriptionControlPage />} />
          <Route path="/admin/codals" element={<ManageCodalsPage />} />
          <Route path="/admin/promos" element={<AdminAnnouncementsPage />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;