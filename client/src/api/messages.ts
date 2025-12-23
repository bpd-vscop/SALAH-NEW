import { http } from './http';
import type { Conversation, Message } from '../types/api';

export const messagesApi = {
  listConversations() {
    return http.get<{ conversations: Conversation[] }>('/messages/conversations');
  },
  createConversation(recipientEmail: string) {
    return http.post<{ conversation: Conversation }>('/messages/conversations', { recipientEmail });
  },
  listMessages(conversationId: string, params?: { limit?: number; cursor?: string }) {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.cursor) query.set('cursor', params.cursor);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return http.get<{ conversation: Conversation; messages: Message[]; nextCursor: string | null }>(
      `/messages/conversations/${conversationId}/messages${suffix}`
    );
  },
  sendMessage(conversationId: string, body: string) {
    return http.post<{ conversation: Conversation; message: Message }>(`/messages/conversations/${conversationId}/messages`, { body });
  },
  markRead(conversationId: string) {
    return http.post<{ ok: true }>(`/messages/conversations/${conversationId}/read`, {});
  },
  pingPresence(conversationId: string) {
    return http.post<{ ok: true }>(`/messages/conversations/${conversationId}/presence`, {});
  },
};

export const adminMessagesApi = {
  listConversations() {
    return http.get<{ conversations: Conversation[] }>('/admin/messages/conversations');
  },
  listClients(params?: { q?: string; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.q) query.set('q', params.q);
    if (params?.limit) query.set('limit', String(params.limit));
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return http.get<{ clients: Array<{ id: string; name: string; email: string | null; clientType: string | null; lastActiveAt?: string | null }> }>(
      `/admin/messages/clients${suffix}`
    );
  },
  listMessages(conversationId: string, params?: { limit?: number; cursor?: string }) {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.cursor) query.set('cursor', params.cursor);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return http.get<{ conversation: Conversation; messages: Message[]; nextCursor: string | null }>(
      `/admin/messages/conversations/${conversationId}/messages${suffix}`
    );
  },
  sendMessage(conversationId: string, body: string) {
    return http.post<{ conversation: Conversation; message: Message }>(`/admin/messages/conversations/${conversationId}/messages`, { body });
  },
  markRead(conversationId: string) {
    return http.post<{ ok: true }>(`/admin/messages/conversations/${conversationId}/read`, {});
  },
  compose(payload: { clientIds: string[]; recipientEmail: string; body: string }) {
    return http.post<{ results: Array<{ conversation: Conversation; message: Message }> }>(`/admin/messages/compose`, payload);
  },
  composeWithAttachments(payload: { clientIds: string[]; recipientEmail: string; body: string; attachments: File[] }) {
    const form = new FormData();
    form.append('clientIds', JSON.stringify(payload.clientIds));
    form.append('recipientEmail', payload.recipientEmail);
    form.append('body', payload.body);
    payload.attachments.forEach((file) => form.append('attachments', file));
    return http.post<{ results: Array<{ conversation: Conversation; message: Message }> }>(`/admin/messages/compose-with-attachments`, form);
  },
  sendMessageWithAttachments(payload: { conversationId: string; body: string; attachments: File[] }) {
    const form = new FormData();
    form.append('body', payload.body);
    payload.attachments.forEach((file) => form.append('attachments', file));
    return http.post<{ conversation: Conversation; message: Message }>(
      `/admin/messages/conversations/${payload.conversationId}/messages-with-attachments`,
      form
    );
  },
};
