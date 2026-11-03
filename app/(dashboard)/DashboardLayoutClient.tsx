'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { ConfirmProvider } from '@/components/ui/ConfirmProvider';
import { usePathname } from 'next/navigation';

interface DashboardLayoutClientProps {
  children: React.ReactNode;
  user: {
    name: string;
    role: 'salesPerson' | 'admin' | 'superAdmin';
    hasWriteAccess: boolean;
    slug: string;
  };
}

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/doctors': 'Doctor Management',
  '/doctors/new': 'Add New Doctor',
  '/visits': 'Visit Management',
  '/visits/new': 'Log New Visit',
  '/alerts': 'Alerts & Compliance',
  '/reports': 'Reports',
  '/dropdowns': 'Dropdown Manager',
  '/admin/crons': 'Cron Jobs',
  '/users': 'User Management',
  '/audit': 'Audit Trail',
  '/settings': 'Settings',
  '/users/transfer': 'Transfer Sales Data',
};

const NESTED_PAGE_TITLES: Array<{ pattern: RegExp; title: string }> = [
  { pattern: /^\/doctors\/[^/]+\/edit\/?$/, title: 'Edit Doctor' },
  { pattern: /^\/doctors\/[^/]+\/?$/, title: 'Doctor Profile' },
  { pattern: /^\/visits\/[^/]+\/?$/, title: 'Visit Details' },
];

const TOP_LEVEL_PATHS = ['/dashboard', '/doctors', '/visits', '/alerts', '/reports', '/dropdowns', '/users', '/audit', '/settings'];

function getPageTitle(pathname: string): string {
  return PAGE_TITLES[pathname] ?? NESTED_PAGE_TITLES.find((p) => p.pattern.test(pathname))?.title ?? 'DSR CMS';
}

export default function DashboardLayoutClient({ children, user }: DashboardLayoutClientProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const title = getPageTitle(pathname);
  const showBack = !TOP_LEVEL_PATHS.includes(pathname);
  const openMobileMenu = useCallback(() => setMobileOpen(true), []);

  // Collapse sidebar on tablet
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth < 1280 && window.innerWidth >= 768) {
        setCollapsed(true);
      } else {
        setCollapsed(false);
      }
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <ToastProvider>
      <ConfirmProvider>
        <div className="app-layout">
          <Sidebar
            user={user}
            collapsed={collapsed}
            onCollapse={setCollapsed}
            mobileOpen={mobileOpen}
            onMobileClose={() => setMobileOpen(false)}
          />
          <div className={`main-content ${collapsed ? 'collapsed' : ''}`}>
            <TopBar title={title} showBack={showBack} onMenuOpen={openMobileMenu} />
            <main className="mobile-main relative min-h-screen px-4 pt-4 md:p-6 lg:p-8">
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-indigo-200/20 blur-3xl" />
                <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-violet-200/15 blur-3xl" />
              </div>
              <div className="relative">{children}</div>
            </main>
          </div>
          <MobileBottomNav user={user} onMoreOpen={openMobileMenu} />
        </div>
      </ConfirmProvider>
    </ToastProvider>
  );
}
