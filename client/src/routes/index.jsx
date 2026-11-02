import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import LoginPage from '../pages/auth/LoginPage.jsx';
import RegisterPage from '../pages/auth/RegisterPage.jsx';
import AuthorLayout from '../layouts/AuthorLayout.jsx';
import AdminLayout from '../layouts/AdminLayout.jsx';
import AuthorDashboardPage from '../pages/author/DashboardPage.jsx';
import BooksPage from '../pages/author/BooksPage.jsx';
import TicketsPage from '../pages/author/TicketsPage.jsx';
import TicketDetailPage from '../pages/author/TicketDetailPage.jsx';
import BookDetailPage from '../pages/author/BookDetailPage.jsx';
import AdminDashboardPage from '../pages/admin/AdminDashboardPage.jsx';
import AdminTicketsPage from '../pages/admin/AdminTicketsPage.jsx';
import AdminTicketDetailPage from '../pages/admin/AdminTicketDetailPage.jsx';

function LoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-ink-900 text-ink-400">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-700 border-t-leaf-500"></div>
        <p className="text-sm">Loading BookLeaf...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  return children;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/" element={<ProtectedRoute role="author"><AuthorLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<AuthorDashboardPage />} />
        <Route path="books" element={<BooksPage />} />
        <Route path="books/:bookId" element={<BookDetailPage />} />
        <Route path="tickets" element={<TicketsPage />} />
        <Route path="tickets/:ticketId" element={<TicketDetailPage />} />
      </Route>
      <Route path="/admin" element={<ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="tickets" element={<AdminTicketsPage />} />
        <Route path="tickets/:ticketId" element={<AdminTicketDetailPage />} />
      </Route>
    </Routes>
  );
}
