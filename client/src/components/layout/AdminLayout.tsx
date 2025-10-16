import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/cn';

interface AdminLayoutProps {
  children: ReactNode;
  topNav?: ReactNode;
  contentKey?: string;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, topNav, contentKey }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [helpPopupOpen, setHelpPopupOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100">
      <header className="fixed top-4 left-0 right-0 z-50 px-3 md:px-6">
        <div className="mx-auto flex w-full items-center gap-4 rounded-full border border-white/60 bg-white/90 px-5 py-2.5 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-white/70">
          <div className="flex items-center gap-3">
            <picture>
              <source srcSet="/logo.webp" type="image/webp" />
              <img src="/logo.png" alt="ULKs Logo" className="h-8 w-auto" />
            </picture>
            <a
              href="/"
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Store
            </a>
          </div>

          <div className="h-8 w-px bg-slate-200/70" />

          <div className="flex flex-1 items-center justify-center">
            <div className="w-full">
              {topNav}
            </div>
          </div>

          <div className="h-8 w-px bg-slate-200/70" />

          <div className="flex items-center gap-3">
            <div className="relative flex items-center gap-2 rounded-full bg-slate-100 px-2 py-1">
              <button
                onClick={() => setHelpPopupOpen((open) => !open)}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full transition',
                  helpPopupOpen ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:bg-white hover:text-slate-900'
                )}
                title="Help"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              <button
                onClick={() => {
                  setHelpPopupOpen(false);
                  navigate('/admin/settings');
                }}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full transition',
                  window.location.pathname === '/admin/settings'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                )}
                title="Settings"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>

              <AnimatePresence>
                {helpPopupOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-3 w-72 rounded-xl border border-slate-200 bg-white shadow-xl"
                  >
                    <div className="p-4">
                      <div className="mb-3 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">Need assistance?</h3>
                          <p className="text-xs text-slate-500">We're here to help</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <a
                          href="tel:+212689739036"
                          className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 transition hover:bg-slate-100"
                        >
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white">
                            <svg className="h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.78 3c.43 0 .8.28.92.69l1.04 3.66a.96.96 0 0 1-.27.95l-1.3 1.3a12.14 12.14 0 0 0 5.23 5.24l1.3-1.3a.96.96 0 0 1 .95-.27l3.66 1.04a.96.96 0 0 1 .69.93v3.02a1.96 1.96 0 0 1-2.1 1.96A17.46 17.46 0 0 1 4.04 6.78 1.96 1.96 0 0 1 6 4.69Z" />
                            </svg>
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-xs font-medium text-slate-500">Call</p>
                            <p className="text-sm font-semibold text-slate-900">+212 689-739036</p>
                          </div>
                        </a>

                        <a
                          href="mailto:contact@bpd.ma"
                          className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 transition hover:bg-slate-100"
                        >
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white">
                            <svg className="h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-xs font-medium text-slate-500">Email</p>
                            <p className="text-sm font-semibold text-slate-900">contact@bpd.ma</p>
                          </div>
                        </a>

                        <a
                          href="https://www.bpd.ma"
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 transition hover:bg-slate-100"
                        >
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white">
                            <svg className="h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                            </svg>
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-xs font-medium text-slate-500">Website</p>
                            <p className="text-sm font-semibold text-slate-900">www.bpd.ma</p>
                          </div>
                        </a>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen((open) => !open)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark text-sm font-semibold text-white shadow-sm transition hover:ring-2 hover:ring-primary/40"
              >
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </button>

              <AnimatePresence>
                {profileDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-3 w-56 rounded-xl border border-slate-200 bg-white shadow-xl"
                  >
                    <div className="p-3">
                      <div className="mb-3 rounded-lg bg-slate-50 p-3">
                        <p className="text-sm font-semibold text-slate-900">{user?.name || 'User'}</p>
                        <p className="text-xs text-slate-500">{user?.username || 'username'}</p>
                        <span className="mt-2 inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary capitalize">
                          {user?.role || 'admin'}
                        </span>
                      </div>
                      <button
                        onClick={logout}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Logout
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      <main
        className={cn(
          'min-h-[calc(100vh-4rem)] px-4 pb-12 pt-32 transition-all duration-300',
          helpPopupOpen && 'blur-sm'
        )}
      >
        <div className="mx-auto max-w-7xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={contentKey ?? 'admin-content'}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {(profileDropdownOpen || helpPopupOpen) && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => {
            setProfileDropdownOpen(false);
            setHelpPopupOpen(false);
          }}
        />
      )}
    </div>
  );
};
