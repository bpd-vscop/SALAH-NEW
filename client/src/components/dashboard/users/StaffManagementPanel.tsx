import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, Search, X } from 'lucide-react';
import { usersApi, type CreateUserPayload, type ListUsersParams, type UpdateUserPayload } from '../../../api/users';
import type { User, UserRole } from '../../../types/api';
import type { StatusSetter } from '../types';
import { StatusPill } from '../../common/StatusPill';
import { PASSWORD_COMPLEXITY_MESSAGE, evaluatePasswordStrength, meetsPasswordPolicy } from '../../../utils/password';
import { formatTimestamp } from '../../../utils/format';
import { cn } from '../../../utils/cn';
import { PhoneNumberInput, type PhoneNumberInputValue } from '../../common/PhoneInput';
import { motion, AnimatePresence } from 'framer-motion';
import { Select } from '../../ui/Select';

interface StaffManagementPanelProps {
  role: UserRole;
  currentUserId: string;
  setStatus: StatusSetter;
}

type SortOption = 'recent' | 'name-asc' | 'name-desc';
type StatusFilter = 'all' | 'active' | 'inactive';
type RoleFilter = 'all' | 'staff' | 'admin' | 'super_admin';

interface StaffFormState {
  name: string;
  email: string;
  username: string;
  role: UserRole;
  status: User['status'];
  password: string;
  confirmPassword: string;
}

const ROLE_RANK: Record<UserRole, number> = {
  client: 0,
  staff: 1,
  admin: 2,
  super_admin: 3,
};

const BASE_ROLES_BY_ACTOR: Record<UserRole, UserRole[]> = {
  super_admin: ['super_admin', 'admin', 'staff'],
  admin: ['admin', 'staff'],
  staff: ['staff'],
  client: [],
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const EMAIL_DOMAINS = [
  '@gmail.com',
  '@yahoo.com',
  '@outlook.com',
  '@hotmail.com',
  '@icloud.com',
  '@aol.com',
  '@protonmail.com',
  '@zoho.com',
  '@mail.com',
  '@yandex.com',
];

const SORT_TO_QUERY: Record<SortOption, ListUsersParams['sort']> = {
  recent: 'recent',
  'name-asc': 'name-asc',
  'name-desc': 'name-desc',
};

const toneForStatus = (status: User['status']) => (status === 'active' ? 'positive' : 'warning');

const isTeamRole = (value: UserRole): value is Exclude<UserRole, 'client'> => value !== 'client';

const buildEmptyForm = (defaultRole: UserRole): StaffFormState => ({
  name: '',
  email: '',
  username: '',
  role: defaultRole,
  status: 'active',
  password: '',
  confirmPassword: '',
});

export const StaffManagementPanel: React.FC<StaffManagementPanelProps> = ({ role, currentUserId, setStatus }) => {
  const baseRoles = useMemo(() => {
    const roles = BASE_ROLES_BY_ACTOR[role] ?? ['staff'];
    return roles.filter((candidate) => candidate !== 'client');
  }, [role]);

  const assignableRoles = useMemo(() => {
    const actorRank = ROLE_RANK[role] ?? 0;
    return baseRoles.filter((candidate) => actorRank > (ROLE_RANK[candidate] ?? 0));
  }, [baseRoles, role]);

  const defaultRole = assignableRoles[0] ?? baseRoles[0] ?? 'staff';

  const [records, setRecords] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [sort, setSort] = useState<SortOption>('recent');
  const [form, setForm] = useState<StaffFormState>(() => buildEmptyForm(defaultRole));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [phoneValue, setPhoneValue] = useState<PhoneNumberInputValue>({ countryCode: '+1', number: '' });
  const [searchOpen, setSearchOpen] = useState(false);
  const [emailSuggestion, setEmailSuggestion] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!editingId) {
      setForm(buildEmptyForm(defaultRole));
      setFormError(null);
      setShowPassword(false);
      setShowConfirmPassword(false);
      setEmailSuggestion('');
    }
  }, [defaultRole, editingId]);

  useEffect(() => {
    if (roleFilter === 'super_admin' && !baseRoles.includes('super_admin')) {
      setRoleFilter('all');
    }
  }, [baseRoles, roleFilter]);

  const loadStaff = useCallback(async () => {
    if (!baseRoles.length) {
      setRecords([]);
      return;
    }
    const params: ListUsersParams = {
      role: roleFilter === 'all' ? baseRoles : [roleFilter as UserRole],
      sort: SORT_TO_QUERY[sort],
    };
    if (statusFilter !== 'all') {
      params.status = statusFilter;
    }
    if (debouncedSearch) {
      params.search = debouncedSearch;
    }
    setLoading(true);
    setLocalError(null);
    try {
      const response = await usersApi.list(params);
      const team = response.users.filter((member) => member.role !== 'client');
      setRecords(team);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Failed to load team members';
      setLocalError(message);
      setStatus(null, message);
    } finally {
      setLoading(false);
    }
  }, [baseRoles, debouncedSearch, roleFilter, sort, statusFilter, setStatus]);

  useEffect(() => {
    void loadStaff();
  }, [loadStaff]);

  const passwordStrength = useMemo(() => evaluatePasswordStrength(form.password), [form.password]);

  const canCreate = assignableRoles.length > 0;

  const actorRank = ROLE_RANK[role] ?? 0;

  const canEditUserRecord = useCallback(
    (candidate: User) => {
      if (candidate.id === currentUserId) {
        return true;
      }
      return actorRank > (ROLE_RANK[candidate.role] ?? 0);
    },
    [actorRank, currentUserId]
  );

  const canDeleteUserRecord = useCallback(
    (candidate: User) => {
      if (role !== 'super_admin') {
        return false;
      }
      if (candidate.id === currentUserId) {
        return false;
      }
      return actorRank > (ROLE_RANK[candidate.role] ?? 0);
    },
    [actorRank, currentUserId, role]
  );

  const handleEdit = (candidate: User) => {
    setEditingId(candidate.id);
    setForm({
      name: candidate.name ?? '',
      email: candidate.email ?? '',
      username: candidate.username ?? '',
      role: candidate.role,
      status: candidate.status,
      password: '',
      confirmPassword: '',
    });
    setPhoneValue({
      countryCode: candidate.phoneCode ?? '+1',
      number: candidate.phoneNumber ?? '',
    });
    setFormError(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setEmailSuggestion('');
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(buildEmptyForm(defaultRole));
    setPhoneValue({ countryCode: '+1', number: '' });
    setFormError(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setEmailSuggestion('');
  };

  const handleEmailChange = (value: string) => {
    const lowerValue = value.toLowerCase();
    setForm((prev) => ({ ...prev, email: lowerValue }));

    if (!lowerValue) {
      setEmailSuggestion('');
    } else if (!lowerValue.includes('@')) {
      setEmailSuggestion(`${lowerValue}@gmail.com`);
    } else if (!lowerValue.includes('.')) {
      const afterAt = lowerValue.split('@')[1] || '';
      const suggestion = EMAIL_DOMAINS.find((domain) =>
        domain.toLowerCase().startsWith(`@${afterAt.toLowerCase()}`)
      );
      if (suggestion) {
        setEmailSuggestion(`${lowerValue.split('@')[0]}${suggestion}`);
      } else {
        setEmailSuggestion('');
      }
    } else {
      setEmailSuggestion('');
    }
  };

  const handleEmailKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Tab' && emailSuggestion) {
      event.preventDefault();
      setForm((prev) => ({ ...prev, email: emailSuggestion }));
      setEmailSuggestion('');
    }
  };

  const validateStaffForm = (
    isCreating: boolean
  ): { payload: CreateUserPayload | UpdateUserPayload; phoneUpdate?: UpdateUserPayload } | null => {
    const trimmedName = form.name.trim();
    const trimmedUsername = form.username.trim();
    const trimmedEmail = form.email.trim();
    const trimmedPhoneCode = phoneValue.countryCode.trim();
    const trimmedPhoneNumber = phoneValue.number.trim();

    if (!trimmedName) {
      setFormError('Name is required');
      return null;
    }

    if (!trimmedUsername) {
      setFormError('Username is required');
      return null;
    }

    if (trimmedUsername.length < 3) {
      setFormError('Username must be at least 3 characters');
      return null;
    }

    if (trimmedEmail && !EMAIL_REGEX.test(trimmedEmail)) {
      setFormError('Enter a valid email address');
      return null;
    }

    if (isCreating) {
      if (!isTeamRole(form.role) || !assignableRoles.includes(form.role)) {
        setFormError('You do not have permission to create this role');
        return null;
      }

      const trimmedPassword = form.password.trim();

      if (!trimmedPassword) {
        setFormError('Password is required');
        return null;
      }

      if (trimmedPassword !== form.confirmPassword.trim()) {
        setFormError('Passwords do not match');
        return null;
      }

      if (!meetsPasswordPolicy(trimmedPassword)) {
        setFormError(PASSWORD_COMPLEXITY_MESSAGE);
        return null;
      }

      const payload: CreateUserPayload = {
        role: form.role,
        status: form.status,
        name: trimmedName,
        username: trimmedUsername,
        password: trimmedPassword,
      };

      if (trimmedEmail) {
        payload.email = trimmedEmail.toLowerCase();
      }

      if (trimmedPhoneNumber) {
        const phoneUpdate: UpdateUserPayload = {
          phoneNumber: trimmedPhoneNumber,
          phoneCode: trimmedPhoneCode || '+1',
        };
        return { payload, phoneUpdate };
      }

      return { payload };
    }

    const target = records.find((record) => record.id === editingId);

    if (!target) {
      setFormError('Unable to locate the selected team member');
      return null;
    }

    if (!isTeamRole(form.role)) {
      setFormError('Invalid role selection');
      return null;
    }

    const desiredRole = form.role;
    const desiredRank = ROLE_RANK[desiredRole] ?? 0;
    const targetRank = ROLE_RANK[target.role] ?? 0;

    if (target.id === currentUserId) {
      if (desiredRank > actorRank) {
        setFormError('You cannot elevate your own role');
        return null;
      }
    } else {
      if (actorRank <= targetRank) {
        setFormError('You do not have permission to update this account');
        return null;
      }

      if (actorRank <= desiredRank) {
        setFormError('You cannot assign a role equal or higher than your own');
        return null;
      }
    }

    if (form.password) {
      if (form.password !== form.confirmPassword) {
        setFormError('Passwords do not match');
        return null;
      }

      if (!meetsPasswordPolicy(form.password)) {
        setFormError(PASSWORD_COMPLEXITY_MESSAGE);
        return null;
      }
    }

    const hasPhone = Boolean(trimmedPhoneNumber);

    const payload: UpdateUserPayload = {
      name: trimmedName,
      username: trimmedUsername,
      status: form.status,
      role: desiredRole,
      phoneCode: hasPhone ? trimmedPhoneCode || '+1' : null,
      phoneNumber: hasPhone ? trimmedPhoneNumber : null,
    };

    if (trimmedEmail) {
      payload.email = trimmedEmail.toLowerCase();
    }

    if (form.password) {
      payload.password = form.password;
    }

    return { payload };
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    setFormError(null);

    const isCreating = !editingId;
    const validation = validateStaffForm(isCreating);

    if (!validation) {
      return;
    }

    setSubmitting(true);

    try {
      const { payload, phoneUpdate } = validation;
      if (isCreating) {
        const { user } = await usersApi.create(payload as CreateUserPayload);
        if (phoneUpdate) {
          await usersApi.update(user.id, phoneUpdate);
        }
        setStatus('Team member created');
        resetForm();
      } else if (editingId) {
        await usersApi.update(editingId, payload as UpdateUserPayload);
        setStatus('Team member updated');
        resetForm();
      }
      await loadStaff();
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Unable to save team member';
      setFormError(message);
      setStatus(null, message);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await usersApi.delete(id);
      setStatus('Team member removed');
      if (editingId === id) {
        resetForm();
      }
      await loadStaff();
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Unable to delete team member';
      setStatus(null, message);
    } finally {
      setDeletingId(null);
      setPendingDelete(null);
    }
  };

  const roleFilterOptions = useMemo(() => {
    const options: RoleFilter[] = ['all'];
    baseRoles.forEach((candidate) => {
      if (!options.includes(candidate as RoleFilter)) {
        options.push(candidate as RoleFilter);
      }
    });
    return options;
  }, [baseRoles]);

  return (
    <section className="space-y-6 rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Team members</h2>
      </div>

      {localError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {localError}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_450px]">
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
              <Select
                value={roleFilter}
                onChange={(value) => setRoleFilter(value as RoleFilter)}
                options={roleFilterOptions.map(option => ({
                  value: option,
                  label: option === 'all' ? 'Role' : option.replace('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase())
                }))}
                placeholder="Role"
                className="min-w-[130px]"
              />
              <Select
                value={statusFilter}
                onChange={(value) => setStatusFilter(value as StatusFilter)}
                options={[
                  { value: 'all', label: 'Status' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
                placeholder="Status"
                className="min-w-[120px]"
              />
              <div className="relative w-full sm:w-auto">
                <motion.div
                  animate={{ width: searchOpen ? 300 : 40 }}
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
                          type="text"
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
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Username</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {loading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-muted">
                      Loading team members...
                    </td>
                  </tr>
                )}
                {!loading && records.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-muted">
                      No team members found.
                    </td>
                  </tr>
                )}
                {!loading &&
                  records.map((member) => {
                    const isEditing = editingId === member.id;
                    return (
                      <tr
                        key={member.id}
                        className={cn(
                          'transition hover:bg-primary/5',
                          isEditing && 'bg-primary/10'
                        )}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{member.name}</div>
                          <div className="text-xs text-slate-500">{member.email || '—'}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{member.username}</td>
                        <td className="px-4 py-3 capitalize text-sm text-slate-600">{member.role.replace('_', ' ')}</td>
                        <td className="px-4 py-3">
                          <StatusPill label={member.status === 'active' ? 'Active' : 'Inactive'} tone={toneForStatus(member.status)} />
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">{formatTimestamp(member.accountCreated)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(member)}
                              className="inline-flex items-center rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-primary hover:text-primary"
                              disabled={!canEditUserRecord(member)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingDelete(member)}
                              className="inline-flex items-center rounded-xl border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                              disabled={!canDeleteUserRecord(member)}
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
            <h3 className="text-base font-semibold text-slate-900">{editingId ? 'Edit team member' : 'Add team member'}</h3>
            <p className="text-sm text-slate-600">Fill in the details below to {editingId ? 'update' : 'create'} an account.</p>
          </div>

          {!canCreate && !editingId && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              You do not have permission to create new team members.
            </div>
          )}

          {formError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</div>
          )}

          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Full name
            <input
              type="text"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="e.g. Jane Doe"
              className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Email
            <div className="relative rounded-xl bg-white">
              {emailSuggestion && form.email && (
                <div
                  className="absolute inset-0 flex items-center overflow-hidden whitespace-nowrap px-4 pointer-events-none"
                  aria-hidden="true"
                >
                  <span className="opacity-0 text-sm">{form.email}</span>
                  <span className="text-red-300/70 text-sm">
                    {emailSuggestion.slice(form.email.length)}
                  </span>
                </div>
              )}
              <input
                type="email"
                value={form.email}
                onChange={(event) => handleEmailChange(event.target.value)}
                onKeyDown={handleEmailKeyDown}
                placeholder="Optional"
                className="h-11 w-full rounded-xl border border-border bg-transparent px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            {emailSuggestion && form.email && (
              <span className="text-xs text-slate-400">Press Tab to complete</span>
            )}
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Username
            <input
              type="text"
              value={form.username}
              onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
              placeholder="e.g. jane.doe"
              className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Role
            <Select
              value={form.role}
              onChange={(value) => setForm((prev) => ({ ...prev, role: value as UserRole }))}
              options={[...new Set([...assignableRoles, form.role])]
                .filter((candidate) => candidate !== 'client')
                .map((candidate) => ({
                  value: candidate,
                  label: candidate.replace('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase())
                }))}
              placeholder="Select role"
              disabled={(() => {
                if (!editingId) {
                  return !canCreate;
                }
                const editingTarget = records.find((record) => record.id === editingId);
                if (!editingTarget) {
                  return true;
                }
                if (editingTarget.id === currentUserId) {
                  return false;
                }
                return !(actorRank > (ROLE_RANK[editingTarget.role] ?? 0));
              })()}
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

          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Phone Number
            <PhoneNumberInput
              value={phoneValue}
              onChange={setPhoneValue}
              placeholder="1234567890"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-600">
            {editingId ? 'New password' : 'Password'}
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                placeholder={editingId ? 'Leave blank to keep current password' : 'Strong password required'}
                className={cn(
                  'h-11 w-full rounded-xl border px-4 text-sm focus:outline-none',
                  form.password
                    ? `${passwordStrength.borderClass} ${passwordStrength.focusClass}`
                    : 'border-border focus:border-primary focus:ring-2 focus:ring-primary/20'
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {form.password && passwordStrength.label && (
              <span className={cn('text-xs font-semibold', passwordStrength.colorClass)}>
                {passwordStrength.label}
              </span>
            )}
            {!editingId && (
              <span className="text-xs text-slate-400">{PASSWORD_COMPLEXITY_MESSAGE}</span>
            )}
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Confirm password
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={(event) => setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                placeholder="Repeat password"
                className="h-11 w-full rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </label>

          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
            disabled={submitting || (!canCreate && !editingId)}
          >
            {submitting ? 'Saving…' : editingId ? 'Save changes' : 'Create team member'}
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
                <h3 className="text-lg font-semibold text-slate-900">Remove team member</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Are you sure you want to remove « {pendingDelete.name || pendingDelete.username} » from the team?
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
                onClick={() => confirmDelete(pendingDelete.id)}
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
