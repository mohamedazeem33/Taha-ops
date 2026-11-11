import type { ReactNode } from 'react';
import { Layers, LogOut } from 'lucide-react';
import { Button } from '@/components/ui';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { account, signOut } = useAuth();

  return (
    <div className="relative min-h-screen">
      {/* ------------------------------------------------------------- */}
      {/* FIXED FULL-VIEWPORT BACKGROUND LAYER (DOES NOT SCROLL)         */}
      {/* ------------------------------------------------------------- */}
      <div
        className="pointer-events-none fixed inset-0 -z-20 h-full w-full select-none"
        aria-hidden="true"
      >
        {/* Light mode: vertical sky gradient (#8E74A8 -> #E58BA5 -> #F6BC9C) */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#8E74A8] via-[#E58BA5] to-[#F6BC9C] dark:hidden" />

        {/* Dark mode: deep indigo night gradient (#050713 -> #151b3d -> #251648) */}
        <div className="absolute inset-0 hidden bg-gradient-to-b from-[#050713] via-[#151b3d] to-[#251648] dark:block">
          {/* Faint static stars */}
          <svg className="h-full w-full opacity-35" xmlns="http://www.w3.org/2000/svg">
            <circle cx="10%" cy="12%" r="1" fill="#fff" opacity="0.6" />
            <circle cx="24%" cy="7%" r="0.8" fill="#fff" opacity="0.4" />
            <circle cx="38%" cy="18%" r="1.2" fill="#fff" opacity="0.5" />
            <circle cx="56%" cy="10%" r="0.75" fill="#fff" opacity="0.4" />
            <circle cx="72%" cy="22%" r="1" fill="#fff" opacity="0.5" />
            <circle cx="85%" cy="6%" r="0.8" fill="#fff" opacity="0.3" />
            <circle cx="94%" cy="19%" r="1" fill="#fff" opacity="0.4" />
            <circle cx="15%" cy="42%" r="0.8" fill="#fff" opacity="0.3" />
            <circle cx="48%" cy="36%" r="1.1" fill="#fff" opacity="0.45" />
            <circle cx="64%" cy="52%" r="0.75" fill="#fff" opacity="0.3" />
            <circle cx="82%" cy="45%" r="0.9" fill="#fff" opacity="0.35" />
            <circle cx="30%" cy="68%" r="1" fill="#fff" opacity="0.3" />
            <circle cx="78%" cy="74%" r="0.8" fill="#fff" opacity="0.25" />
            <circle cx="90%" cy="85%" r="0.7" fill="#fff" opacity="0.2" />
          </svg>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TOP NAVIGATION / HEADER (FROSTED PANEL)                       */}
      {/* ------------------------------------------------------------- */}
      <header className="sticky top-0 z-40 border-b border-white/40 bg-white/80 backdrop-blur-md dark:border-white/10 dark:bg-[#100e28]/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff4d79] to-[#ff9040] text-[#1c0627] shadow-sm shadow-[#ff4d79]/30">
              <Layers className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="font-display text-base font-bold tracking-tight text-slate-900 dark:text-white">
              Teamboard
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden text-sm font-medium text-slate-700 md:inline dark:text-slate-200">
              {account?.profile.full_name}
            </span>
            <ThemeToggle />
            <Button variant="secondary" onClick={() => void signOut()} aria-label="Log out">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Log out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}
