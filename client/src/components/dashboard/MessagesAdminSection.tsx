import { useEffect, useMemo, useRef, useState } from 'react';
import { Paperclip, PenSquare, Search, Send, X } from 'lucide-react';
import { adminMessagesApi } from '../../api/messages';
import type { Conversation, Message } from '../../types/api';
import { cn } from '../../utils/cn';

type StatusSetter = (msg: string | null, err?: string | null) => void;

type MessagesAdminSectionProps = {
  setStatus: StatusSetter;
};

const formatTime = (iso?: string | null) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatTimeOnly = (iso?: string | null) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
};

const getInitials = (name?: string | null) => {
  const raw = (name ?? '').trim();
  if (!raw) return 'U';
  const parts = raw.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? 'U';
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return (first + second).toUpperCase();
};

export const MessagesAdminSection: React.FC<MessagesAdminSectionProps> = ({ setStatus }) => {
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageDraft, setMessageDraft] = useState('');
  const [search, setSearch] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [sending, setSending] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeSearch, setComposeSearch] = useState('');
  const [composeLoading, setComposeLoading] = useState(false);
  const [composeClients, setComposeClients] = useState<Array<{ id: string; name: string; email: string | null; clientType: string | null }>>([]);
  const [composeSelected, setComposeSelected] = useState<string[]>([]);
  const [composeRecipientEmail, setComposeRecipientEmail] = useState('sales@ulk-supply.com');
  const [composeBody, setComposeBody] = useState('');
  const [composeSending, setComposeSending] = useState(false);
  const [composeAttachments, setComposeAttachments] = useState<File[]>([]);
  const [messageAttachments, setMessageAttachments] = useState<File[]>([]);

  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const composeFileInputRef = useRef<HTMLInputElement>(null);
  const messageFileInputRef = useRef<HTMLInputElement>(null);

  const composeVisibleIds = useMemo(() => composeClients.map((c) => c.id), [composeClients]);
  const composeAllVisibleSelected = useMemo(() => {
    if (composeVisibleIds.length === 0) return false;
    return composeVisibleIds.every((id) => composeSelected.includes(id));
  }, [composeSelected, composeVisibleIds]);

  const loadConversations = async () => {
    const { conversations: data } = await adminMessagesApi.listConversations();
    setConversations(data);
  };

  const loadMessages = async (conversationId: string) => {
    const { messages: data } = await adminMessagesApi.listMessages(conversationId, { limit: 150 });
    setMessages(data.slice().reverse());
    await adminMessagesApi.markRead(conversationId);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const { conversations: data } = await adminMessagesApi.listConversations();
        if (!mounted) return;
        setConversations(data);
        setActiveConversationId((prev) => prev ?? (data[0]?.id ?? null));
      } catch (error) {
        console.error(error);
        setStatus(null, error instanceof Error ? error.message : 'Failed to load messages');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [setStatus]);

  useEffect(() => {
    if (!activeConversationId) return;
    void (async () => {
      try {
        await loadMessages(activeConversationId);
        await loadConversations();
      } catch (error) {
        console.error(error);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId]);

  useEffect(() => {
    if (!activeConversationId) return;
    const interval = setInterval(() => {
      void loadConversations();
      void loadMessages(activeConversationId);
    }, 6000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId]);

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, activeConversationId]);

  useEffect(() => {
    if (!composeOpen) return;
    let mounted = true;
    const run = async () => {
      try {
        setComposeLoading(true);
        const { clients } = await adminMessagesApi.listClients({ q: composeSearch, limit: 50 });
        if (!mounted) return;
        setComposeClients(clients);
      } catch (error) {
        console.error(error);
      } finally {
        if (mounted) setComposeLoading(false);
      }
    };
    void run();
    return () => {
      mounted = false;
    };
  }, [composeOpen, composeSearch]);

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    return conversations.filter((conv) => {
      if (unreadOnly && (conv.unreadCount ?? 0) === 0) return false;
      if (statusFilter !== 'all' && conv.status !== statusFilter) return false;
      if (!q) return true;
      const haystack = [
        conv.client?.name ?? '',
        conv.client?.email ?? '',
        conv.client?.clientType ?? '',
        conv.recipientEmail ?? '',
        conv.lastMessagePreview ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [conversations, search, unreadOnly, statusFilter]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) ?? null,
    [conversations, activeConversationId]
  );

  const handleSend = async () => {
    if (!activeConversationId) return;
    const body = messageDraft.trim();
    if (!body && messageAttachments.length === 0) return;

    const bodyWithAttachmentNote =
      messageAttachments.length === 0
        ? body
        : body
          ? `${body}\n\nAttachment(s) sent via email only. View email to see attachments.`
          : 'Attachment(s) sent via email only. View email to see attachments.';
    try {
      setSending(true);
      const { message } =
        messageAttachments.length > 0
          ? await adminMessagesApi.sendMessageWithAttachments({
              conversationId: activeConversationId,
              body: bodyWithAttachmentNote,
              attachments: messageAttachments,
            })
          : await adminMessagesApi.sendMessage(activeConversationId, body);
      setMessages((prev) => [...prev, message]);
      setMessageDraft('');
      setMessageAttachments([]);
      await loadConversations();
      setStatus('Reply sent');
    } catch (error) {
      console.error(error);
      setStatus(null, error instanceof Error ? error.message : 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const handleComposeSend = async () => {
    const clientIds = composeSelected.slice();
    const recipientEmail = composeRecipientEmail.trim();
    const body = composeBody.trim();
    if (clientIds.length === 0 || !recipientEmail || (!body && composeAttachments.length === 0)) return;

    const bodyWithAttachmentNote =
      composeAttachments.length === 0
        ? body
        : body
          ? `${body}\n\nAttachment(s) sent via email only. View email to see attachments.`
          : 'Attachment(s) sent via email only. View email to see attachments.';
    try {
      setComposeSending(true);
      const { results } =
        composeAttachments.length > 0
          ? await adminMessagesApi.composeWithAttachments({
              clientIds,
              recipientEmail,
              body: bodyWithAttachmentNote,
              attachments: composeAttachments,
            })
          : await adminMessagesApi.compose({ clientIds, recipientEmail, body });
      setComposeOpen(false);
      setComposeSelected([]);
      setComposeBody('');
      setComposeAttachments([]);
      setComposeSearch('');
      await loadConversations();
      const first = results?.[0]?.conversation?.id;
      if (first) {
        setActiveConversationId(first);
      }
      setStatus('Conversation started');
    } catch (error) {
      console.error(error);
      setStatus(null, error instanceof Error ? error.message : 'Failed to start conversation');
    } finally {
      setComposeSending(false);
    }
  };

  return (
    <div>

      <div className="h-[80vh] grid grid-cols-1 lg:grid-cols-[360px_1fr] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Sidebar */}
        <div className="bg-white lg:border-r lg:border-slate-100">
          <div className="border-b border-slate-100 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-slate-900">Your chats</div>
              <button
                type="button"
                onClick={() => setComposeOpen(true)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                aria-label="Compose"
              >
                <PenSquare className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                className="h-6 w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  role="switch"
                  aria-checked={unreadOnly}
                  onClick={() => setUnreadOnly((prev) => !prev)}
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full border transition',
                    unreadOnly ? 'border-violet-600 bg-violet-600' : 'border-slate-200 bg-slate-100'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition',
                      unreadOnly ? 'translate-x-5' : 'translate-x-1'
                    )}
                  />
                </button>
                <span className="text-sm text-slate-600">Unread</span>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              >
                <option value="all">All</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          <div className="max-h-[70vh] overflow-y-auto">
            {loading ? (
              <div className="p-4 text-sm text-slate-500">Loading…</div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-4 text-sm text-slate-500">No conversations.</div>
            ) : (
              filteredConversations.map((conv) => {
                const active = conv.id === activeConversationId;
                const unread = (conv.unreadCount ?? 0) > 0;
                const displayName = conv.client?.name || conv.client?.email || 'Client';
                const lastFromClient = conv.lastMessageSenderRole === 'client';
                const onlineAt = conv.client?.lastActiveAt ?? conv.clientOnlineAt ?? null;
                const online = Boolean(onlineAt) && Date.now() - new Date(onlineAt as string).getTime() < 45_000;
                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => setActiveConversationId(conv.id)}
                    className={cn(
                      'w-full border-b border-slate-100 px-4 py-3 text-left transition',
                      active ? 'bg-slate-50' : 'hover:bg-slate-50'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <div className="grid h-11 w-11 place-items-center rounded-full bg-slate-200 text-sm font-bold text-slate-700">
                          {getInitials(displayName)}
                        </div>
                    <span
                      className={cn(
                        'absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white',
                        online ? 'bg-emerald-500' : 'bg-rose-500'
                      )}
                    />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm font-semibold text-slate-900">{displayName}</span>
                              {unread ? (
                                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-semibold text-white">
                                  {conv.unreadCount && conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                                </span>
                              ) : null}
                            </div>
                            <div className="flex min-w-0 items-center gap-2">
                              <span
                                className={cn(
                                  'shrink-0 text-xs font-semibold',
                                  lastFromClient ? 'text-emerald-700' : 'text-violet-700'
                                )}
                              >
                                {lastFromClient ? 'Received' : 'Sent'}
                              </span>
                              <span className="truncate text-sm text-slate-600">{conv.lastMessagePreview || '—'}</span>
                            </div>
                          </div>
                          <div className="shrink-0 pl-2 text-right text-xs text-slate-400">{formatTime(conv.lastMessageAt)}</div>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat */}
        <div className="flex min-h-[520px] flex-col bg-white">
          <div className="border-b border-slate-100 px-5 py-4">
            {activeConversation ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="relative shrink-0">
                    <div className="grid h-12 w-12 place-items-center rounded-full bg-slate-200 text-sm font-bold text-slate-700">
                      {getInitials(activeConversation.client?.name || activeConversation.client?.email || 'Client')}
                    </div>
                    <span
                      className={cn(
                        'absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white',
                        (activeConversation.client?.lastActiveAt || activeConversation.clientOnlineAt) &&
                          Date.now() -
                            new Date((activeConversation.client?.lastActiveAt || activeConversation.clientOnlineAt) as string).getTime() <
                            45_000
                          ? 'bg-emerald-500'
                          : 'bg-rose-500'
                      )}
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold text-slate-900">
                      {activeConversation.client?.name || activeConversation.client?.email || 'Client'}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="truncate">
                        {activeConversation.client?.email ? `Email: ${activeConversation.client.email}` : ''}
                        {activeConversation.client?.email ? ' • ' : ''}
                        To: {activeConversation.recipientEmail}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveConversationId(null)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                    aria-label="Close conversation"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-600">Select a conversation to view messages.</div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 via-white to-white px-6 py-6">
            {!activeConversation ? (
              <div className="text-sm text-slate-500">No conversation selected.</div>
            ) : messages.length === 0 ? (
              <div className="text-sm text-slate-500">No messages yet.</div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => {
                  const mine = msg.senderRole === 'admin';
                  const tag = mine ? 'Sent' : 'Received';
                  return (
                    <div key={msg.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                      <div
                        className={cn(
                          'max-w-[78%] rounded-2xl px-4 py-3 text-sm shadow-sm',
                          mine
                            ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white'
                            : 'border border-slate-200 bg-white text-slate-900'
                        )}
                      >
                        <div className="whitespace-pre-wrap leading-relaxed">{msg.body}</div>
                        <div className={cn('mt-2 flex items-center justify-between text-[0.7rem]', mine ? 'text-white/80' : 'text-slate-500')}>
                          <span className={cn('font-semibold', mine ? 'text-white/80' : 'text-slate-500')}>{tag}</span>
                          <span>{formatTimeOnly(msg.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={scrollAnchorRef} />
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 bg-white px-5 py-4">
            <div className="flex items-end gap-3">
              <div className="flex flex-1 items-end gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2">
                <input
                  ref={messageFileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    e.target.value = '';
                    if (files.length === 0) return;
                    const maxFiles = 5;
                    const maxBytes = 10 * 1024 * 1024;
                    const next = [...messageAttachments];
                    for (const file of files) {
                      if (next.length >= maxFiles) break;
                      if (file.size > maxBytes) {
                        setStatus(null, `${file.name} is too large (max 10MB).`);
                        continue;
                      }
                      next.push(file);
                    }
                    setMessageAttachments(next);
                  }}
                />

                <button
                  type="button"
                  onClick={() => messageFileInputRef.current?.click()}
                  className="text-slate-400 hover:text-slate-600"
                  aria-label="Attach files (email only)"
                  disabled={!activeConversation || sending}
                >
                  <Paperclip className="h-5 w-5" />
                </button>
                <textarea
                  value={messageDraft}
                  onChange={(e) => setMessageDraft(e.target.value)}
                  placeholder="Write your message…"
                  rows={1}
                  className="max-h-28 min-h-[40px] flex-1 resize-none bg-transparent py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  disabled={!activeConversation || sending}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void handleSend();
                    }
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={!activeConversation || sending || (!messageDraft.trim() && messageAttachments.length === 0)}
                className={cn(
                  'inline-flex h-12 w-12 items-center justify-center rounded-2xl transition',
                  !activeConversation || sending || (!messageDraft.trim() && messageAttachments.length === 0)
                    ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                    : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:brightness-95'
                )}
                aria-label="Send"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>

            {messageAttachments.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {messageAttachments.map((file, idx) => (
                  <button
                    key={`${file.name}-${idx}`}
                    type="button"
                    onClick={() => setMessageAttachments((prev) => prev.filter((_, i) => i !== idx))}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700 hover:bg-slate-100"
                    title="Remove attachment"
                  >
                    <Paperclip className="h-3.5 w-3.5 text-slate-500" />
                    <span className="max-w-[240px] truncate">{file.name}</span>
                    <span className="text-slate-400">×</span>
                  </button>
                ))}
                <span className="self-center text-xs text-slate-500">(email only)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {composeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <div className="text-lg font-bold text-slate-900">Compose</div>
                <div className="text-sm text-slate-600">Start a conversation with one or more clients.</div>
              </div>
              <button
                type="button"
                onClick={() => setComposeOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-[1fr_320px]">
              <div>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                  <Search className="h-4 w-4 text-slate-400" />
                  <input
                    value={composeSearch}
                    onChange={(e) => setComposeSearch(e.target.value)}
                    placeholder="Search clients…"
                    className="h-6 w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  />
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={composeAllVisibleSelected}
                      disabled={composeVisibleIds.length === 0}
                      onChange={() => {
                        if (composeVisibleIds.length === 0) return;
                        setComposeSelected((prev) => {
                          if (composeAllVisibleSelected) {
                            const visible = new Set(composeVisibleIds);
                            return prev.filter((id) => !visible.has(id));
                          }
                          return Array.from(new Set([...prev, ...composeVisibleIds]));
                        });
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-600/20"
                    />
                    Select all
                  </label>

                  <div className="text-xs text-slate-500">
                    Selected: <span className="font-semibold text-slate-700">{composeSelected.length}</span>
                  </div>
                </div>

                <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-slate-200">
                  {composeLoading ? (
                    <div className="p-4 text-sm text-slate-500">Loading…</div>
                  ) : composeClients.length === 0 ? (
                    <div className="p-4 text-sm text-slate-500">No clients found.</div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {composeClients.map((client) => {
                        const checked = composeSelected.includes(client.id);
                        return (
                          <label
                            key={client.id}
                            className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-slate-50"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const next = e.target.checked;
                                setComposeSelected((prev) =>
                                  next ? Array.from(new Set([...prev, client.id])) : prev.filter((id) => id !== client.id)
                                );
                              }}
                              className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-600/20"
                            />
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-slate-900">{client.name || client.email || 'Client'}</div>
                              <div className="truncate text-xs text-slate-500">
                                {client.email ?? '—'}{client.clientType ? ` • ${client.clientType}` : ''}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600">Send from</label>
                  <select
                    value={composeRecipientEmail}
                    onChange={(e) => setComposeRecipientEmail(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  >
                    <option value="sales@ulk-supply.com">sales@ulk-supply.com</option>
                    <option value="ulksupply@hotmail.com">ulksupply@hotmail.com</option>
                    <option value="bprod.digital@gmail.com">bprod.digital@gmail.com</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600">Message</label>
                  <textarea
                    value={composeBody}
                    onChange={(e) => setComposeBody(e.target.value)}
                    rows={5}
                    placeholder="Write the first message…"
                    className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-600/15"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-600">Attachments</label>
                    <button
                      type="button"
                      onClick={() => composeFileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Paperclip className="h-4 w-4" />
                      Add
                    </button>
                  </div>
                  <input
                    ref={composeFileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      e.target.value = '';
                      if (files.length === 0) return;
                      const maxFiles = 5;
                      const maxBytes = 10 * 1024 * 1024;
                      const next = [...composeAttachments];
                      for (const file of files) {
                        if (next.length >= maxFiles) break;
                        if (file.size > maxBytes) {
                          setStatus(null, `${file.name} is too large (max 10MB).`);
                          continue;
                        }
                        next.push(file);
                      }
                      setComposeAttachments(next);
                    }}
                  />

                  {composeAttachments.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {composeAttachments.map((file, idx) => (
                        <button
                          key={`${file.name}-${idx}`}
                          type="button"
                          onClick={() => setComposeAttachments((prev) => prev.filter((_, i) => i !== idx))}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700 hover:bg-slate-100"
                          title="Remove attachment"
                        >
                          <Paperclip className="h-3.5 w-3.5 text-slate-500" />
                          <span className="max-w-[220px] truncate">{file.name}</span>
                          <span className="text-slate-400">×</span>
                        </button>
                      ))}
                      <span className="self-center text-xs text-slate-500">(email only)</span>
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-slate-500">Optional (sent via email only; not stored in chat).</div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => void handleComposeSend()}
                  disabled={composeSending || composeSelected.length === 0 || !composeRecipientEmail || (!composeBody.trim() && composeAttachments.length === 0)}
                  className={cn(
                    'inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition',
                    composeSending || composeSelected.length === 0 || !composeRecipientEmail || (!composeBody.trim() && composeAttachments.length === 0)
                      ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                      : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:brightness-95'
                  )}
                >
                  <Send className="h-4 w-4" />
                  {composeSending ? 'Sending…' : 'Start chat'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
