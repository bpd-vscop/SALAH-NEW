import { useCallback, useEffect, useState } from 'react';
import { usersApi, type CreateUserPayload, type ListUsersParams, type UpdateUserPayload } from '../../../api/users';
import type { ClientType, User, UserRole } from '../../../types/api';
import type { StatusSetter } from '../types';
import { StatusPill } from '../../common/StatusPill';
import { formatTimestamp } from '../../../utils/format';
import { cn } from '../../../utils/cn';
import { PhoneNumberInput, type PhoneNumberInputValue } from '../../common/PhoneInput';
import { BusinessTypeSelect } from '../../common/BusinessTypeSelect';
import { isBusinessTypeOption, type BusinessTypeOption } from '../../../data/businessTypes';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';

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
  const [phoneValue, setPhoneValue] = useState<PhoneNumberInputValue>({ countryCode: '+1', number: '' });
  const [formStep, setFormStep] = useState<1 | 2>(1);
  const [useCustomBusinessType, setUseCustomBusinessType] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

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
    setPhoneValue({ countryCode: '+1', number: '' });
    setFormStep(1);
    setUseCustomBusinessType(false);
    setFormError(null);
  };

  const handleEdit = (client: User) => {
    setEditingId(client.id);
    setForm({
      name: client.name ?? '',
      email: client.email ?? '',
      status: client.status,
      clientType: client.clientType ?? 'C2B',
      companyName: client.company?.name ?? '',
      companyPhone: client.company?.phone ?? '',
      companyAddress: client.company?.address ?? '',
      companyBusinessType: client.company?.businessType ?? '',
      companyTaxId: client.company?.taxId ?? '',
      companyWebsite: client.company?.website ?? '',
    });
    setPhoneValue({
      countryCode: client.phoneCode ?? '+1',
      number: client.phoneNumber ?? '',
    });
    setUseCustomBusinessType(
      !!client.company?.businessType && !isBusinessTypeOption(client.company.businessType)
    );
    setFormError(null);
  };

  const handleBusinessTypePresetSelect = (option: BusinessTypeOption) => {
    setUseCustomBusinessType(false);
    setForm((prev) => ({ ...prev, companyBusinessType: option }));
  };

  const handleEnableCustomBusinessType = () => {
    setUseCustomBusinessType(true);
    setForm((prev) => ({ ...prev, companyBusinessType: '' }));
  };

  const handleCustomBusinessTypeChange = (value: string) => {
    setForm((prev) => ({ ...prev, companyBusinessType: value }));
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
    const trimmedPhoneCode = phoneValue.countryCode.trim();
    const trimmedPhoneNumber = phoneValue.number.trim();
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
    <section className="space-y-6 rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Registered clients</h2>
      </div>

      {localError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {localError}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_480px]">
        {/* Table Section */}
        <div className="flex flex-col gap-3">
          {/* Filters above table */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSort('recent')}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition',
                  sort === 'recent' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                Recent
              </button>
              <button
                type="button"
                onClick={() => setSort('name-asc')}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition',
                  sort === 'name-asc' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                A-Z
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
                className="h-10 rounded-xl border border-border bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">Type</option>
                <option value="B2B">B2B</option>
                <option value="C2B">C2B</option>
              </select>
              <select
                value={verificationFilter}
                onChange={(event) => setVerificationFilter(event.target.value as VerificationFilter)}
                className="h-10 rounded-xl border border-border bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">Verification</option>
                <option value="verified">Verified</option>
                <option value="pending">Awaiting verification</option>
              </select>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                className="h-10 rounded-xl border border-border bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <div className="relative w-full sm:w-auto">
                <motion.div
                  animate={{ width: searchOpen ? '100%' : 40 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <AnimatePresence mode="wait">
                    {searchOpen ? (
                      <motion.div
                        key="search-input"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="relative"
                      >
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="search"
                          value={searchInput}
                          onChange={(event) => setSearchInput(event.target.value)}
                          placeholder="Search by name or email"
                          className="h-10 w-full rounded-xl border border-border bg-white pl-9 pr-9 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        {searchInput && (
                          <button
                            type="button"
                            onClick={() => setSearchInput('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            aria-label="Clear search"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </motion.div>
                    ) : (
                      <motion.button
                        key="search-icon"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        type="button"
                        className="h-10 w-10 flex items-center justify-center rounded-xl border border-border bg-white text-slate-600 hover:bg-slate-100"
                        onClick={() => setSearchOpen(true)}
                        aria-label="Open search"
                      >
                        <Search className="h-4 w-4" />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="max-h-[600px] overflow-auto rounded-2xl border border-border bg-background">
            <table className="min-w-full divide-y divide-border text-left text-sm">
              <thead className="sticky top-0 z-10 bg-background text-xs uppercase tracking-wide text-muted">
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
              <tbody className="divide-y divide-border bg-surface">
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

        {/* Form Sidebar */}
        <form
          onSubmit={handleSubmit}
          className={cn(
            'flex flex-col gap-4 rounded-2xl border p-6 shadow-sm transition-all duration-300',
            editingId
              ? 'border-blue-300 bg-blue-50/50 ring-2 ring-blue-200/50'
              : 'border-border bg-background'
          )}
        >
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              {editingId ? 'Edit client details' : `Create client record${formStep === 2 ? ` - Step 2` : ''}`}
            </h3>
            <p className="text-sm text-slate-600">
              {editingId
                ? 'Update client information and company details.'
                : formStep === 1
                ? 'Enter basic client information to get started.'
                : form.clientType === 'B2B'
                ? 'Provide company details for this B2B client.'
                : 'Review and create the client record.'}
            </p>
          </div>

          {!canManageClients && !editingId && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              You do not have permission to create new clients.
            </div>
          )}

          {formError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</div>
          )}

          {/* Step 1 or Edit Mode: Basic Info */}
          {(editingId || formStep === 1) && (
            <>
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

              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Phone Number
                <PhoneNumberInput
                  value={phoneValue}
                  onChange={setPhoneValue}
                  placeholder="1234567890"
                />
              </label>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-600">Status</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {(['active', 'inactive'] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, status }))}
                      className={`rounded-full px-2 py-1.5 border font-semibold cursor-pointer transition-all duration-300 ease-in-out ${
                        form.status === status
                          ? 'text-white scale-[1.01]'
                          : 'border-slate-400/40 bg-white/70 text-slate-600 hover:border-slate-400/55 hover:bg-white/95 hover:-translate-y-0.5 hover:shadow-md'
                      }`}
                      style={
                        form.status === status
                          ? {
                              background: status === 'active' 
                                ? 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)' 
                                : 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                              borderColor: status === 'active' ? '#22c55e' : '#ef4444',
                            }
                          : undefined
                      }
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-600">Client type</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {(['C2B', 'B2B'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        if (!editingId) {
                          setForm((prev) => ({ ...prev, clientType: type }));
                        }
                      }}
                      disabled={!!editingId}
                      className={cn(
                        `rounded-full px-2 py-1.5 border font-semibold cursor-pointer transition-all duration-300 ease-in-out ${
                          form.clientType === type
                            ? 'text-white scale-[1.01]'
                            : 'border-slate-400/40 bg-white/70 text-slate-600 hover:border-slate-400/55 hover:bg-white/95 hover:-translate-y-0.5 hover:shadow-md'
                        }`,
                        editingId && 'cursor-not-allowed opacity-50'
                      )}
                      style={
  form.clientType === type
    ? {
        background: type === 'C2B' 
          ? 'linear-gradient(135deg, #60a5fa 0%, #1d4ed8 100%)' 
          : 'linear-gradient(135deg, #f6b210 0%, #a00b0b 100%)',
        borderColor: type === 'C2B' ? '#60a5fa' : '#a00b0b',
      }
    : undefined
}
                    >
                      {type === 'B2B' ? 'Business (B2B)' : 'Individual (C2B)'}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Step 2 or Edit Mode: Additional Details */}
          {(editingId || formStep === 2) && (
            <>
              {form.clientType === 'B2B' && (
                <div className="space-y-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">Company details</h4>
                    <p className="text-xs text-slate-500">Provide business information for this B2B client.</p>
                  </div>

                  <label className="flex flex-col gap-2 text-sm text-slate-600">
                    Company name
                    <input
                      type="text"
                      value={form.companyName}
                      onChange={(event) => setForm((prev) => ({ ...prev, companyName: event.target.value }))}
                      placeholder="e.g. ULK Supply"
                      className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-sm text-slate-600">
                    Business type
                    <BusinessTypeSelect
                      value={
                        !useCustomBusinessType && isBusinessTypeOption(form.companyBusinessType)
                          ? form.companyBusinessType
                          : ''
                      }
                      onSelect={handleBusinessTypePresetSelect}
                      onSelectCustom={handleEnableCustomBusinessType}
                      placeholder="Select business type"
                    />
                    {useCustomBusinessType && (
                      <div className="grid gap-2 pt-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                        <input
                          type="text"
                          value={form.companyBusinessType}
                          onChange={(event) => handleCustomBusinessTypeChange(event.target.value)}
                          className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          placeholder="Enter your business type"
                        />
                        <button
                          type="button"
                          className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold uppercase tracking-wide text-slate-700 transition hover:bg-slate-100"
                          onClick={() => {
                            setUseCustomBusinessType(false);
                            setForm((prev) => ({ ...prev, companyBusinessType: '' }));
                          }}
                        >
                          Choose preset
                        </button>
                      </div>
                    )}
                  </label>

                  <label className="flex flex-col gap-2 text-sm text-slate-600">
                    Company phone
                    <input
                      type="text"
                      value={form.companyPhone}
                      onChange={(event) => setForm((prev) => ({ ...prev, companyPhone: event.target.value }))}
                      placeholder="Optional"
                      className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-sm text-slate-600">
                    Company address
                    <textarea
                      value={form.companyAddress}
                      onChange={(event) => setForm((prev) => ({ ...prev, companyAddress: event.target.value }))}
                      placeholder="Optional"
                      className="min-h-[80px] rounded-xl border border-border bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                    />
                  </label>
                </div>
              )}

              {!editingId && form.clientType === 'C2B' && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                  C2B clients don't require additional company details. Click "Create client" to finish.
                </div>
              )}
            </>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            {!editingId && formStep === 1 && (
              <button
                type={form.clientType === 'C2B' ? 'submit' : 'button'}
                onClick={form.clientType === 'B2B' ? () => setFormStep(2) : undefined}
                className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
                disabled={submitting || !canManageClients}
              >
                {submitting ? 'Creating…' : form.clientType === 'C2B' ? 'Create client' : 'Next'}
              </button>
            )}

            {!editingId && formStep === 2 && (
              <>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={submitting || !canManageClients}
                >
                  {submitting ? 'Creating…' : 'Create client'}
                </button>
                <button
                  type="button"
                  onClick={() => setFormStep(1)}
                  className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-primary hover:text-primary"
                  disabled={submitting}
                >
                  Back
                </button>
              </>
            )}

            {editingId && (
              <>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={submitting || !canManageClients}
                >
                  {submitting ? 'Saving…' : 'Save changes'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-primary hover:text-primary"
                  disabled={submitting}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </form>
      </div>

      {pendingDelete && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl">
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