import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios.js';
import { FadeIn } from '../../components/common/Motion.jsx';
import { LoadingState, ErrorState } from '../../components/common/States.jsx';
import { formatINR, formatDate } from '../../utils/formatters.js';
import { ArrowLeft, BookOpen } from 'lucide-react';

export default function BookDetailPage() {
  const { bookId } = useParams();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/author/books/${bookId}`)
      .then((res) => setBook(res.data.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load book'))
      .finally(() => setLoading(false));
  }, [bookId]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!book) return null;

  return (
    <div className="space-y-6">
      <FadeIn>
        <Link to="/books" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-ink-800">
          <ArrowLeft className="h-4 w-4" /> Back to books
        </Link>
        <div className="card">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-leaf-50">
            <BookOpen className="h-8 w-8 text-leaf-600" />
          </div>
          <h2 className="font-serif text-2xl font-semibold text-ink-900">{book.title}</h2>
          <p className="text-sm text-ink-500">{book.isbn || 'ISBN pending'} • {book.genre || 'Genre not set'}</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Detail label="Status" value={book.status || 'N/A'} />
            <Detail label="MRP" value={formatINR(book.mrp)} />
            <Detail label="Royalty per copy" value={formatINR(book.authorRoyaltyPerCopy)} />
            <Detail label="Copies sold" value={book.totalCopiesSold ?? 0} />
            <Detail label="Total royalty earned" value={formatINR(book.totalRoyaltyEarned)} />
            <Detail label="Royalty paid" value={formatINR(book.royaltyPaid)} />
            <Detail label="Royalty pending" value={formatINR(book.royaltyPending)} />
            <Detail label="Last payout" value={formatDate(book.lastRoyaltyPayoutDate)} />
            <Detail label="Print partner" value={book.printPartner || 'N/A'} />
            <Detail label="Publication date" value={formatDate(book.publicationDate)} />
            <Detail label="Available on" value={(book.availableOn || []).join(', ') || 'N/A'} />
          </div>
        </div>
      </FadeIn>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="rounded-lg border border-ink-100 bg-ink-50 p-3">
      <p className="text-xs text-ink-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-ink-900">{value}</p>
    </div>
  );
}
