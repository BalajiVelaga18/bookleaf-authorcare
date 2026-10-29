import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios.js';
import { FadeIn } from '../../components/common/Motion.jsx';
import { LoadingState, ErrorState } from '../../components/common/States.jsx';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../../components/common/Badges.jsx';
import { formatDate } from '../../utils/formatters.js';
import { ArrowLeft, Send, User } from 'lucide-react';
import { useSSE } from '../../hooks/useSSE.js';

export default function TicketDetailPage() {
  const { ticketId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const fetchDetail = async () => {
    try {
      const res = await api.get(`/author/tickets/${ticketId}`);
      setData(res.data.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [ticketId]);

  useSSE(() => {
    fetchDetail();
  });

  const sendReply = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    try {
      await api.post(`/author/tickets/${ticketId}/messages`, { body: reply });
      setReply('');
      fetchDetail();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={fetchDetail} />;
  if (!data) return null;

  const { ticket, messages } = data;

  return (
    <div className="space-y-6">
      <FadeIn>
        <Link to="/tickets" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-ink-800">
          <ArrowLeft className="h-4 w-4" /> Back to tickets
        </Link>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-ink-900">{ticket.subject}</h2>
            <p className="text-sm text-ink-500">{ticket.reference}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
            <CategoryBadge category={ticket.category} />
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="card">
          <h3 className="mb-2 text-sm font-medium text-ink-500">Original query</h3>
          <p className="whitespace-pre-wrap text-ink-800">{ticket.description}</p>
          {ticket.book && (
            <p className="mt-3 text-xs text-ink-500">Related book: <span className="font-medium text-ink-700">{ticket.book.title}</span></p>
          )}
          <div className="mt-4 flex gap-4 text-xs text-ink-500">
            <span>Created: {formatDate(ticket.createdAt)}</span>
            <span>Last activity: {formatDate(ticket.lastActivityAt)}</span>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.2}>
        <div className="card space-y-4">
          <h3 className="font-serif text-lg font-semibold text-ink-900">Conversation</h3>
          {messages.length === 0 ? (
            <p className="text-sm text-ink-500">No replies yet. The BookLeaf team will respond soon.</p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex gap-3 ${m.sender.role === 'author' ? 'flex-row' : 'flex-row'}`}>
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${m.sender.role === 'author' ? 'bg-ink-100' : 'bg-leaf-100'}`}>
                  <User className={`h-4 w-4 ${m.sender.role === 'author' ? 'text-ink-600' : 'text-leaf-700'}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-ink-900">{m.sender.name}</span>
                    <span className="text-xs text-ink-500">{formatDate(m.createdAt)}</span>
                  </div>
                  <div className="mt-1 rounded-lg bg-ink-50 p-3 text-sm text-ink-800">
                    {m.body}
                  </div>
                </div>
              </div>
            ))
          )}

          {ticket.status !== 'Closed' && (
            <form onSubmit={sendReply} className="mt-4 flex gap-3">
              <input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Write a follow-up..."
                className="input flex-1"
              />
              <button type="submit" disabled={sending || !reply.trim()} className="btn-primary">
                <Send className="h-4 w-4" /> Send
              </button>
            </form>
          )}
        </div>
      </FadeIn>
    </div>
  );
}
