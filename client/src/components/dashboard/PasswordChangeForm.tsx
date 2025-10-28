import { useState, type FormEvent } from 'react';
import { usersApi } from '../../api/users';

interface PasswordChangeFormProps {
  userId: string;
}

export const PasswordChangeForm: React.FC<PasswordChangeFormProps> = ({ userId }) => {
  const [step, setStep] = useState<'initial' | 'code-sent' | 'success'>('initial');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [previewCode, setPreviewCode] = useState<string | null>(null);

  const handleRequestCode = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await usersApi.requestPasswordChange(userId);
      setMessage(response.message);
      setStep('code-sent');

      // In development, show the preview code
      if (response.previewCode) {
        setPreviewCode(response.previewCode);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);

    try {
      const response = await usersApi.changePassword(userId, {
        code,
        newPassword,
      });
      setMessage(response.message);
      setStep('success');
      setCode('');
      setNewPassword('');
      setConfirmPassword('');
      setPreviewCode(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleStartOver = () => {
    setStep('initial');
    setCode('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setMessage(null);
    setPreviewCode(null);
  };

  if (step === 'success') {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-start gap-3">
            <svg className="h-6 w-6 text-emerald-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="font-semibold text-emerald-900">Password Changed Successfully</p>
              <p className="text-sm text-emerald-700 mt-1">{message || 'Your password has been updated.'}</p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleStartOver}
          className="text-sm font-medium text-primary hover:text-primary-dark transition"
        >
          Change password again
        </button>
      </div>
    );
  }

  if (step === 'code-sent') {
    return (
      <form onSubmit={handleChangePassword} className="space-y-4">
        {message && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-800">{message}</p>
          </div>
        )}

        {previewCode && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-900">Development Mode - Verification Code:</p>
            <p className="text-lg font-mono font-bold text-amber-900 mt-1">{previewCode}</p>
            <p className="text-xs text-amber-700 mt-1">This code is only shown in development mode.</p>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="code" className="block text-sm font-medium text-slate-700">
            Verification Code
          </label>
          <input
            id="code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Enter 6-digit code"
            required
            maxLength={6}
            autoComplete="off"
          />
          <p className="text-xs text-slate-500">Enter the 6-digit code sent to your email.</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700">
            New Password
          </label>
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Enter new password"
            required
            minLength={8}
            autoComplete="new-password"
          />
          <p className="text-xs text-slate-500">Must be at least 8 characters long.</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700">
            Confirm New Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Re-enter new password"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={loading || !code || !newPassword || !confirmPassword}
            className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Changing Password...' : 'Change Password'}
          </button>
          <button
            type="button"
            onClick={handleStartOver}
            className="text-sm font-medium text-slate-600 hover:text-slate-900 transition"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleRequestCode} className="space-y-4">
      <p className="text-sm text-slate-600">
        To change your password, we'll send a verification code to your registered email address.
      </p>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Sending Code...' : 'Send Verification Code'}
      </button>
    </form>
  );
};
