import { useEffect, useState } from 'react';
import api from '../../api/axios.js';
import { FadeIn, StaggerContainer, StaggerItem } from '../../components/common/Motion.jsx';
import { LoadingState, ErrorState } from '../../components/common/States.jsx';
import { PriorityBadge, StatusBadge } from '../../components/common/Badges.jsx';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { AlertTriangle, CheckCircle, Clock, Inbox, MessageSquare, TrendingUp } from 'lucide-react';

const COLORS = ['#24a585', '#f59e0b', '#ef4444', '#6b7280', '#3b82f6', '#8b5cf6'];

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/dashboard')
      .then((res) => setData(res.data.data))
      .catch((err) => {
        console.error('Dashboard load error:', err.response?.data || err.message);
        setError(err.response?.data?.message || 'Failed to load dashboard');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} detail="Check the browser console and backend terminal for details." />;
  if (!data) return null;

  const { counts, priorityCounts, categoryCounts, volumeByDay, oldestUnresolved, avgResolutionHours } = data;

  return (
    <div className="space-y-6">
      <FadeIn>
        <h2 className="font-serif text-2xl font-semibold text-ink-900">Operations Dashboard</h2>
        <p className="text-sm text-ink-500">Real-time overview of the AuthorCare queue.</p>
      </FadeIn>

      <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StaggerItem><MetricCard icon={Inbox} label="Total tickets" value={counts.total} /></StaggerItem>
        <StaggerItem><MetricCard icon={Clock} label="Open" value={counts.open} accent="text-amber-600" /></StaggerItem>
        <StaggerItem><MetricCard icon={TrendingUp} label="In progress" value={counts.inProgress} accent="text-blue-600" /></StaggerItem>
        <StaggerItem><MetricCard icon={CheckCircle} label="Resolved" value={counts.resolved} accent="text-leaf-600" /></StaggerItem>
      </StaggerContainer>

      <div className="grid gap-6 lg:grid-cols-2">
        <FadeIn delay={0.1}>
          <div className="card">
            <h3 className="mb-4 font-serif text-lg font-semibold text-ink-900">Tickets by category</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryCounts}>
                  <XAxis dataKey="category" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {categoryCounts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div className="card">
            <h3 className="mb-4 font-serif text-lg font-semibold text-ink-900">Priority distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={priorityCounts} dataKey="count" nameKey="priority" cx="50%" cy="50%" outerRadius={80} label>
                    {priorityCounts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </FadeIn>
      </div>

      <FadeIn delay={0.3}>
        <div className="card">
          <h3 className="mb-4 font-serif text-lg font-semibold text-ink-900">Ticket volume (last 30 days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={volumeByDay}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#24a585" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.4}>
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-serif text-lg font-semibold text-ink-900">Oldest unresolved tickets</h3>
            <span className="text-sm text-ink-500">
              Avg resolution: {avgResolutionHours !== null ? `${avgResolutionHours}h` : 'N/A'}
            </span>
          </div>
          {oldestUnresolved.length === 0 ? (
            <p className="text-sm text-ink-500">No unresolved tickets. Great work!</p>
          ) : (
            <div className="divide-y divide-ink-100">
              {oldestUnresolved.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-ink-900">{t.subject}</p>
                    <p className="text-xs text-ink-500">{t.reference} • {t.authorName} • {new Date(t.createdAt).toLocaleDateString('en-IN')}</p>
                  </div>
                  <PriorityBadge priority={t.priority} />
                </div>
              ))}
            </div>
          )}
        </div>
      </FadeIn>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, accent = 'text-leaf-600' }) {
  return (
    <div className="card flex items-center gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ink-50">
        <Icon className={`h-5 w-5 ${accent}`} />
      </div>
      <div>
        <p className="text-xs text-ink-500">{label}</p>
        <p className="text-xl font-semibold text-ink-900">{value}</p>
      </div>
    </div>
  );
}
