import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/cn';
import { useNavigate } from 'react-router-dom';

interface AdminLayoutProps {
  sidebar: (expanded: boolean) => React.ReactNode;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ sidebar, children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [helpPopupOpen, setHelpPopupOpen] = useState(false);

  // Determine which toggle should be active
  const isOnSettingsPage = window.location.pathname === '/admin/settings';
  const activeToggle = helpPopupOpen ? 'help' : (isOnSettingsPage ? 'settings' : null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100">
      {/* Horizontal Top Header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
        <div className="flex h-full items-center justify-between px-6">
          {/* Left: Logo + Back to Store */}
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="ULKs Logo" className="h-8 w-auto" />
            <a
              href="/"
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Store
            </a>
          </div>

          {/* Right: Settings, Help, and Profile */}
          <div className="flex items-center gap-3">
            {/* Help & Settings Container (swapped order) */}
            <div className="relative flex items-center rounded-full bg-slate-100 p-1">
              {/* Animated sliding background with deformation */}
              <motion.div
                className="absolute h-8 rounded-full bg-white shadow-sm"
                initial={false}
                animate={{
                  x: activeToggle === 'help' ? 0 : activeToggle === 'settings' ? 32 : -40,
                  width: activeToggle ? 32 : 0,
                  opacity: activeToggle ? 1 : 0,
                  scaleX: 1,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 28,
                  mass: 0.8,
                  scaleX: {
                    type: 'spring',
                    stiffness: 500,
                    damping: 20,
                  },
                }}
                style={{ originX: activeToggle === 'settings' ? 0 : 1 }}
              />

              {/* Help Icon with Dropdown (now first) */}
              <div className="relative">
                <button
                  onClick={() => setHelpPopupOpen(!helpPopupOpen)}
                  className={cn(
                    'relative z-10 flex h-8 w-8 items-center justify-center rounded-full transition-colors',
                    activeToggle === 'help'
                      ? 'text-slate-900'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                  title="Help"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>

                {/* Help Dropdown Menu */}
                <AnimatePresence>
                  {helpPopupOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-slate-200 bg-white shadow-xl"
                    >
                      <div className="p-4">
                        <div className="mb-4 flex items-center gap-3">
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
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                            </div>
                            <div className="flex-1 text-left">
                              <p className="text-xs font-medium text-slate-500">Phone</p>
                              <p className="text-sm font-semibold text-slate-900">+212 689739036</p>
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

              {/* Settings Icon (now second) */}
              <button
                onClick={() => {
                  setHelpPopupOpen(false);
                  navigate('/admin/settings');
                }}
                className={cn(
                  'relative z-10 flex h-8 w-8 items-center justify-center rounded-full transition-colors',
                  activeToggle === 'settings'
                    ? 'text-slate-900'
                    : 'text-slate-600 hover:text-slate-900'
                )}
                title="Settings"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark text-sm font-semibold text-white shadow-sm transition hover:ring-2 hover:ring-primary/30"
              >
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </button>

              {/* Profile Dropdown Menu */}
              <AnimatePresence>
                {profileDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-slate-200 bg-white shadow-xl"
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

      {/* Hamburger Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] border-r border-slate-200 bg-white shadow-lg transition-all duration-300',
          sidebarExpanded ? 'w-72' : 'w-20',
          helpPopupOpen && 'blur-sm'
        )}
      >
        {/* Toggle Button */}
        <button
          onClick={() => setSidebarExpanded(!sidebarExpanded)}
          className="absolute -right-3 top-6 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition hover:bg-slate-50"
        >
          <svg
            className={cn('h-3 w-3 text-slate-600 transition-transform', !sidebarExpanded && 'rotate-180')}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Navigation */}
        <nav className="h-full overflow-y-auto p-4">
          {sidebar(sidebarExpanded)}
        </nav>
      </aside>

      {/* Main Content */}
      <main
        className={cn(
          'min-h-[calc(100vh-4rem)] pt-16 transition-all duration-300',
          sidebarExpanded ? 'ml-72' : 'ml-20',
          helpPopupOpen && 'blur-sm'
        )}
      >
        <div className="p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </div>
      </main>

      {/* Click outside to close dropdowns */}
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
