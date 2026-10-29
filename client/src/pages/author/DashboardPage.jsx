import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios.js';
import { FadeIn, StaggerContainer, StaggerItem } from '../../components/common/Motion.jsx';
import { LoadingState, ErrorState, EmptyState } from '../../components/common/States.jsx';
import { StatusBadge, PriorityBadge } from '../../components/common/Badges.jsx';
import { formatINR } from '../../utils/formatters.js';
import { BookOpen, Ticket, TrendingUp, DollarSign, Package, Plus, MessageSquare } from 'lucide-react';

export default function AuthorDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/author/dashboard')
      .then((res) => setData(res.data.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  if (!data) return null;

  const { author, summary, recentTickets } = data;
  const statusEntries = Object.entries(summary.statusCounts || {});

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-ink-900">Welcome back, {author.name.split(' ')[0]}</h2>
            <p className="text-sm text-ink-500">Here is everything happening with your books and support requests.</p>
          </div>
          <Link to="/tickets" className="btn-primary self-start">
            <Plus className="h-4 w-4" /> New support ticket
          </Link>
        </div>
      </FadeIn>

      <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StaggerItem><MetricCard icon={BookOpen} label="Books" value={summary.totalBooks} /></StaggerItem>
        <StaggerItem><MetricCard icon={Package} label="Copies sold" value={summary.totalCopiesSold} /></StaggerItem>
        <StaggerItem><MetricCard icon={TrendingUp} label="Royalties earned" value={formatINR(summary.totalRoyaltyEarned)} /></StaggerItem>
        <StaggerItem><MetricCard icon={DollarSign} label="Pending royalties" value={formatINR(summary.royaltyPending)} /></StaggerItem>
      </StaggerContainer>

      <div className="grid gap-6 lg:grid-cols-3">
        <FadeIn delay={0.2} className="lg:col-span-2">
          <div className="card">
            <h3 className="font-serif text-lg font-semibold text-ink-900">Publication status</h3>
            {statusEntries.length === 0 ? (
              <p className="mt-4 text-sm text-ink-500">No books yet.</p>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                {statusEntries.map(([status, count]) => (
                  <div key={status} className="rounded-lg border border-ink-100 bg-ink-50 px-4 py-2">
                    <p className="text-xs text-ink-500">{status}</p>
                    <p className="text-lg font-semibold text-ink-900">{count}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </FadeIn>

        <FadeIn delay={0.3}>
          <div className="card">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-serif text-lg font-semibold text-ink-900">Recent tickets</h3>
              <Link to="/tickets" className="text-sm font-medium text-leaf-600 hover:text-leaf-700">View all</Link>
            </div>
            {recentTickets.length === 0 ? (
              <EmptyState icon={MessageSquare} title="No tickets yet" description="Submit a support ticket when you need help." />
            ) : (
              <div className="space-y-3">
                {recentTickets.map((t) => (
                  <Link key={t.id} to={`/tickets/${t.id}`} className="block rounded-lg border border-ink-100 p-3 hover:border-leaf-200 hover:bg-leaf-50/30">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-ink-900">{t.subject}</p>
                      <StatusBadge status={t.status} />
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-ink-500">
                      <span>{t.reference}</span>
                      <span>•</span>
                      <PriorityBadge priority={t.priority} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </FadeIn>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }) {
  return (
    <div className="card flex items-center gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-leaf-50">
        <Icon className="h-5 w-5 text-leaf-600" />
      </div>
      <div>
        <p className="text-xs text-ink-500">{label}</p>
        <p className="text-xl font-semibold text-ink-900">{value}</p>
      </div>
    </div>
  );
}
