'use client';

import { memo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Stethoscope, Calendar, Bell, Plus, Menu } from 'lucide-react';
import { cn, canCreateRecords } from '@/lib/utils';

interface MobileBottomNavProps {
  user: { role: 'salesPerson' | 'admin' | 'superAdmin'; hasWriteAccess: boolean };
  onMoreOpen: () => void;
}

type TabIcon = React.ComponentType<{ className?: string; strokeWidth?: number }>;

interface Tab {
  label: string;
  href: string;
  icon: TabIcon;
  matches: (pathname: string) => boolean;
}

const HOME_TAB: Tab = {
  label: 'Home',
  href: '/dashboard',
  icon: LayoutDashboard,
  matches: (p) => p === '/dashboard',
};

const DOCTORS_TAB: Tab = {
  label: 'Doctors',
  href: '/doctors',
  icon: Stethoscope,
  matches: (p) => p.startsWith('/doctors') && p !== '/doctors/new',
};

const VISITS_TAB: Tab = {
  label: 'Visits',
  href: '/visits',
  icon: Calendar,
  matches: (p) => p.startsWith('/visits') && p !== '/visits/new',
};

const ALERTS_TAB: Tab = {
  label: 'Alerts',
  href: '/alerts',
  icon: Bell,
  matches: (p) => p.startsWith('/alerts'),
};

const tabClass =
  'flex min-h-[48px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-medium transition-colors duration-200 ease-in-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand active:scale-95';

function TabLink({ tab, pathname }: { tab: Tab; pathname: string }) {
  const Icon = tab.icon;
  const isActive = tab.matches(pathname);
  return (
    <Link
      href={tab.href}
      className={cn(tabClass, isActive ? 'text-brand' : 'text-slate-500 hover:text-slate-800')}
      aria-current={isActive ? 'page' : undefined}
    >
      <span
        className={cn(
          'flex h-7 w-11 items-center justify-center rounded-full transition-colors duration-200 ease-in-out',
          isActive && 'bg-brand-light'
        )}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.25 : 1.75} />
      </span>
      <span className={cn(isActive && 'font-semibold')}>{tab.label}</span>
    </Link>
  );
}

function MobileBottomNav({ user, onMoreOpen }: MobileBottomNavProps) {
  const pathname = usePathname();
  const canCreate = canCreateRecords(user);
  const isLogVisitActive = pathname === '/visits/new';

  return (
    <nav
      className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-white/90 backdrop-blur-xl md:hidden"
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-md items-stretch gap-1 px-2 pt-0.5">
        <TabLink tab={HOME_TAB} pathname={pathname} />
        <TabLink tab={DOCTORS_TAB} pathname={pathname} />
        {canCreate ? (
          <div className="flex flex-1 items-start justify-center">
            <Link
              href="/visits/new"
              className={cn(
                '-mt-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-violet-600 text-white shadow-lg shadow-indigo-500/40 ring-4 ring-white transition-transform duration-200 ease-in-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand active:scale-95',
                isLogVisitActive && 'from-indigo-700 to-violet-700'
              )}
              aria-label="Log new visit"
              aria-current={isLogVisitActive ? 'page' : undefined}
            >
              <Plus className="h-5 w-5" strokeWidth={2.5} />
            </Link>
          </div>
        ) : (
          <TabLink tab={ALERTS_TAB} pathname={pathname} />
        )}
        <TabLink tab={VISITS_TAB} pathname={pathname} />
        <button
          type="button"
          onClick={onMoreOpen}
          className={cn(tabClass, 'text-slate-500 hover:text-slate-800')}
          aria-label="Open menu"
        >
          <span className="flex h-7 w-11 items-center justify-center rounded-full">
            <Menu className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </span>
          <span>More</span>
        </button>
      </div>
    </nav>
  );
}

export default memo(MobileBottomNav);
