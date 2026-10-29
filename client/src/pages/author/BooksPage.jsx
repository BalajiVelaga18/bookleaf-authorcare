import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios.js';
import { FadeIn } from '../../components/common/Motion.jsx';
import { LoadingState, ErrorState, EmptyState } from '../../components/common/States.jsx';
import { formatINR, formatDate } from '../../utils/formatters.js';
import { Search, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';

const statusOptions = ['', 'Published & Live', 'In Production - Cover Design', 'In Production - Typesetting'];

export default function BooksPage() {
  const [books, setBooks] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBooks(1);
  }, [status, search]);

  const fetchBooks = async (page) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (status) params.set('status', status);
      if (search) params.set('search', search);
      const res = await api.get(`/author/books?${params.toString()}`);
      setBooks(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load books');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-ink-900">My Books</h2>
            <p className="text-sm text-ink-500">Your complete BookLeaf library and royalty summary.</p>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="flex flex-col gap-3 rounded-xl border border-ink-100 bg-white p-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              type="text"
              placeholder="Search by title, ISBN, or genre"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9"
            />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="input md:w-56">
            <option value="">All statuses</option>
            {statusOptions.filter(Boolean).map((s) => (<option key={s} value={s}>{s}</option>))}
          </select>
        </div>
      </FadeIn>

      {loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={() => fetchBooks(pagination.page)} /> : books.length === 0 ? (
        <EmptyState icon={BookOpen} title="No books found" description="Try adjusting your filters." />
      ) : (
        <FadeIn delay={0.2}>
          <div className="overflow-hidden rounded-xl border border-ink-100 bg-white shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-ink-50 text-xs uppercase text-ink-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Title</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">MRP</th>
                    <th className="px-4 py-3 font-medium">Sold</th>
                    <th className="px-4 py-3 font-medium">Earned</th>
                    <th className="px-4 py-3 font-medium">Pending</th>
                    <th className="px-4 py-3 font-medium">Published</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {books.map((book) => (
                    <tr key={book.id} className="hover:bg-ink-50/50">
                      <td className="px-4 py-3">
                        <Link to={`/books/${book.id}`} className="font-medium text-ink-900 hover:text-leaf-700">
                          {book.title}
                        </Link>
                        <p className="text-xs text-ink-500">{book.isbn || 'ISBN pending'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${book.status?.includes('Production') ? 'bg-amber-50 text-amber-700' : 'bg-leaf-50 text-leaf-700'}`}>
                          {book.status || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3">{formatINR(book.mrp)}</td>
                      <td className="px-4 py-3">{book.totalCopiesSold ?? 0}</td>
                      <td className="px-4 py-3">{formatINR(book.totalRoyaltyEarned)}</td>
                      <td className="px-4 py-3 font-medium text-ink-900">{formatINR(book.royaltyPending)}</td>
                      <td className="px-4 py-3">{formatDate(book.publicationDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between border-t border-ink-100 px-4 py-3">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => fetchBooks(pagination.page - 1)}
                  className="btn-secondary disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>
                <span className="text-sm text-ink-500">Page {pagination.page} of {pagination.pages}</span>
                <button
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => fetchBooks(pagination.page + 1)}
                  className="btn-secondary disabled:opacity-40"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </FadeIn>
      )}
    </div>
  );
}
