import { useAuth } from '../contexts/AuthContext.jsx';
import { BookOpen, LayoutDashboard, LogOut, MessageSquare, Users } from 'lucide-react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/tickets', label: 'Ticket Queue', icon: MessageSquare },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-paper">
      <aside className="hidden w-64 flex-col border-r border-ink-100 bg-white md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-ink-100 px-6">
          <BookOpen className="h-6 w-6 text-leaf-600" />
          <span className="font-serif text-lg font-semibold text-ink-900">BookLeaf</span>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-leaf-50 text-leaf-700' : 'text-ink-600 hover:bg-ink-50'
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-ink-100 p-4">
          <div className="mb-3 text-sm">
            <p className="font-medium text-ink-900">{user?.name}</p>
            <p className="text-ink-500">{user?.email}</p>
          </div>
          <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-50">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1">
        <header className="flex h-16 items-center justify-between border-b border-ink-100 bg-white px-4 md:px-8">
          <div className="flex items-center gap-2 md:hidden">
            <BookOpen className="h-6 w-6 text-leaf-600" />
            <span className="font-serif text-lg font-semibold text-ink-900">BookLeaf</span>
          </div>
          <h1 className="hidden font-serif text-xl font-semibold text-ink-900 md:block">Admin Operations</h1>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-ink-100 px-3 py-1 text-xs font-medium text-ink-700">Admin</span>
          </div>
        </header>
        <div className="p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
