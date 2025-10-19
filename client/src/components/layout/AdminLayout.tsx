import { useState, type ReactNode, isValidElement } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/cn';
import { AdminSideNav } from '../dashboard/AdminSideNav';
import type { AdminTopNavItem } from '../dashboard/AdminTopNav';

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Extract props from topNav if it's an AdminTopNav component
  const topNavProps = isValidElement(topNav) ? (topNav.props as { items?: AdminTopNavItem[]; activeId?: string; onSelect?: (id: string, dropdownId?: string) => void }) : {};
  const navItems = topNavProps.items || [];
  const activeNavId = topNavProps.activeId || '';
  const handleNavSelect = topNavProps.onSelect || (() => {});

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100">
      <style>{`
        /* Mobile (< 600px) - show hamburger menu */
        .admin-desktop-only,
        .admin-desktop-inline,
        .admin-desktop-block,
        .admin-tablet-only {
          display: none;
        }
        .admin-mobile-only,
        .admin-mobile-tablet {
          display: flex;
        }
        .admin-main-content {
          padding-left: 1rem;
        }

        /* Tablet (600px - 1200px) - show icon sidebar */
        @media (min-width: 600px) and (max-width: 1199px) {
          .admin-mobile-only {
            display: none;
          }
          .admin-tablet-only,
          .admin-mobile-tablet {
            display: flex;
          }
          .admin-main-content {
            padding-left: 5rem;
          }
          .admin-main-content.admin-sidebar-open {
            padding-left: 20rem;
          }
          /* Don't blur header on tablet, but blur main content */
          .admin-header-blur-mobile {
            filter: none !important;
          }
        }

        /* Desktop (1200px+) - show horizontal menu */
        @media (min-width: 1200px) {
          .admin-desktop-only {
            display: flex;
          }
          .admin-mobile-only,
          .admin-mobile-tablet,
          .admin-tablet-only {
            display: none;
          }
          .admin-desktop-inline {
            display: inline-flex;
          }
          .admin-desktop-block {
            display: block;
          }
          .admin-main-content {
            padding-left: 1rem;
          }
        }
      `}</style>

      {/* Header */}
      <header className={cn("fixed top-4 left-0 right-0 z-50 px-3 md:px-6 transition-all", sidebarOpen && "blur-sm admin-header-blur-mobile")}>
        <div className="mx-auto flex w-full items-center gap-4 rounded-full border border-white/60 bg-white/90 px-5 py-2.5 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-white/70">

          {/* Mobile only: Hamburger button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="admin-mobile-only h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Logo - clickable on both mobile and desktop */}
          <a href="/" className="flex items-center">
            <img src="/logo.webp" alt="ULKs Logo" className="h-8 w-auto" />
          </a>

          {/* Mobile & Tablet: Back arrow */}
          <a
            href="/"
            className="admin-mobile-tablet h-9 w-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100"
            aria-label="Back to Store"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </a>

          {/* Desktop: Back to Store link with text */}
          <a
            href="/"
            className="admin-desktop-inline items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Store
          </a>

          {/* Desktop: Divider */}
          <div className="admin-desktop-block h-8 w-px bg-slate-200/70" />

          {/* Desktop: Top Navigation */}
          <div className="admin-desktop-only flex-1 items-center justify-center">
            <div className="w-full">
              {topNav}
            </div>
          </div>

          {/* Desktop: Divider */}
          <div className="admin-desktop-block h-8 w-px bg-slate-200/70" />

          {/* Desktop: Settings, Help, Profile */}
          <div className="admin-desktop-only items-center gap-3">
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
                    className="absolute right-0 top-full mt-3 w-56 rounded-xl border border-slate-200 bg-white shadow-xl z-50"
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

          {/* Mobile & Tablet: Settings, Help, Profile icons */}
          <div className="admin-mobile-tablet flex items-center gap-2 ml-auto">
            <div className="relative">
              <button
                onClick={() => setHelpPopupOpen((open) => !open)}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full transition',
                  helpPopupOpen ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-100'
                )}
                title="Help"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              <AnimatePresence>
                {helpPopupOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-3 w-72 rounded-xl border border-slate-200 bg-white shadow-xl z-50"
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

            <button
              onClick={() => {
                setHelpPopupOpen(false);
                navigate('/admin/settings');
              }}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full transition',
                window.location.pathname === '/admin/settings'
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-600 hover:bg-slate-100'
              )}
              title="Settings"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

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
                    className="absolute right-0 top-full mt-3 w-56 rounded-xl border border-slate-200 bg-white shadow-xl z-50"
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

      {/* Tablet: Expanding Sidebar (600px - 1200px) */}
      <aside className="admin-tablet-only">
        {/* Backdrop when sidebar is open */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <motion.div
          initial={false}
          animate={{ width: sidebarOpen ? 288 : 64 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed left-0 top-24 bottom-0 z-40 bg-white/90 backdrop-blur border-r border-slate-200 flex-col rounded-r-2xl overflow-hidden"
        >
          {/* Collapsed: Icon-only view */}
          {!sidebarOpen && (
            <div className="flex flex-col items-center gap-2 p-2">
              {/* Open menu button */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="flex h-12 w-12 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100"
                aria-label="Open menu"
                title="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>

              {navItems.map((item) => {
                const hasDropdown = Boolean(item.dropdown && item.dropdown.items?.length);
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      handleNavSelect(item.id);
                    }}
                    className={cn(
                      'relative flex h-12 w-12 items-center justify-center rounded-xl transition',
                      activeNavId === item.id
                        ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-md'
                        : 'text-slate-600 hover:bg-slate-100'
                    )}
                    title={item.label}
                  >
                    {item.icon}
                    {/* Dropdown indicator */}
                    {hasDropdown && (
                      <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Expanded: Full navigation with titles and dropdowns */}
          {sidebarOpen && (
            <div className="flex flex-col h-full">
              {/* Header with close button */}
              <div className="flex items-center gap-2 border-b border-slate-200 p-4 bg-white">
                <span className="text-sm font-medium text-slate-700 flex-1">Close menu</span>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Navigation */}
              <div className="p-4 overflow-y-auto">
                <AdminSideNav
                  items={navItems}
                  activeId={activeNavId}
                  onSelect={(id, dropdownId) => {
                    handleNavSelect(id, dropdownId);
                    setSidebarOpen(false);
                  }}
                  onDropdownTitleClick={() => setSidebarOpen(false)}
                />
              </div>
            </div>
          )}
        </motion.div>
      </aside>

      {/* Mobile Sidebar - Full height from top to bottom */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="admin-mobile-only fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />

            {/* Sidebar */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="admin-mobile-only fixed left-0 top-0 bottom-0 z-50 w-72 overflow-y-auto border-r border-slate-200 bg-white shadow-xl flex-col"
            >
              {/* Sidebar Header */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-200 p-4 bg-white sticky top-0 z-10">
                <img src="/logo.webp" alt="ULKs Logo" className="h-8 w-auto" />

                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Close menu"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Sidebar Navigation */}
              <div className="p-4">
                <AdminSideNav
                  items={navItems}
                  activeId={activeNavId}
                  onSelect={(id, dropdownId) => {
                    handleNavSelect(id, dropdownId);
                    setSidebarOpen(false);
                  }}
                  onDropdownTitleClick={() => setSidebarOpen(false)}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className={cn('min-h-[calc(100vh-4rem)] px-4 pb-12 pt-32 transition-all admin-main-content', (helpPopupOpen || sidebarOpen) && 'blur-sm admin-main-blur-mobile', sidebarOpen && 'admin-sidebar-open')}>
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

      {/* Backdrop for dropdowns */}
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
