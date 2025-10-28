import { useMemo } from 'react';
import type { User } from '../../types/api';
import { Link } from 'react-router-dom';

interface ProfileCompletionBarProps {
  user: User;
}

export const ProfileCompletionBar: React.FC<ProfileCompletionBarProps> = ({ user }) => {
  const completionData = useMemo(() => {
    const checks = [
      { field: 'name', label: 'Full Name', completed: Boolean(user.name) },
      { field: 'email', label: 'Email', completed: Boolean(user.email) },
      { field: 'emailVerified', label: 'Email Verification', completed: Boolean(user.isEmailVerified) },
      { field: 'profileImage', label: 'Profile Picture', completed: Boolean(user.profileImage) },
    ];

    // For B2B users, add company info and verification checks
    if (user.clientType === 'B2B') {
      checks.push(
        { field: 'companyName', label: 'Company Name', completed: Boolean(user.company?.name) },
        { field: 'companyAddress', label: 'Company Address', completed: Boolean(user.company?.address) },
        { field: 'companyPhone', label: 'Company Phone', completed: Boolean(user.company?.phone) },
        { field: 'verification', label: 'Business Verification', completed: Boolean(user.verificationFileUrl) }
      );
    }

    const completed = checks.filter(check => check.completed).length;
    const total = checks.length;
    const percentage = Math.round((completed / total) * 100);
    const incomplete = checks.filter(check => !check.completed);

    return { completed, total, percentage, incomplete };
  }, [user]);

  // Don't show if profile is complete
  if (completionData.percentage === 100) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4 shadow-sm transition-all duration-500 ease-out">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Left: Icon + Title + Progress */}
        <div className="flex items-center gap-3 flex-1 min-w-[200px]">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 flex-shrink-0">
            <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-slate-900">Complete Your Profile</h3>
            <div className="mt-1">
              <div className="h-2 w-full overflow-hidden rounded-full bg-amber-100 max-w-xs">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500"
                  style={{ width: `${completionData.percentage}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-slate-600">
                {completionData.completed} of {completionData.total} ({completionData.percentage}%)
              </p>
            </div>
          </div>
        </div>

        {/* Middle: Still needed */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-sm font-medium text-slate-700">Still needed:</span>
          <div className="flex items-center gap-1">
            {completionData.incomplete.slice(0, 2).map((item, idx) => (
              <span key={item.field} className="text-xs text-slate-600">
                {item.label}
                {idx < Math.min(completionData.incomplete.length, 2) - 1 && ', '}
              </span>
            ))}
            {completionData.incomplete.length > 2 && (
              <span className="text-xs text-slate-500">
                +{completionData.incomplete.length - 2} more
              </span>
            )}
          </div>
        </div>

        {/* Right: Button + Percentage */}
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard?tab=account"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:from-amber-600 hover:to-orange-700 whitespace-nowrap"
          >
            Complete Now
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>

          {/* Percentage Circle */}
          <div className="hidden sm:flex flex-col items-center justify-center">
            <div className="relative h-12 w-12">
              <svg className="h-12 w-12 -rotate-90 transform">
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="transparent"
                  className="text-amber-100"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 20}`}
                  strokeDashoffset={`${2 * Math.PI * 20 * (1 - completionData.percentage / 100)}`}
                  className="text-amber-500 transition-all duration-500"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-slate-900">{completionData.percentage}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
