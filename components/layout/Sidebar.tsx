'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard,
  BarChart3,
  Stethoscope,
  UserPlus,
  PenLine,
  Calendar,
  Clock,
  Bell,
  Settings2,
  Users,
  Shield,
  User,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  Search,
  Activity,
  Timer,
  ArrowRightLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  user: {
    name: string;
    role: 'salesPerson' | 'admin' | 'superAdmin';
    hasWriteAccess: boolean;
    slug: string;
  };
  collapsed: boolean;
  onCollapse: (v: boolean) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

type NavIcon = React.ComponentType<{ className?: string; strokeWidth?: number }>;

interface NavItem {
  label: string;
  href: string;
  icon: NavIcon;
  roles?: Array<'salesPerson' | 'admin' | 'superAdmin'>;
  requireWrite?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
  roles?: Array<'salesPerson' | 'admin' | 'superAdmin'>;
}

const NAV: NavSection[] = [
  {
    title: 'Dashboard',
    items: [
      { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Reports', href: '/reports', icon: BarChart3, roles: ['admin', 'superAdmin'], requireWrite: true },
    ],
  },
  {
    title: 'Doctor Management',
    items: [
      { label: 'All Doctors', href: '/doctors', icon: Stethoscope },
      { label: 'Add New Doctor', href: '/doctors/new', icon: UserPlus, requireWrite: true },
    ],
  },
  {
    title: 'Visit Management',
    items: [
      { label: 'Log New Visit', href: '/visits/new', icon: PenLine, requireWrite: true },
      { label: 'All Visits', href: '/visits', icon: Calendar },
      { label: 'Pending Visits', href: '/visits?status=Pending', icon: Clock },
    ],
  },
  {
    title: 'Alerts & Compliance',
    items: [
      { label: 'Overdue Follow-ups', href: '/alerts', icon: Bell },
    ],
  },
  {
    title: 'Configuration',
    roles: ['admin', 'superAdmin'],
    items: [
      { label: 'Dropdown Manager', href: '/dropdowns', icon: Settings2 },
      { label: 'Cron Jobs', href: '/admin/crons', icon: Timer, requireWrite: true },
    ],
  },
  {
    title: 'User Management',
    roles: ['admin', 'superAdmin'],
    items: [
      { label: 'Manage Users', href: '/users', icon: Users, requireWrite: true },
      { label: 'Transfer Sales Data', href: '/users/transfer', icon: ArrowRightLeft, requireWrite: true },
      { label: 'Audit Trail', href: '/audit', icon: Shield, roles: ['superAdmin'] },
    ],
  },
  {
    title: 'Settings',
    items: [{ label: 'Profile', href: '/settings', icon: User }],
  },
];

const roleLabel: Record<string, string> = {
  superAdmin: 'Super Admin',
  admin: 'Admin',
  salesPerson: 'Sales Person',
};

export default function Sidebar({ user, collapsed, onCollapse, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [expandedSections, setExpandedSections] = useState<string[]>([
    'Dashboard'
  ]);

  const toggleSection = (title: string) => {
    setExpandedSections((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const isActive = (href: string) => {
    const [basePath, queryString] = href.split('?');
    if (queryString) {
      const targetParams = new URLSearchParams(queryString);
      let matches = true;
      targetParams.forEach((val, key) => {
        if (searchParams.get(key) !== val) matches = false;
      });
      return pathname === basePath && matches;
    }
    if (pathname === basePath) {
      if (!queryString && searchParams.has('status')) return false;
      return true;
    }
    if (basePath === '/doctors' && pathname.startsWith('/doctors/') && !pathname.startsWith('/doctors/new')) return true;
    if (basePath === '/visits' && pathname.startsWith('/visits/') && !pathname.startsWith('/visits/new')) return true;
    return false;
  };

  const canSeeSection = (section: NavSection) => {
    if (!section.roles) return true;
    return section.roles.includes(user.role);
  };

  const canSeeItem = (item: NavItem) => {
    if (item.roles && !item.roles.includes(user.role)) return false;
    if (item.requireWrite && user.role === 'admin' && !user.hasWriteAccess) return false;
    return true;
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <>
      {mobileOpen && (
        <div
          onClick={onMobileClose}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm md:hidden"
        />
      )}

      <nav
        className={cn(
          'sidebar',
          collapsed && 'collapsed',
          mobileOpen && 'mobile-open'
        )}
      >
        {/* Header */}
        <div
          className={cn(
            'flex min-h-[72px] items-center border-b border-[var(--sidebar-border)] px-4',
            collapsed ? 'flex-col justify-center gap-2 px-2 py-3' : 'justify-between'
          )}
        >
          <Link
            href="/dashboard"
            className="flex min-w-0 items-center gap-3 overflow-hidden rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400"
            aria-label="DSR CMS home"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25 ring-1 ring-white/20">
              <Activity className="h-5 w-5 text-white" strokeWidth={2.5} />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="truncate text-[15px] font-semibold tracking-tight text-white">DSR CMS</div>
                <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Sales Portal</div>
              </div>
            )}
          </Link>
          <button
            type="button"
            onClick={() => onCollapse(!collapsed)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--sidebar-border)] bg-white/[0.03] text-slate-400 transition-all duration-200 ease-in-out hover:border-white/20 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400 active:scale-95"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Search */}
        {/* {!collapsed && (
          <label className="mx-3 mt-4 flex cursor-text items-center gap-2 rounded-xl border border-[var(--sidebar-border)] bg-[var(--sidebar-bg-elevated)] px-3 py-2.5 transition-all duration-200 ease-in-out focus-within:border-indigo-400/60 focus-within:bg-white/[0.06] focus-within:ring-2 focus-within:ring-indigo-500/20 hover:border-white/20">
            <Search className="h-4 w-4 shrink-0 text-slate-500" />
            <span className="sr-only">Search</span>
            <input
              type="text"
              placeholder="Search..."
              className="w-full border-none bg-transparent text-[13px] text-slate-200 outline-none placeholder:text-slate-500"
            />
          </label>
        )} */}

        {/* Nav */}
        <div className="sidebar-nav flex-1 overflow-y-auto px-0 py-3">
          {NAV.filter(canSeeSection).map((section) => {
            const isOpen = collapsed || expandedSections.includes(section.title);
            const panelId = `sidebar-section-${section.title.toLowerCase().replace(/\s+/g, '-')}`;
            const visibleItems = section.items.filter(canSeeItem);
            const hasActiveItem = visibleItems.some((item) => isActive(item.href));
            return (
              <div key={section.title} className={cn(collapsed ? 'border-b border-[var(--sidebar-border)] py-1.5 last:border-0' : 'mb-1')}>
                {!collapsed && (
                  <button
                    type="button"
                    className="group/section mx-3 flex w-[calc(100%-24px)] items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition-colors duration-200 ease-in-out hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400"
                    onClick={() => toggleSection(section.title)}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className={cn(
                          'sidebar-section-header truncate !p-0 transition-colors duration-200 group-hover/section:text-slate-300',
                          isOpen && 'text-slate-300'
                        )}
                      >
                        {section.title}
                      </span>
                      {hasActiveItem && !isOpen && (
                        <>
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]" aria-hidden="true" />
                          <span className="sr-only">(contains current page)</span>
                        </>
                      )}
                    </span>
                    <ChevronDown
                      className={cn(
                        'h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform duration-300 ease-in-out group-hover/section:text-slate-300 motion-reduce:transition-none',
                        isOpen && 'rotate-180 text-slate-300'
                      )}
                    />
                  </button>
                )}
                <div
                  id={panelId}
                  className={cn(
                    'grid transition-[grid-template-rows,opacity] duration-300 ease-in-out motion-reduce:transition-none',
                    isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  )}
                  inert={!isOpen}
                >
                  <div className="min-h-0 overflow-hidden">
                    <div className="pb-1">
                      {visibleItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.href);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={cn('sidebar-nav-item group', active && 'active')}
                            title={collapsed ? item.label : undefined}
                            aria-current={active ? 'page' : undefined}
                            onClick={() => {
                              if (window.innerWidth < 768) onMobileClose();
                            }}
                          >
                            <Icon
                              className={cn(
                                'h-[18px] w-[18px] shrink-0 transition-colors duration-200',
                                active ? 'text-indigo-300' : 'text-slate-500 group-hover:text-slate-200'
                              )}
                              strokeWidth={active ? 2.25 : 1.75}
                            />
                            {!collapsed && <span className="truncate">{item.label}</span>}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--sidebar-border)] p-3">
          <div
            className={cn(
              'flex items-center gap-3 rounded-xl border border-[var(--sidebar-border)] bg-[var(--sidebar-bg-elevated)] p-2.5 transition-colors duration-200 hover:bg-white/[0.06]',
              collapsed && 'justify-center border-transparent bg-transparent p-1.5'
            )}
          >
            <div className="relative shrink-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 text-sm font-semibold text-white ring-2 ring-white/10">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[var(--sidebar-bg)]" aria-hidden="true" />
            </div>
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-white">{user.name}</div>
                  <span className="mt-0.5 inline-block max-w-full truncate whitespace-nowrap rounded-md bg-indigo-500/15 px-1.5 py-0.5 text-[11px] font-medium text-indigo-200 ring-1 ring-indigo-400/20">
                    {roleLabel[user.role]}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-all duration-200 ease-in-out hover:bg-rose-500/10 hover:text-rose-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-400 active:scale-95"
                  title="Logout"
                  aria-label="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
          {collapsed && (
            <button
              type="button"
              onClick={logout}
              className="mt-2 flex h-10 w-full items-center justify-center rounded-lg text-slate-400 transition-all duration-200 ease-in-out hover:bg-rose-500/10 hover:text-rose-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-400 active:scale-95"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
