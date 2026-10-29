import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios.js';
import { FadeIn } from '../../components/common/Motion.jsx';
import { LoadingState, ErrorState, EmptyState } from '../../components/common/States.jsx';
import { StatusBadge, PriorityBadge } from '../../components/common/Badges.jsx';
import { formatDate } from '../../utils/formatters.js';
import { Search, Plus, MessageSquare, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const ticketSchema = z.object({
  bookId: z.string().optional(),
  subject: z.string().min(3, 'Subject must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
});

export default function TicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [books, setBooks] = useState([]);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(ticketSchema),
  });

  useEffect(() => {
    fetchTickets(1);
    api.get('/author/books?limit=100').then((res) => setBooks(res.data.data)).catch(() => {});
  }, [status, search]);

  const fetchTickets = async (page) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (status) params.set('status', status);
      if (search) params.set('search', search);
      const res = await api.get(`/author/tickets?${params.toString()}`);
      setTickets(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      await api.post('/author/tickets', {
        ...data,
        bookId: data.bookId || null,
      });
      setShowModal(false);
      reset();
      fetchTickets(1);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-ink-900">My Tickets</h2>
            <p className="text-sm text-ink-500">Track your support conversations with the BookLeaf team.</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary self-start">
            <Plus className="h-4 w-4" /> New ticket
          </button>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="flex flex-col gap-3 rounded-xl border border-ink-100 bg-white p-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              type="text"
              placeholder="Search tickets"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9"
            />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="input md:w-48">
            <option value="">All statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
      </FadeIn>

      {loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={() => fetchTickets(pagination.page)} /> : tickets.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No tickets yet" description="Submit your first support ticket and we will respond shortly." action={<button onClick={() => setShowModal(true)} className="btn-primary"><Plus className="h-4 w-4" /> Create ticket</button>} />
      ) : (
        <FadeIn delay={0.2}>
          <div className="overflow-hidden rounded-xl border border-ink-100 bg-white shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-ink-50 text-xs uppercase text-ink-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Reference</th>
                    <th className="px-4 py-3 font-medium">Subject</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Priority</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {tickets.map((t) => (
                    <tr key={t.id} className="hover:bg-ink-50/50">
                      <td className="px-4 py-3 font-medium text-ink-900">{t.reference}</td>
                      <td className="px-4 py-3">
                        <Link to={`/tickets/${t.id}`} className="font-medium text-ink-900 hover:text-leaf-700">
                          {t.subject}
                        </Link>
                        {t.bookTitle && <p className="text-xs text-ink-500">{t.bookTitle}</p>}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                      <td className="px-4 py-3"><PriorityBadge priority={t.priority} /></td>
                      <td className="px-4 py-3 text-ink-500">{formatDate(t.createdAt)}</td>
                      <td className="px-4 py-3 text-ink-500">{formatDate(t.updatedAt)}</td>
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-elevated">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-serif text-lg font-semibold text-ink-900">Submit a support ticket</h3>
              <button onClick={() => setShowModal(false)} className="text-ink-400 hover:text-ink-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="label">Related book</label>
                <select {...register('bookId')} className="input">
                  <option value="">General / Account Level</option>
                  {books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Subject</label>
                <input {...register('subject')} className="input" placeholder="What is this about?" />
                {errors.subject && <p className="mt-1 text-xs text-red-600">{errors.subject.message}</p>}
              </div>
              <div>
                <label className="label">Description</label>
                <textarea {...register('description')} rows={4} className="input" placeholder="Describe your issue in detail..." />
                {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Submitting...' : 'Submit ticket'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
