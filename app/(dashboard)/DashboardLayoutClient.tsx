'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
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
};

export default function DashboardLayoutClient({ children, user }: DashboardLayoutClientProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const title = PAGE_TITLES[pathname] || 'DSR CMS';

  // Collapse sidebar on tablet
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth < 1280 && window.innerWidth >= 768) {
        setCollapsed(true);
      } else if (window.innerWidth >= 1280) {
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
            <TopBar title={title} onMenuOpen={() => setMobileOpen(true)} />
            <main className="relative min-h-screen p-6 lg:p-8">
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-indigo-200/20 blur-3xl" />
                <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-violet-200/15 blur-3xl" />
              </div>
              <div className="relative">{children}</div>
            </main>
          </div>
        </div>
      </ConfirmProvider>
    </ToastProvider>
  );
}
