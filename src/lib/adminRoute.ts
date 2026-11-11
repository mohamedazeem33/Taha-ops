import { useEffect, useState } from 'react';

export type AdminRoute = 'home' | 'plan' | 'confirmations' | 'time-requests' | 'leaderboard' | 'rewards';

const ADMIN_ROUTES: AdminRoute[] = [
  'home',
  'plan',
  'confirmations',
  'time-requests',
  'leaderboard',
  'rewards',
];

export const ADMIN_ROUTE_PATHS: Record<AdminRoute, string> = {
  home: '#/admin',
  plan: '#/admin/plan',
  confirmations: '#/admin/confirmations',
  'time-requests': '#/admin/time-requests',
  leaderboard: '#/admin/leaderboard',
  rewards: '#/admin/rewards',
};

function routeFromHash(hash: string): AdminRoute {
  const name = hash.replace(/^#\/admin\/?/, '');
  const match = ADMIN_ROUTES.find((route) => route === (name || 'home'));
  return match ?? 'home';
}

export function useAdminRoute(): AdminRoute {
  const [route, setRoute] = useState<AdminRoute>(() => routeFromHash(window.location.hash));

  useEffect(() => {
    const handleChange = () => setRoute(routeFromHash(window.location.hash));
    window.addEventListener('hashchange', handleChange);
    return () => window.removeEventListener('hashchange', handleChange);
  }, []);

  return route;
}

export type EmployeeRoute = 'today' | 'progress' | 'leaderboard' | 'rewards';

const EMPLOYEE_ROUTES: EmployeeRoute[] = ['today', 'progress', 'leaderboard', 'rewards'];

export const EMPLOYEE_ROUTE_PATHS: Record<EmployeeRoute, string> = {
  today: '#/today',
  progress: '#/progress',
  leaderboard: '#/leaderboard',
  rewards: '#/rewards',
};

function employeeRouteFromHash(hash: string): EmployeeRoute {
  const name = hash.replace(/^#\/?/, '').replace(/^today\/?/, '');
  const match = EMPLOYEE_ROUTES.find((route) => route === (name || 'today'));
  return match ?? 'today';
}

export function useEmployeeRoute(): EmployeeRoute {
  const [route, setRoute] = useState<EmployeeRoute>(() => employeeRouteFromHash(window.location.hash));

  useEffect(() => {
    const handleChange = () => setRoute(employeeRouteFromHash(window.location.hash));
    window.addEventListener('hashchange', handleChange);
    return () => window.removeEventListener('hashchange', handleChange);
  }, []);

  return route;
}
