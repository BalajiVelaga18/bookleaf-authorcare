import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios.js';
import { FadeIn } from '../../components/common/Motion.jsx';
import { LoadingState, ErrorState } from '../../components/common/States.jsx';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../../components/common/Badges.jsx';
import { formatDate, formatINR } from '../../utils/formatters.js';
import { ArrowLeft, Send, User, Bot, Loader2, CheckCircle, RefreshCw, StickyNote } from 'lucide-react';
import { useSSE } from '../../hooks/useSSE.js';

const statuses = ['Open', 'In Progress', 'Resolved', 'Closed'];
const categories = ['Royalty & Payments', 'ISBN & Metadata Issues', 'Printing & Quality', 'Distribution & Availability', 'Book Status & Production Updates', 'General Inquiry'];
const priorities = ['Critical', 'High', 'Medium', 'Low'];

export default function AdminTicketDetailPage() {
  const { ticketId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reply, setReply] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState('');
  const [aiStatus, setAiStatus] = useState({ enabled: false, model: '' });

  const fetchDetail = async () => {
    try {
      const res = await api.get(`/admin/tickets/${ticketId}`);
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
    api.get('/ai-status').then((res) => setAiStatus(res.data)).catch(() => {});
  }, [ticketId]);

  useSSE(() => {
    fetchDetail();
  });

  const updateTicket = async (updates) => {
    await api.patch(`/admin/tickets/${ticketId}`, updates);
    fetchDetail();
  };

  const assignToMe = async () => {
    await api.post(`/admin/tickets/${ticketId}/assign`);
    fetchDetail();
  };

  const generateDraft = async () => {
    setDraftLoading(true);
    setDraftError('');
    try {
      const res = await api.post(`/admin/tickets/${ticketId}/draft-response`);
      setDraft(res.data.data.draft);
      setReply(res.data.data.draft.body);
    } catch (err) {
      setDraftError(err.response?.data?.message || 'Draft generation failed');
    } finally {
      setDraftLoading(false);
    }
  };

  const sendReply = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    try {
      await api.post(`/admin/tickets/${ticketId}/messages`, { body: reply });
      setReply('');
      setDraft(null);
      fetchDetail();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const addNote = async (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    try {
      await api.post(`/admin/tickets/${ticketId}/notes`, { body: note });
      setNote('');
      fetchDetail();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add note');
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={fetchDetail} />;
  if (!data) return null;

  const { ticket, publicMessages, internalNotes, activity } = data;
  const book = ticket.book;

  return (
    <div className="space-y-6">
      <FadeIn>
        <Link to="/admin/tickets" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-ink-800">
          <ArrowLeft className="h-4 w-4" /> Back to queue
        </Link>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
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

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <FadeIn delay={0.1}>
            <div className="card">
              <h3 className="mb-2 text-sm font-medium text-ink-500">Author query</h3>
              <p className="whitespace-pre-wrap text-ink-800">{ticket.description}</p>
              <div className="mt-4 flex gap-4 text-xs text-ink-500">
                <span>Created: {formatDate(ticket.createdAt)}</span>
                <span>Last activity: {formatDate(ticket.lastActivityAt)}</span>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.2}>
            <div className="card space-y-4">
              <h3 className="font-serif text-lg font-semibold text-ink-900">Conversation</h3>
              {publicMessages.length === 0 ? (
                <p className="text-sm text-ink-500">No public replies yet.</p>
              ) : (
                publicMessages.map((m) => (
                  <MessageBubble key={m.id} message={m} />
                ))
              )}

              {ticket.status !== 'Closed' && (
                <form onSubmit={sendReply} className="mt-4 space-y-3">
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    rows={4}
                    className="input"
                    placeholder="Write a public reply..."
                  />
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={generateDraft}
                      disabled={draftLoading || !aiStatus.enabled}
                      className="btn-secondary text-xs disabled:opacity-40"
                    >
                      {draftLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                      {draftLoading ? 'Drafting...' : 'Generate AI draft'}
                    </button>
                    <button type="submit" disabled={sending || !reply.trim()} className="btn-primary">
                      <Send className="h-4 w-4" /> Send reply
                    </button>
                  </div>
                  {draftError && <p className="text-xs text-red-600">{draftError}</p>}
                  {!aiStatus.enabled && <p className="text-xs text-ink-500">AI is not configured. Manual replies still work.</p>}
                </form>
              )}
            </div>
          </FadeIn>

          <FadeIn delay={0.3}>
            <div className="card space-y-4">
              <h3 className="font-serif text-lg font-semibold text-ink-900">Internal notes</h3>
              {internalNotes.length === 0 ? (
                <p className="text-sm text-ink-500">No internal notes.</p>
              ) : (
                internalNotes.map((n) => (
                  <div key={n.id} className="rounded-lg bg-amber-50 p-3">
                    <div className="flex items-center gap-2">
                      <StickyNote className="h-4 w-4 text-amber-600" />
                      <span className="text-sm font-medium text-ink-900">{n.sender.name}</span>
                      <span className="text-xs text-ink-500">{formatDate(n.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-sm text-ink-800">{n.body}</p>
                  </div>
                ))
              )}
              <form onSubmit={addNote} className="flex gap-3">
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add an internal note..."
                  className="input flex-1"
                />
                <button type="submit" disabled={!note.trim()} className="btn-secondary">Add</button>
              </form>
            </div>
          </FadeIn>
        </div>

        <div className="space-y-6">
          <FadeIn delay={0.1}>
            <div className="card space-y-4">
              <h3 className="font-serif text-lg font-semibold text-ink-900">Ticket controls</h3>
              <div>
                <label className="label">Status</label>
                <select value={ticket.status} onChange={(e) => updateTicket({ status: e.target.value })} className="input">
                  {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Category {ticket.aiCategory && '(AI: ' + ticket.aiCategory + ')'}</label>
                <select value={ticket.adminCategory || ticket.aiCategory || ''} onChange={(e) => updateTicket({ adminCategory: e.target.value })} className="input">
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Priority {ticket.aiPriority && '(AI: ' + ticket.aiPriority + ')'}</label>
                <select value={ticket.adminPriority || ticket.aiPriority || ''} onChange={(e) => updateTicket({ adminPriority: e.target.value })} className="input">
                  {priorities.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <button onClick={assignToMe} className="btn-secondary w-full">
                {ticket.assignedTo ? `Assigned to ${ticket.assignedTo.name}` : 'Assign to me'}
              </button>
            </div>
          </FadeIn>

          <FadeIn delay={0.2}>
            <div className="card space-y-3">
              <h3 className="font-serif text-lg font-semibold text-ink-900">Author</h3>
              <p className="text-sm font-medium text-ink-900">{ticket.author.name}</p>
              <p className="text-xs text-ink-500">{ticket.author.email}</p>
              <p className="text-xs text-ink-500">{ticket.author.city}{ticket.author.phone ? ` • ${ticket.author.phone}` : ''}</p>
            </div>
          </FadeIn>

          {book && (
            <FadeIn delay={0.3}>
              <div className="card space-y-3">
                <h3 className="font-serif text-lg font-semibold text-ink-900">Book context</h3>
                <p className="text-sm font-medium text-ink-900">{book.title}</p>
                <div className="space-y-1 text-xs text-ink-500">
                  <p>ISBN: {book.isbn || 'N/A'}</p>
                  <p>Status: {book.status || 'N/A'}</p>
                  <p>MRP: {formatINR(book.mrp)}</p>
                  <p>Copies sold: {book.totalCopiesSold ?? 0}</p>
                  <p>Royalty pending: {formatINR(book.royaltyPending)}</p>
                  <p>Last payout: {formatDate(book.lastRoyaltyPayoutDate)}</p>
                  <p>Available on: {(book.availableOn || []).join(', ') || 'N/A'}</p>
                </div>
              </div>
            </FadeIn>
          )}

          {ticket.aiCategory && (
            <FadeIn delay={0.4}>
              <div className="card space-y-2">
                <h3 className="font-serif text-lg font-semibold text-ink-900">AI assessment</h3>
                <p className="text-xs text-ink-500">Model: {ticket.aiModel || 'N/A'}</p>
                <p className="text-xs text-ink-500">Confidence: {ticket.aiConfidence || 'N/A'}</p>
                <p className="text-sm text-ink-700"><span className="font-medium">Category rationale:</span> {ticket.aiRationale}</p>
                <p className="text-sm text-ink-700"><span className="font-medium">Priority rationale:</span> {ticket.aiPriorityRationale}</p>
                {ticket.aiMissingInfo?.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-ink-500">Missing info:</p>
                    <ul className="list-disc pl-4 text-xs text-ink-500">
                      {ticket.aiMissingInfo.map((info, i) => <li key={i}>{info}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </FadeIn>
          )}

          <FadeIn delay={0.5}>
            <div className="card">
              <h3 className="mb-3 font-serif text-lg font-semibold text-ink-900">Activity</h3>
              <div className="space-y-3">
                {activity.length === 0 ? <p className="text-xs text-ink-500">No activity yet.</p> : activity.map((a) => (
                  <div key={a.id} className="text-xs text-ink-500">
                    <span className="font-medium text-ink-700">{a.actor.name}</span> {a.action.replace(/_/g, ' ')} • {formatDate(a.createdAt)}
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }) {
  const isAdmin = message.sender.role === 'admin';
  return (
    <div className="flex gap-3">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isAdmin ? 'bg-leaf-100' : 'bg-ink-100'}`}>
        <User className={`h-4 w-4 ${isAdmin ? 'text-leaf-700' : 'text-ink-600'}`} />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-ink-900">{message.sender.name}</span>
          <span className="text-xs text-ink-500">{formatDate(message.createdAt)}</span>
        </div>
        <div className="mt-1 rounded-lg bg-ink-50 p-3 text-sm text-ink-800 whitespace-pre-wrap">
          {message.body}
        </div>
      </div>
    </div>
  );
}
