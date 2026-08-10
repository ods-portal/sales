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
      { label: 'Add New Doctor', href: '/doctors/new', icon: UserPlus },
    ],
  },
  {
    title: 'Visit Management',
    items: [
      { label: 'Log New Visit', href: '/visits/new', icon: PenLine },
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
    'Dashboard',
    'Doctor Management',
    'Visit Management',
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
        <div className="flex min-h-[68px] items-center justify-between border-b border-white/10 px-4">
          <div className="flex min-w-0 items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
              <Activity className="h-5 w-5 text-white" strokeWidth={2.5} />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="truncate text-[15px] font-bold tracking-tight text-white">DSR CMS</div>
                <div className="text-[10px] font-medium uppercase tracking-widest text-indigo-300/70">Sales Portal</div>
              </div>
            )}
          </div>
          <button
            onClick={() => onCollapse(!collapsed)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Toggle sidebar"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Search */}
        {!collapsed && (
          <div className="mx-3 mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-slate-500" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full border-none bg-transparent text-[13px] text-slate-300 outline-none placeholder:text-slate-600"
            />
          </div>
        )}

        {/* Nav */}
        <div className="sidebar-nav flex-1 overflow-y-auto py-3">
          {NAV.filter(canSeeSection).map((section) => (
            <div key={section.title}>
              {!collapsed && (
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-2 text-left"
                  onClick={() => toggleSection(section.title)}
                >
                  <span className="sidebar-section-header !p-0">{section.title}</span>
                  <ChevronDown
                    className={cn(
                      'h-3.5 w-3.5 text-slate-600 transition-transform duration-200',
                      expandedSections.includes(section.title) && 'rotate-180'
                    )}
                  />
                </button>
              )}
              {(collapsed || expandedSections.includes(section.title)) &&
                section.items.filter(canSeeItem).map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn('sidebar-nav-item group', active && 'active')}
                      title={collapsed ? item.label : undefined}
                      onClick={() => {
                        if (window.innerWidth < 768) onMobileClose();
                      }}
                    >
                      <Icon
                        className={cn(
                          'h-[18px] w-[18px] shrink-0 transition-colors',
                          active ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'
                        )}
                        strokeWidth={active ? 2.25 : 1.75}
                      />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 p-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 text-sm font-bold text-white">
              {user.name.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-white">{user.name}</div>
                  <div className="text-[11px] text-slate-500">{roleLabel[user.role]}</div>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                  title="Logout"
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
              className="mt-2 flex w-full items-center justify-center rounded-lg p-2 text-slate-500 hover:text-rose-400"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
