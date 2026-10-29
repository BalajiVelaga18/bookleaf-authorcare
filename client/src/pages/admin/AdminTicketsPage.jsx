import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios.js';
import { FadeIn } from '../../components/common/Motion.jsx';
import { LoadingState, ErrorState, EmptyState } from '../../components/common/States.jsx';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../../components/common/Badges.jsx';
import { formatDate, formatRelativeTime } from '../../utils/formatters.js';
import { Search, MessageSquare, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { useSSE } from '../../hooks/useSSE.js';

const statuses = ['', 'Open', 'In Progress', 'Resolved', 'Closed'];
const categories = ['', 'Royalty & Payments', 'ISBN & Metadata Issues', 'Printing & Quality', 'Distribution & Availability', 'Book Status & Production Updates', 'General Inquiry'];
const priorities = ['', 'Critical', 'High', 'Medium', 'Low'];

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [filters, setFilters] = useState({ status: '', category: '', priority: '', search: '', sortBy: 'lastActivityAt', order: 'desc' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchTickets = async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (filters.status) params.set('status', filters.status);
      if (filters.category) params.set('category', filters.category);
      if (filters.priority) params.set('priority', filters.priority);
      if (filters.search) params.set('search', filters.search);
      params.set('sortBy', filters.sortBy);
      params.set('order', filters.order);
      const res = await api.get(`/admin/tickets?${params.toString()}`);
      setTickets(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error('Ticket queue load error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets(1);
  }, [filters.status, filters.category, filters.priority, filters.sortBy, filters.order]);

  useSSE(() => {
    fetchTickets(pagination.page);
  });

  const updateFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-ink-900">Ticket Queue</h2>
            <p className="text-sm text-ink-500">Manage author support requests and AI suggestions.</p>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="rounded-xl border border-ink-100 bg-white p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                placeholder="Search by reference, subject, author, or book"
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchTickets(1)}
                className="input pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <select value={filters.status} onChange={(e) => updateFilter('status', e.target.value)} className="input w-36">
                <option value="">All statuses</option>
                {statuses.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={filters.category} onChange={(e) => updateFilter('category', e.target.value)} className="input w-44">
                <option value="">All categories</option>
                {categories.filter(Boolean).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={filters.priority} onChange={(e) => updateFilter('priority', e.target.value)} className="input w-32">
                <option value="">All priorities</option>
                {priorities.filter(Boolean).map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <select value={filters.sortBy} onChange={(e) => updateFilter('sortBy', e.target.value)} className="input w-40">
                <option value="lastActivityAt">Last activity</option>
                <option value="createdAt">Created</option>
                <option value="priority">Priority</option>
              </select>
              <select value={filters.order} onChange={(e) => updateFilter('order', e.target.value)} className="input w-28">
                <option value="desc">Newest</option>
                <option value="asc">Oldest</option>
              </select>
            </div>
          </div>
        </div>
      </FadeIn>

      {loading ? <LoadingState /> : error ? <ErrorState message={error} detail="Check the browser console and backend terminal for details." onRetry={() => fetchTickets(pagination.page)} /> : tickets.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No tickets match your filters" description="Try changing filters or wait for new tickets." />
      ) : (
        <FadeIn delay={0.2}>
          <div className="overflow-hidden rounded-xl border border-ink-100 bg-white shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-ink-50 text-xs uppercase text-ink-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Ticket</th>
                    <th className="px-4 py-3 font-medium">Author</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Priority</th>
                    <th className="px-4 py-3 font-medium">Age</th>
                    <th className="px-4 py-3 font-medium">Assigned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {tickets.map((t) => (
                    <tr key={t.id} className="hover:bg-ink-50/50">
                      <td className="px-4 py-3">
                        <Link to={`/admin/tickets/${t.id}`} className="block">
                          <p className="font-medium text-ink-900 hover:text-leaf-700">{t.subject}</p>
                          <p className="text-xs text-ink-500">{t.reference}{t.bookTitle ? ` • ${t.bookTitle}` : ''}</p>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-ink-900">{t.authorName}</p>
                        <p className="text-xs text-ink-500">{t.authorEmail}</p>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                      <td className="px-4 py-3"><CategoryBadge category={t.category} /></td>
                      <td className="px-4 py-3"><PriorityBadge priority={t.priority} /></td>
                      <td className="px-4 py-3 text-ink-500">{formatRelativeTime(t.createdAt)}</td>
                      <td className="px-4 py-3 text-ink-500">{t.assignedToName || 'Unassigned'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between border-t border-ink-100 px-4 py-3">
                <button disabled={pagination.page <= 1} onClick={() => fetchTickets(pagination.page - 1)} className="btn-secondary disabled:opacity-40"><ChevronLeft className="h-4 w-4" /> Previous</button>
                <span className="text-sm text-ink-500">Page {pagination.page} of {pagination.pages}</span>
                <button disabled={pagination.page >= pagination.pages} onClick={() => fetchTickets(pagination.page + 1)} className="btn-secondary disabled:opacity-40">Next <ChevronRight className="h-4 w-4" /></button>
              </div>
            )}
          </div>
        </FadeIn>
      )}
    </div>
  );
}
