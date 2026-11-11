import type { ReactNode } from 'react';
import { AppShell } from '@/components/AppShell';
import { ADMIN_ROUTE_PATHS, type AdminRoute } from '@/lib/adminRoute';

const NAV_ITEMS: { route: AdminRoute; label: string }[] = [
  { route: 'home', label: 'Overview' },
  { route: 'plan', label: "Today's plan" },
  { route: 'confirmations', label: 'Confirmations' },
  { route: 'time-requests', label: 'Time requests' },
  { route: 'leaderboard', label: 'Leaderboard' },
  { route: 'rewards', label: 'Rewards' },
];

interface AdminLayoutProps {
  active: AdminRoute;
  children: ReactNode;
}

export function AdminLayout({ active, children }: AdminLayoutProps) {
  return (
    <AppShell>
      <nav aria-label="Admin sections" className="-mx-1 mb-8 overflow-x-auto">
        <ul className="flex w-max gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {NAV_ITEMS.map((item) => {
            const isActive = item.route === active;
            return (
              <li key={item.route}>
                <a
                  href={ADMIN_ROUTE_PATHS[item.route]}
                  aria-current={isActive ? 'page' : undefined}
                  className={`block whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100'
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
