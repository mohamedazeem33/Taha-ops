import { EmployeeLayout } from '@/components/employee/EmployeeLayout';
import { BadgeGallery } from '@/components/employee/BadgeGallery';
import { StatsTopBar } from '@/components/employee/StatsTopBar';
import { Alert, Spinner } from '@/components/ui';
import { useGamificationStats } from '@/hooks/useGamificationStats';
import { fetchAllBadges } from '@/lib/gamificationApi';
import { formatDeadlineIST } from '@/lib/formatDate';
import { useEffect, useState } from 'react';
import type { Badge } from '@/types/database';

export function MyProgressPage() {
  const { totalPoints, streak, pointsLog, badges, loading, error } = useGamificationStats();
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [badgesLoading, setBadgesLoading] = useState(true);

  useEffect(() => {
    void fetchAllBadges()
      .then((data) => setAllBadges(data))
      .catch(() => setAllBadges([]))
      .finally(() => setBadgesLoading(false));
  }, []);

  return (
    <EmployeeLayout active="progress">
      <div className="space-y-8 animate-slide-up">
        <header>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)] sm:text-4xl">
            My progress
          </h1>
          <p className="mt-2 text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]">Your points, streaks, and badges.</p>
        </header>

        {loading && <Spinner label="Loading your progress" />}
        {!loading && error && <Alert tone="error">{error}</Alert>}

        {!loading && !error && (
          <>
            <StatsTopBar totalPoints={totalPoints} currentStreak={streak?.current_streak ?? 0} doneCount={0} totalTasks={0} />

            {streak && (
              <section className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/60 bg-white p-5 text-center shadow-sm dark:border-white/10 dark:bg-slate-900">
                  <p className="font-display text-3xl font-black text-orange-500">{streak.current_streak}</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Current streak</p>
                </div>
                <div className="rounded-2xl border border-white/60 bg-white p-5 text-center shadow-sm dark:border-white/10 dark:bg-slate-900">
                  <p className="font-display text-3xl font-black text-slate-900 dark:text-slate-100">{streak.best_streak}</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Best streak</p>
                </div>
              </section>
            )}

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Badges</h2>
              {badgesLoading ? (
                <Spinner label="Loading badges" />
              ) : (
                <BadgeGallery badges={allBadges} earned={badges} />
              )}
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Points history</h2>
              {pointsLog.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  No points earned yet. Your admin confirms a task to earn points.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
                  {pointsLog.map((entry) => (
                    <li key={entry.id} className="flex items-center justify-between gap-4 px-5 py-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{entry.reason}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{formatDeadlineIST(entry.created_at)}</p>
                      </div>
                      <span
                        className={`shrink-0 text-lg font-bold tabular-nums ${
                          entry.points >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {entry.points >= 0 ? '+' : ''}
                        {entry.points}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </EmployeeLayout>
  );
}
