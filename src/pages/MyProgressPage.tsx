import { useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronDown, Flame, Info, Loader2, Sparkles, Trophy } from 'lucide-react';
import { EmployeeLayout } from '@/components/employee/EmployeeLayout';
import { BadgeGallery } from '@/components/employee/BadgeGallery';
import { StatCard } from '@/components/StatCard';
import { Alert, Button, Spinner } from '@/components/ui';
import { useGamificationStats } from '@/hooks/useGamificationStats';
import { fetchAllBadges, fetchMyPointsLog } from '@/lib/gamificationApi';
import { explainPointsEntry, groupPointsLogByDayIST } from '@/lib/pointsExplanation';
import type { Badge, PointsLogEntry } from '@/types/database';

export function MyProgressPage() {
  const { streak, pointsLog, badges, loading, error } = useGamificationStats();
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [badgesLoading, setBadgesLoading] = useState(true);
  const [historyEntries, setHistoryEntries] = useState<PointsLogEntry[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    void fetchAllBadges()
      .then((data) => setAllBadges(data))
      .catch(() => setAllBadges([]))
      .finally(() => setBadgesLoading(false));
  }, []);

  useEffect(() => {
    setHistoryEntries(pointsLog);
    setHasMore(pointsLog.length >= 50);
  }, [pointsLog]);

  const handleLoadMore = async () => {
    if (loadingMore) return;
    try {
      setLoadingMore(true);
      const nextBatch = await fetchMyPointsLog(50, historyEntries.length);
      setHistoryEntries((prev) => [...prev, ...nextBatch]);
      setHasMore(nextBatch.length >= 50);
    } catch {
      // Keep previous entries on error
    } finally {
      setLoadingMore(false);
    }
  };

  const dayGroups = useMemo(() => groupPointsLogByDayIST(historyEntries), [historyEntries]);

  // Smooth scroll to target section if navigated via a shortcut hash
  useEffect(() => {
    if (loading) return;
    const hash = window.location.hash;
    const targetId = hash.includes('points-history')
      ? 'points-history'
      : hash.includes('badges')
      ? 'badges'
      : hash.includes('streaks')
      ? 'streaks'
      : null;

    if (targetId) {
      const timer = window.setTimeout(() => {
        const el = document.getElementById(targetId);
        el?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
      return () => window.clearTimeout(timer);
    }
  }, [loading]);

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
            {streak && (
              <section id="streaks" className="grid grid-cols-2 gap-3 md:gap-4 scroll-mt-24">
                <StatCard
                  icon={Flame}
                  iconTone="text-[#ff6a5c] bg-[#ff6a5c]/10 dark:text-[#ff9040] dark:bg-[#ff9040]/20"
                  value={streak.current_streak}
                  label="Current streak"
                />
                <StatCard
                  icon={Trophy}
                  iconTone="text-amber-600 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/60"
                  value={streak.best_streak}
                  label="Best streak"
                />
              </section>
            )}

            <section id="badges" className="space-y-4 scroll-mt-24">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Badges</h2>
              {badgesLoading ? (
                <Spinner label="Loading badges" />
              ) : (
                <BadgeGallery badges={allBadges} earned={badges} />
              )}
            </section>

            <section id="points-history" className="space-y-4 scroll-mt-24">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Points history</h2>
              </div>

              {/* How points work box */}
              <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-amber-500/5 via-brand-500/5 to-transparent p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                  <Sparkles className="h-4 w-4 text-[#ff6a5c]" aria-hidden="true" />
                  <span>How points work</span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-center dark:border-emerald-500/30 dark:bg-emerald-950/40">
                    <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">&gt; 1 hour early</p>
                    <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">+15</p>
                  </div>
                  <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-2.5 text-center dark:border-sky-500/30 dark:bg-sky-950/40">
                    <p className="text-xs font-medium text-sky-800 dark:text-sky-300">On time</p>
                    <p className="text-lg font-black text-sky-600 dark:text-sky-400">+10</p>
                  </div>
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-2.5 text-center dark:border-amber-500/30 dark:bg-amber-950/40">
                    <p className="text-xs font-medium text-amber-800 dark:text-amber-300">Late</p>
                    <p className="text-lg font-black text-amber-600 dark:text-amber-400">+2</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-100/80 p-2.5 text-center dark:border-slate-800 dark:bg-slate-800/60">
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Rejected or missed</p>
                    <p className="text-lg font-black text-slate-500 dark:text-slate-400">0</p>
                  </div>
                </div>

                <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Info className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                  Points arrive when the admin confirms your task.
                </p>
              </div>

              {historyEntries.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  No points earned yet. Your admin confirms a task to earn points.
                </p>
              ) : (
                <div className="space-y-4">
                  {dayGroups.map((group) => (
                    <div
                      key={group.dayKey}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                          <span>{group.dateLabel}</span>
                        </div>
                        <span
                          className={`font-bold tabular-nums ${
                            group.totalPoints >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {group.totalPoints >= 0 ? '+' : ''}
                          {group.totalPoints} pts
                        </span>
                      </div>

                      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                        {group.entries.map((entry) => {
                          const exp = explainPointsEntry(entry);
                          return (
                            <li
                              key={entry.id}
                              className="flex flex-col gap-2 p-4 transition-colors hover:bg-slate-50/50 sm:flex-row sm:items-center sm:justify-between sm:gap-4 dark:hover:bg-slate-800/30"
                            >
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  {exp.clientName && (
                                    <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-800 dark:bg-brand-900/50 dark:text-brand-200">
                                      {exp.clientName}
                                    </span>
                                  )}
                                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    {exp.taskTitle}
                                  </h4>
                                </div>

                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                                  <span className="font-medium text-slate-700 dark:text-slate-300">
                                    {exp.reasonText}
                                  </span>
                                  {exp.timingText && (
                                    <>
                                      <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">
                                        ·
                                      </span>
                                      <span className="text-slate-500 dark:text-slate-400">
                                        {exp.timingText}
                                      </span>
                                    </>
                                  )}
                                </div>

                                <p className="text-xs text-slate-400 dark:text-slate-500">
                                  {exp.formattedDateTimeIST}
                                </p>
                              </div>

                              <div className="flex shrink-0 items-center justify-between sm:justify-end">
                                <span
                                  className={`inline-flex items-center rounded-xl px-3 py-1 text-sm font-black tabular-nums ${
                                    exp.isPositive
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                  }`}
                                >
                                  {exp.pointsFormatted} pts
                                </span>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}

                  {hasMore && (
                    <div className="flex justify-center pt-2">
                      <Button
                        variant="secondary"
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        className="w-full sm:w-auto"
                      >
                        {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronDown className="h-4 w-4" />}
                        {loadingMore ? 'Loading older entries...' : 'Show more'}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </EmployeeLayout>
  );
}
