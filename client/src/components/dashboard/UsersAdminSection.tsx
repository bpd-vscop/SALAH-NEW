import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { StatusPill } from '../common/StatusPill';
import type { User } from '../../types/api';
import type { UserFormState } from './types';

interface UsersAdminSectionProps {
  users: User[];
  loading: boolean;
  form: UserFormState;
  setForm: Dispatch<SetStateAction<UserFormState>>;
  selectedUserId: string;
  onSelectUser: (id: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  canEditUsers: boolean;
  canManageUsers: boolean;
}

export const UsersAdminSection: React.FC<UsersAdminSectionProps> = ({
  users,
  loading,
  form,
  setForm,
  selectedUserId,
  onSelectUser,
  onSubmit,
  onDelete,
  canEditUsers,
  canManageUsers,
}) => (
  <section className="space-y-6 rounded-2xl border border-border bg-surface p-6 shadow-sm">
    <div className="flex justify-end">
      {loading && <span className="text-xs text-muted">Loading...</span>}
    </div>
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="overflow-hidden rounded-xl border border-border bg-background">
        <table className="min-w-full divide-y divide-border text-left text-sm">
          <thead className="bg-background/80 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Username</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {users.map((record) => (
              <tr key={record.id} className="hover:bg-primary/5">
                <td className="px-4 py-3 font-medium text-slate-900">{record.name}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{record.username}</td>
                <td className="px-4 py-3 text-sm text-slate-600 capitalize">{record.role}</td>
                <td className="px-4 py-3">
                  <StatusPill
                    label={record.status}
                    tone={record.status === 'active' ? 'positive' : 'warning'}
                  />
                </td>
                <td className="flex items-center justify-end gap-2 px-4 py-3">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-xl border border-border px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-primary hover:text-primary"
                    onClick={() => onSelectUser(record.id)}
                  >
                    Edit
                  </button>
                  {canManageUsers && (
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50"
                      onClick={() => void onDelete(record.id)}
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!users.length && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted">
                  No users yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <form className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-6 shadow-sm" onSubmit={onSubmit}>
        <label className="flex flex-col gap-2 text-sm text-slate-600">
          Name
          <input
            type="text"
            value={form.name}
            onChange={(event) => setForm((state) => ({ ...state, name: event.target.value }))}
            required
            className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-600">
          Username
          <input
            type="text"
            value={form.username}
            onChange={(event) => setForm((state) => ({ ...state, username: event.target.value }))}
            required
            className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-600">
          Role
          <select
            value={form.role}
            onChange={(event) => setForm((state) => ({ ...state, role: event.target.value as UserFormState['role'] }))}
            disabled={!canEditUsers}
            className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="client">Client</option>
            <option value="staff">Staff</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-600">
          Status
          <select
            value={form.status}
            onChange={(event) => setForm((state) => ({ ...state, status: event.target.value as User['status'] }))}
            className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-600">
          Password {selectedUserId ? '(leave blank to keep current)' : ''}
          <input
            type="password"
            value={form.password}
            onChange={(event) => setForm((state) => ({ ...state, password: event.target.value }))}
            minLength={selectedUserId ? 0 : 8}
            required={!selectedUserId}
            className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={!canEditUsers}
        >
          {selectedUserId ? 'Save changes' : 'Create user'}
        </button>
        {selectedUserId && (
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted transition hover:border-primary hover:text-primary"
            onClick={() => onSelectUser('')}
          >
            Cancel
          </button>
        )}
      </form>
    </div>
  </section>
);

