import type { ReactNode } from 'react';
import { AppShell } from '@/components/AppShell';
import { EMPLOYEE_ROUTE_PATHS, type EmployeeRoute } from '@/lib/adminRoute';

const NAV_ITEMS: { route: EmployeeRoute; label: string }[] = [
  { route: 'today', label: 'Today' },
  { route: 'progress', label: 'My progress' },
  { route: 'leaderboard', label: 'Leaderboard' },
  { route: 'rewards', label: 'Rewards' },
  { route: 'feedback', label: 'Feedback' },
];

interface EmployeeLayoutProps {
  active: EmployeeRoute;
  children: ReactNode;
}

export function EmployeeLayout({ active, children }: EmployeeLayoutProps) {
  return (
    <AppShell>
      <nav aria-label="Sections" className="-mx-1 mb-8 overflow-x-auto">
        <ul className="flex w-max gap-1 rounded-2xl border border-white/60 bg-white/85 p-1.5 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-[#100e28]/85">
          {NAV_ITEMS.map((item) => {
            const isActive = item.route === active;
            return (
              <li key={item.route}>
                <a
                  href={EMPLOYEE_ROUTE_PATHS[item.route]}
                  aria-current={isActive ? 'page' : undefined}
                  className={`block whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-[#ff4d79] via-[#ff6a5c] to-[#ff9040] text-[#1c0627] font-bold shadow-sm shadow-[#ff4d79]/20'
                      : 'text-slate-700 hover:bg-white/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
                  }`}
                >
                  {item.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
      {children}
    </AppShell>
  );
}
