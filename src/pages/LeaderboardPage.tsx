import { useEffect, useState } from 'react';
import { EmployeeLayout } from '@/components/employee/EmployeeLayout';
import { LeaderboardList } from '@/components/LeaderboardList';
import { Alert, Spinner } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { fetchLeaderboard } from '@/lib/gamificationApi';
import type { LeaderboardRow } from '@/types/database';

export function LeaderboardPage() {
  const { account } = useAuth();
  const [period, setPeriod] = useState<'weekly' | 'all_time'>('weekly');
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    void fetchLeaderboard(period)
      .then((data) => {
        setRows(data);
        setError(null);
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : 'Could not load the leaderboard.');
      })
      .finally(() => setLoading(false));
  }, [period]);

  return (
    <EmployeeLayout active="leaderboard">
      <div className="space-y-8 animate-slide-up">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-slate-100">
              Leaderboard
            </h1>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              {period === 'weekly' ? 'This week (resets Monday 12 AM IST)' : 'All-time standings'}
            </p>
          </div>
          <div className="flex w-full gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm sm:w-auto dark:border-slate-800 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setPeriod('weekly')}
              className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition sm:flex-none ${
                period === 'weekly'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              Weekly
            </button>
            <button
              type="button"
              onClick={() => setPeriod('all_time')}
              className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition sm:flex-none ${
                period === 'all_time'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              All-time
            </button>
          </div>
        </header>

        {loading && <Spinner label="Loading leaderboard" />}
        {!loading && error && <Alert tone="error">{error}</Alert>}
        {!loading && !error && (
          <LeaderboardList rows={rows} highlightId={account?.profile.id} />
        )}
      </div>
    </EmployeeLayout>
  );
}
