'use client';

import { useRouter } from 'next/navigation';
import { Activity, ChevronLeft, Menu } from 'lucide-react';

interface TopBarProps {
  title: string;
  showBack?: boolean;
  onMenuOpen: () => void;
}

const iconButtonClass =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-700 transition-colors duration-200 ease-in-out hover:bg-slate-100 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand';

export default function TopBar({ title, showBack = false, onMenuOpen }: TopBarProps) {
  const router = useRouter();

  return (
    <header className="mobile-top-bar sticky top-0 z-30 flex items-center gap-2 border-b border-slate-200/70 bg-white/85 px-2 backdrop-blur-xl md:hidden">
      {showBack ? (
        <button type="button" className={iconButtonClass} onClick={() => router.back()} aria-label="Go back">
          <ChevronLeft className="h-5 w-5" />
        </button>
      ) : (
        <div className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/25">
          <Activity className="h-4 w-4" strokeWidth={2.5} />
        </div>
      )}
      <h1 className="min-w-0 flex-1 truncate px-1 text-[15px] font-semibold tracking-tight text-slate-900">{title}</h1>
      <button type="button" className={iconButtonClass} onClick={onMenuOpen} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </button>
    </header>
  );
}
