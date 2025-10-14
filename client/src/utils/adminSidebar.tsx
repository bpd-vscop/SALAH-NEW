import { motion } from 'framer-motion';
import { cn } from './cn';

export const adminTabs = [
  { id: 'users', label: 'Users' },
  { id: 'categories', label: 'Categories' },
  { id: 'products', label: 'Products' },
  { id: 'banners', label: 'Banners' },
  { id: 'navigation', label: 'Navigation' },
  { id: 'homepage', label: 'Homepage' },
  { id: 'orders', label: 'Orders' },
] as const;

export const homepageTabs = [
  { id: 'hero' as const, label: 'Hero slider' },
  { id: 'featured' as const, label: 'Featured highlights' },
];

export const getMenuIcon = (tabId: string) => {
  switch (tabId) {
    case 'users':
      return (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      );
    case 'categories':
      return (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      );
    case 'products':
      return (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      );
    case 'banners':
      return (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    case 'navigation':
      return (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      );
    case 'homepage':
      return (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      );
    case 'orders':
      return (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      );
    default:
      return null;
  }
};

interface AdminSidebarOptions {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  homepageSection?: 'hero' | 'featured';
  setHomepageSection?: (section: 'hero' | 'featured') => void;
  homepageExpanded?: boolean;
  setHomepageExpanded?: (expanded: boolean | ((prev: boolean) => boolean)) => void;
}

export const createAdminSidebar = (options: AdminSidebarOptions) => {
  const {
    activeTab,
    setActiveTab,
    homepageSection = 'hero',
    setHomepageSection,
    homepageExpanded = false,
    setHomepageExpanded,
  } = options;

  return (sidebarExpanded: boolean) => (
    <div className="flex flex-col gap-2">
      {adminTabs.map((tab) => {
        if (tab.id === 'homepage') {
          const dropdownExpanded = homepageExpanded || activeTab === 'homepage';
          return (
            <div key={tab.id} className="flex flex-col">
              <button
                type="button"
                onClick={() => setHomepageExpanded?.((prev: boolean) => !prev)}
                className={cn(
                  'flex items-center gap-3 rounded-lg py-3 text-left font-medium transition-all',
                  sidebarExpanded ? 'px-4 justify-between' : 'px-0 justify-center',
                  activeTab === 'homepage'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-100'
                )}
              >
                <div className="flex items-center gap-3">
                  {getMenuIcon(tab.id)}
                  {sidebarExpanded && <span className="text-sm">{tab.label}</span>}
                </div>
                {sidebarExpanded && (
                  <svg
                    className={cn('h-4 w-4 transition-transform duration-200', dropdownExpanded ? 'rotate-90' : '')}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                )}
              </button>
              {dropdownExpanded && sidebarExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-1 ml-3 flex flex-col gap-1 border-l-2 border-slate-200 pl-3"
                >
                  {homepageTabs.map((child) => {
                    const selected = homepageSection === child.id && activeTab === 'homepage';
                    return (
                      <button
                        type="button"
                        key={child.id}
                        onClick={() => {
                          setActiveTab('homepage');
                          setHomepageSection?.(child.id);
                        }}
                        className={cn(
                          'relative rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-all',
                          selected
                            ? 'bg-red-50 text-red-600'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        )}
                      >
                        {selected && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r bg-red-600" />
                        )}
                        <span className={cn(selected && 'ml-2')}>{child.label}</span>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </div>
          );
        }

        return (
          <button
            type="button"
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-3 rounded-lg py-3 text-left text-sm font-medium transition-all',
              sidebarExpanded ? 'px-4' : 'px-0 justify-center',
              activeTab === tab.id
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-100'
            )}
          >
            {getMenuIcon(tab.id)}
            {sidebarExpanded && <span>{tab.label}</span>}
          </button>
        );
      })}
    </div>
  );
};
