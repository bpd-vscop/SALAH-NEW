import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Heart, X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface AuthPromptModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
}

export const AuthPromptModal: React.FC<AuthPromptModalProps> = ({
  open,
  onClose,
  title = 'Sign in required',
  message = 'Please sign in or sign up with a client account to add this product to your wishlist.',
}) => {
  const location = useLocation();

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-prompt-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <Heart className="h-5 w-5" />
            </span>
            <div>
              <h3 id="auth-prompt-title" className="text-lg font-semibold text-slate-900">
                {title}
              </h3>
              <p className="text-xs text-slate-500">Wishlist items are saved to your account.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-white hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5">
          <p className="text-sm text-slate-600">{message}</p>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row">
          <Link
            to="/login"
            state={{ from: location.pathname }}
            onClick={onClose}
            className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-primary-dark"
          >
            Sign in
          </Link>
          <Link
            to="/register"
            onClick={onClose}
            className={cn(
              'flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-center text-sm font-semibold text-slate-700 transition',
              'hover:border-primary hover:text-primary'
            )}
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
};
