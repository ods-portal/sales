'use client';

import { Menu } from 'lucide-react';

interface TopBarProps {
  title: string;
  onMenuOpen: () => void;
}

export default function TopBar({ title, onMenuOpen }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-white/60 bg-white/80 px-4 backdrop-blur-xl md:hidden">
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
        onClick={onMenuOpen}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      <h1 className="truncate text-base font-bold tracking-tight text-slate-900">{title}</h1>
    </header>
  );
}
