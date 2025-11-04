import { useCallback, useEffect, useState } from 'react';
import { usersApi, type CreateUserPayload, type ListUsersParams, type UpdateUserPayload } from '../../../api/users';
import type { ClientType, User, UserRole } from '../../../types/api';
import type { StatusSetter } from '../types';
import { StatusPill } from '../../common/StatusPill';
import { formatTimestamp } from '../../../utils/format';
import { cn } from '../../../utils/cn';

interface ClientManagementPanelProps {
  role: UserRole;
  currentUserId: string;
  setStatus: StatusSetter;
}

type SortOption = 'recent' | 'name-asc' | 'name-desc';
type StatusFilter = 'all' | 'active' | 'inactive';
type TypeFilter = 'all' | ClientType;
type VerificationFilter = 'all' | 'verified' | 'pending';

interface ClientFormState {
  name: string;
  email: string;
  phoneCode: string;
  phoneNumber: string;
  status: User['status'];
  clientType: ClientType;
  companyName: string;
  companyPhone: string;
  companyAddress: string;
  companyBusinessType: string;
  companyTaxId: string;
  companyWebsite: string;
}

const SORT_TO_QUERY: Record<SortOption, ListUsersParams['sort']> = {
  recent: 'recent',
  'name-asc': 'name-asc',
  'name-desc': 'name-desc',
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

const buildEmptyForm = (): ClientFormState => ({
  name: '',
  email: '',
  phoneCode: '',
  phoneNumber: '',
  status: 'active',
  clientType: 'C2B',
  companyName: '',
  companyPhone: '',
  companyAddress: '',
  companyBusinessType: '',
  companyTaxId: '',
  companyWebsite: '',
});

const toneForClientStatus = (status: User['status']) => (status === 'active' ? 'positive' : 'warning');
const toneForVerification = (isVerified?: boolean | null) => (isVerified ? 'positive' : 'warning');

const deriveVerificationFilename = (client: User) => {
  const base = client.name?.trim() || client.email?.split('@')[0] || 'client';
  return `${base.replace(/\s+/g, '-').toLowerCase()}-verification-${client.id}`;
};

export const ClientManagementPanel: React.FC<ClientManagementPanelProps> = ({ role, currentUserId, setStatus }) => {
  void currentUserId;
  const canManageClients = role === 'admin' || role === 'super_admin';

  const [records, setRecords] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [verificationFilter, setVerificationFilter] = useState<VerificationFilter>('all');
  const [sort, setSort] = useState<SortOption>('recent');
  const [form, setForm] = useState<ClientFormState>(() => buildEmptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<User | null>(null);
  const [sendingVerificationId, setSendingVerificationId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadClients = useCallback(async () => {
    const params: ListUsersParams = {
      role: ['client'],
      sort: SORT_TO_QUERY[sort],
    };

    if (statusFilter !== 'all') {
      params.status = statusFilter;
    }

    if (typeFilter !== 'all') {
      params.clientType = typeFilter;
    }

    if (verificationFilter !== 'all') {
      params.emailVerified = verificationFilter === 'verified';
    }

    if (debouncedSearch) {
      params.search = debouncedSearch;
    }

    setLoading(true);
    setLocalError(null);
    try {
      const response = await usersApi.list(params);
      setRecords(response.users.filter((user) => user.role === 'client'));
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Failed to load clients';
      setLocalError(message);
      setStatus(null, message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, setStatus, sort, statusFilter, typeFilter, verificationFilter]);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  const resetForm = () => {
    setEditingId(null);
    setForm(buildEmptyForm());
    setFormError(null);
  };

  const handleEdit = (client: User) => {
    setEditingId(client.id);
    setForm({
      name: client.name ?? '',
      email: client.email ?? '',
      phoneCode: client.phoneCode ?? '',
      phoneNumber: client.phoneNumber ?? '',
      status: client.status,
      clientType: client.clientType ?? 'C2B',
      companyName: client.company?.name ?? '',
      companyPhone: client.company?.phone ?? '',
      companyAddress: client.company?.address ?? '',
      companyBusinessType: client.company?.businessType ?? '',
      companyTaxId: client.company?.taxId ?? '',
      companyWebsite: client.company?.website ?? '',
    });
    setFormError(null);
  };

  const validateEmail = (value: string) => {
    if (!value) {
      return true;
    }
    return EMAIL_REGEX.test(value);
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    setFormError(null);

    const trimmedEmail = form.email.trim();
    const trimmedName = form.name.trim();
    const trimmedPhoneCode = form.phoneCode.trim();
    const trimmedPhoneNumber = form.phoneNumber.trim();
    const trimmedCompanyName = form.companyName.trim();
    const trimmedCompanyPhone = form.companyPhone.trim();
    const trimmedCompanyAddress = form.companyAddress.trim();
    const trimmedCompanyBusinessType = form.companyBusinessType.trim();
    const trimmedCompanyTaxId = form.companyTaxId.trim();
    const trimmedCompanyWebsite = form.companyWebsite.trim();

    if (!validateEmail(trimmedEmail)) {
      setFormError('Enter a valid email address');
      return;
    }

    try {
      setSubmitting(true);

      if (!editingId) {
        if (!canManageClients) {
          throw forbiddenError();
        }

        const createPayload: CreateUserPayload = {
          role: 'client',
          status: form.status,
          clientType: form.clientType,
        };

        if (trimmedName) {
          createPayload.name = trimmedName;
        }
        if (trimmedEmail) {
          createPayload.email = trimmedEmail.toLowerCase();
        }
        if (trimmedPhoneCode) {
          createPayload.phoneCode = trimmedPhoneCode;
        }
        if (trimmedPhoneNumber) {
          createPayload.phoneNumber = trimmedPhoneNumber;
        }

        const { user } = await usersApi.create(createPayload);

        const companyPayload: UpdateUserPayload = {};
        if (trimmedCompanyName) {
          companyPayload.companyName = trimmedCompanyName;
        }
        if (trimmedCompanyPhone) {
          companyPayload.companyPhone = trimmedCompanyPhone;
        }
        if (trimmedCompanyAddress) {
          companyPayload.companyAddress = trimmedCompanyAddress;
        }
        if (trimmedCompanyBusinessType) {
          companyPayload.companyBusinessType = trimmedCompanyBusinessType;
        }
        if (trimmedCompanyTaxId) {
          companyPayload.companyTaxId = trimmedCompanyTaxId;
        }
        if (trimmedCompanyWebsite) {
          companyPayload.companyWebsite = trimmedCompanyWebsite;
        }

        if (Object.keys(companyPayload).length > 0) {
          await usersApi.update(user.id, companyPayload);
        }

        setStatus('Client record created');
        resetForm();
        await loadClients();
        return;
      }

      const updatePayload: UpdateUserPayload = {
        status: form.status,
        clientType: form.clientType,
        phoneCode: trimmedPhoneCode || null,
        phoneNumber: trimmedPhoneNumber || null,
        companyName: trimmedCompanyName || null,
        companyPhone: trimmedCompanyPhone || null,
        companyAddress: trimmedCompanyAddress || null,
        companyBusinessType: trimmedCompanyBusinessType || null,
        companyTaxId: trimmedCompanyTaxId || null,
        companyWebsite: trimmedCompanyWebsite || null,
      };

      if (trimmedName) {
        updatePayload.name = trimmedName;
      }
      if (trimmedEmail) {
        updatePayload.email = trimmedEmail.toLowerCase();
      }

      await usersApi.update(editingId, updatePayload);
      setStatus('Client details updated');
      resetForm();
      await loadClients();
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Unable to save client';
      setFormError(message === 'FORBIDDEN' ? 'You do not have permission to manage clients.' : message);
      if (message !== 'FORBIDDEN') {
        setStatus(null, message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canManageClients) {
      setStatus(null, 'You do not have permission to remove clients');
      return;
    }
    setDeletingId(id);
    try {
      await usersApi.delete(id);
      setStatus('Client removed');
      if (editingId === id) {
        resetForm();
      }
      await loadClients();
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Unable to delete client';
      setStatus(null, message);
    } finally {
      setDeletingId(null);
      setPendingDelete(null);
    }
  };

  const handleSendVerification = async (client: User) => {
    if (!canManageClients) {
      setStatus(null, 'You do not have permission to send verification emails');
      return;
    }
    if (!client.email) {
      setStatus(null, 'Client does not have an email address');
      return;
    }
    setSendingVerificationId(client.id);
    try {
      const response = await usersApi.sendVerification(client.id);
      const baseMessage = response.message || (response.alreadyVerified ? 'Email is already verified' : 'Verification email sent');
      const fullMessage = response.previewCode ? `${baseMessage} (code: ${response.previewCode})` : baseMessage;
      setStatus(fullMessage);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Unable to send verification email';
      setStatus(null, message);
    } finally {
      setSendingVerificationId(null);
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-white/80 p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Registered clients</h2>
            <p className="text-sm text-slate-600">Review and manage customer accounts, verification status, and company details.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by name or email"
                className="h-10 w-60 rounded-xl border border-border bg-white px-4 pr-10 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <svg
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
              </svg>
            </div>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
              className="h-10 rounded-xl border border-border bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">All types</option>
              <option value="B2B">B2B</option>
              <option value="C2B">C2B</option>
            </select>
            <select
              value={verificationFilter}
              onChange={(event) => setVerificationFilter(event.target.value as VerificationFilter)}
              className="h-10 rounded-xl border border-border bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">All verification states</option>
              <option value="verified">Verified</option>
              <option value="pending">Awaiting verification</option>
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="h-10 rounded-xl border border-border bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortOption)}
              className="h-10 rounded-xl border border-border bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="recent">Most recent</option>
              <option value="name-asc">Name: A to Z</option>
              <option value="name-desc">Name: Z to A</option>
            </select>
          </div>
        </div>

        {localError && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {localError}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-border bg-white">
          <table className="min-w-full divide-y divide-border text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Verification</th>
                <th className="px-4 py-3 font-semibold">Created</th>
                <th className="px-4 py-3 font-semibold">Documents</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-muted">
                    Loading clients...
                  </td>
                </tr>
              )}
              {!loading && records.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-muted">
                    No clients found.
                  </td>
                </tr>
              )}
              {!loading &&
                records.map((client) => {
                  const isEditing = editingId === client.id;
                  return (
                    <tr
                      key={client.id}
                      className={cn('transition hover:bg-primary/5', isEditing && 'bg-primary/10')}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{client.name || '—'}</div>
                        <div className="text-xs text-slate-500">{client.email || 'Email not set'}</div>
                        {client.company?.name && (
                          <div className="text-xs text-slate-400">{client.company.name}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{client.clientType ?? 'C2B'}</td>
                      <td className="px-4 py-3">
                        <StatusPill label={client.status === 'active' ? 'Active' : 'Inactive'} tone={toneForClientStatus(client.status)} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill label={client.isEmailVerified ? 'Verified' : 'Pending'} tone={toneForVerification(client.isEmailVerified)} />
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">{formatTimestamp(client.accountCreated)}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {client.verificationFileUrl ? (
                          <a
                            href={client.verificationFileUrl}
                            download={`${deriveVerificationFilename(client)}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary/5"
                          >
                            Download
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
                            </svg>
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400">No document</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(client)}
                            className="inline-flex items-center rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-primary hover:text-primary"
                            disabled={!canManageClients}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSendVerification(client)}
                            className="inline-flex items-center rounded-xl border border-primary/40 px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/5"
                            disabled={!canManageClients || !client.email || sendingVerificationId === client.id}
                          >
                            {sendingVerificationId === client.id ? 'Sending…' : 'Send verification'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingDelete(client)}
                            className="inline-flex items-center rounded-xl border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                            disabled={!canManageClients}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-border bg-white/80 p-6 shadow-sm">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{editingId ? 'Edit client details' : 'Create client record'}</h3>
          <p className="text-sm text-slate-600">You can leave fields blank and invite the client to complete their profile later.</p>
        </div>

        {!canManageClients && !editingId && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            You do not have permission to create new clients.
          </div>
        )}

        {formError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Full name
            <input
              type="text"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Optional"
              className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="Optional"
              className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Phone code
            <input
              type="text"
              value={form.phoneCode}
              onChange={(event) => setForm((prev) => ({ ...prev, phoneCode: event.target.value }))}
              placeholder="e.g. +1"
              className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Phone number
            <input
              type="text"
              value={form.phoneNumber}
              onChange={(event) => setForm((prev) => ({ ...prev, phoneNumber: event.target.value }))}
              placeholder="Optional"
              className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Status
            <select
              value={form.status}
              onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as User['status'] }))}
              className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Client type
            <select
              value={form.clientType}
              onChange={(event) => setForm((prev) => ({ ...prev, clientType: event.target.value as ClientType }))}
              className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="C2B">C2B</option>
              <option value="B2B">B2B</option>
            </select>
          </label>
        </div>

        <div className="space-y-4 rounded-2xl border border-dashed border-border p-4">
          <div>
            <h4 className="text-sm font-semibold text-slate-800">Company details</h4>
            <p className="text-xs text-slate-500">Only relevant for B2B clients. Leave blank if unavailable.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Company name
              <input
                type="text"
                value={form.companyName}
                onChange={(event) => setForm((prev) => ({ ...prev, companyName: event.target.value }))}
                placeholder="e.g. ULK Supply"
                className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                disabled={form.clientType !== 'B2B'}
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Company phone
              <input
                type="text"
                value={form.companyPhone}
                onChange={(event) => setForm((prev) => ({ ...prev, companyPhone: event.target.value }))}
                placeholder="Optional"
                className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                disabled={form.clientType !== 'B2B'}
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Business type
              <input
                type="text"
                value={form.companyBusinessType}
                onChange={(event) => setForm((prev) => ({ ...prev, companyBusinessType: event.target.value }))}
                placeholder="Optional"
                className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                disabled={form.clientType !== 'B2B'}
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Tax ID
              <input
                type="text"
                value={form.companyTaxId}
                onChange={(event) => setForm((prev) => ({ ...prev, companyTaxId: event.target.value }))}
                placeholder="Optional"
                className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                disabled={form.clientType !== 'B2B'}
              />
            </label>
          </div>

          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Company address
            <textarea
              value={form.companyAddress}
              onChange={(event) => setForm((prev) => ({ ...prev, companyAddress: event.target.value }))}
              placeholder="Optional"
              className="min-h-[80px] rounded-xl border border-border bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={form.clientType !== 'B2B'}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Company website
            <input
              type="text"
              value={form.companyWebsite}
              onChange={(event) => setForm((prev) => ({ ...prev, companyWebsite: event.target.value }))}
              placeholder="Optional"
              className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={form.clientType !== 'B2B'}
            />
          </label>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
            disabled={submitting || (!canManageClients && !editingId)}
          >
            {submitting ? 'Saving…' : editingId ? 'Save changes' : 'Create client'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-primary hover:text-primary"
              disabled={submitting}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {pendingDelete && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900">Remove client</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Are you sure you want to remove « {pendingDelete.name || pendingDelete.email || pendingDelete.id} »?
                </p>
                <p className="mt-2 text-xs font-semibold text-red-500">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  if (!deletingId) {
                    setPendingDelete(null);
                  }
                }}
                className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                disabled={Boolean(deletingId)}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(pendingDelete.id)}
                className="inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={Boolean(deletingId)}
              >
                {deletingId === pendingDelete.id ? 'Removing…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

const forbiddenError = () => Object.assign(new Error('FORBIDDEN'), { message: 'FORBIDDEN' });
