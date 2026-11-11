import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { LeaderboardList } from '@/components/LeaderboardList';
import { Alert, Spinner } from '@/components/ui';
import { fetchLeaderboard } from '@/lib/gamificationApi';
import type { LeaderboardRow } from '@/types/database';

export function AdminLeaderboardPage() {
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
    <AdminLayout active="leaderboard">
      <div className="space-y-8 animate-slide-up">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)] sm:text-4xl">
              Leaderboard
            </h1>
            <p className="mt-2 text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]">
              {period === 'weekly' ? 'This week (resets Monday 12 AM IST)' : 'All-time standings'}
            </p>
          </div>
          <div className="flex w-full gap-1 rounded-2xl border border-white/60 bg-white/85 p-1.5 shadow-sm sm:w-auto dark:border-white/10 dark:bg-[#100e28]/85 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setPeriod('weekly')}
              className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition sm:flex-none cursor-pointer ${
                period === 'weekly'
                  ? 'bg-gradient-to-r from-[#ff4d79] via-[#ff6a5c] to-[#ff9040] text-[#1c0627] font-bold shadow-sm shadow-[#ff4d79]/20'
                  : 'text-slate-700 hover:bg-white/80 dark:text-slate-300 dark:hover:bg-white/10'
              }`}
            >
              Weekly
            </button>
            <button
              type="button"
              onClick={() => setPeriod('all_time')}
              className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition sm:flex-none cursor-pointer ${
                period === 'all_time'
                  ? 'bg-gradient-to-r from-[#ff4d79] via-[#ff6a5c] to-[#ff9040] text-[#1c0627] font-bold shadow-sm shadow-[#ff4d79]/20'
                  : 'text-slate-700 hover:bg-white/80 dark:text-slate-300 dark:hover:bg-white/10'
              }`}
            >
              All-time
            </button>
          </div>
        </header>

        {loading && <Spinner label="Loading leaderboard" />}
        {!loading && error && <Alert tone="error">{error}</Alert>}
        {!loading && !error && <LeaderboardList rows={rows} />}
      </div>
    </AdminLayout>
  );
}
