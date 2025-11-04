import { useCallback, useEffect, useMemo, useState } from 'react';
import { usersApi, type CreateUserPayload, type ListUsersParams, type UpdateUserPayload } from '../../../api/users';
import type { User, UserRole } from '../../../types/api';
import type { StatusSetter } from '../types';
import { StatusPill } from '../../common/StatusPill';
import { PASSWORD_COMPLEXITY_MESSAGE, evaluatePasswordStrength, meetsPasswordPolicy } from '../../../utils/password';
import { formatTimestamp } from '../../../utils/format';
import { cn } from '../../../utils/cn';

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
  phoneCode: string;
  phoneNumber: string;
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
  phoneCode: '',
  phoneNumber: '',
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
      phoneCode: candidate.phoneCode ?? '',
      phoneNumber: candidate.phoneNumber ?? '',
    });
    setFormError(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(buildEmptyForm(defaultRole));
    setFormError(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const validateStaffForm = (isCreating: boolean): { payload: CreateUserPayload | UpdateUserPayload; target?: User } | null => {
    const trimmedName = form.name.trim();
    const trimmedUsername = form.username.trim();
    const trimmedEmail = form.email.trim();
    const trimmedPhoneCode = form.phoneCode.trim();
    const trimmedPhoneNumber = form.phoneNumber.trim();

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
      if (trimmedPhoneCode) {
        payload.phoneCode = trimmedPhoneCode;
      }
      if (trimmedPhoneNumber) {
        payload.phoneNumber = trimmedPhoneNumber;
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

    const payload: UpdateUserPayload = {
      name: trimmedName,
      username: trimmedUsername,
      status: form.status,
      role: desiredRole,
      phoneCode: trimmedPhoneCode || null,
      phoneNumber: trimmedPhoneNumber || null,
    };

    if (trimmedEmail) {
      payload.email = trimmedEmail.toLowerCase();
    }
    if (form.password) {
      payload.password = form.password;
    }

    return { payload, target };
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
      if (isCreating) {
        await usersApi.create(validation.payload as CreateUserPayload);
        setStatus('Team member created');
        resetForm();
      } else if (editingId) {
        await usersApi.update(editingId, validation.payload as UpdateUserPayload);
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
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-white/80 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Team members</h2>
            <p className="text-sm text-slate-600">Manage administrative and staff accounts.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by name or email"
                className="h-10 w-56 rounded-xl border border-border bg-white px-4 pr-10 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
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
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
              className="h-10 rounded-xl border border-border bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {roleFilterOptions.map((option) => (
                <option key={option} value={option}>
                  {option === 'all' ? 'All roles' : option.replace('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase())}
                </option>
              ))}
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
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Username</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Created</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
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

      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-border bg-white/80 p-6 shadow-sm">
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

        <div className="grid gap-4 md:grid-cols-2">
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
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Role
              <select
                value={form.role}
                onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value as UserRole }))}
                className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
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
              >
                {[...new Set([...assignableRoles, form.role])]
                  .filter((candidate) => candidate !== 'client')
                  .map((candidate) => (
                    <option key={candidate} value={candidate}>
                      {candidate.replace('_', ' ')}
                    </option>
                  ))}
              </select>
            </label>
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
          </div>
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary"
              >
                {showPassword ? 'Hide' : 'Show'}
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary"
              >
                {showConfirmPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>
        </div>

        <div className="flex items-center gap-3">
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
