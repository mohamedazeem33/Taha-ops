import { useEffect, useState } from 'react';
import { Gift } from 'lucide-react';
import { EmployeeLayout } from '@/components/employee/EmployeeLayout';
import { Alert, Button, Spinner } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useGamificationStats } from '@/hooks/useGamificationStats';
import {
  createRewardRequest,
  fetchMyRewardRequests,
  fetchRewards,
} from '@/lib/gamificationApi';
import type { Reward, RewardRequest } from '@/types/database';

export function RewardsPage() {
  const { account } = useAuth();
  const { totalPoints, reload: reloadStats } = useGamificationStats();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [requests, setRequests] = useState<RewardRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    try {
      const [rewardData, requestData] = await Promise.all([fetchRewards(), fetchMyRewardRequests()]);
      setRewards(rewardData.filter((r) => r.is_active));
      setRequests(requestData);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load rewards.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const pendingRewardIds = new Set(
    requests.filter((r) => r.status === 'pending').map((r) => r.reward_id),
  );

  const handleRequest = async (reward: Reward) => {
    if (!account) return;
    setBusyId(reward.id);
    setActionError(null);
    try {
      await createRewardRequest(reward.id, account.profile.id);
      await load();
      await reloadStats();
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : 'Something went wrong. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <EmployeeLayout active="rewards">
      <div className="space-y-8 animate-slide-up">
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-slate-100">Rewards</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            You have <span className="font-semibold text-brand-700 dark:text-brand-300">{totalPoints} points</span> to spend.
          </p>
        </header>

        {loading && <Spinner label="Loading rewards" />}
        {!loading && error && <Alert tone="error">{error}</Alert>}
        {actionError && <Alert tone="error">{actionError}</Alert>}

        {!loading && !error && rewards.length === 0 && (
          <p className="rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            No rewards available right now. Check back later.
          </p>
        )}

        {!loading && !error && rewards.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rewards.map((reward) => {
              const canAfford = totalPoints >= reward.points_cost;
              const alreadyPending = pendingRewardIds.has(reward.id);
              return (
                <div
                  key={reward.id}
                  className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
                    <Gift className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-3 font-semibold text-slate-900 dark:text-slate-100">{reward.title}</h3>
                  {reward.description && (
                    <p className="mt-1 flex-1 text-sm text-slate-500 dark:text-slate-400">{reward.description}</p>
                  )}
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="text-lg font-bold tabular-nums text-brand-700 dark:text-brand-300">
                      {reward.points_cost} pts
                    </span>
                    <Button
                      size="sm"
                      disabled={!canAfford || alreadyPending}
                      loading={busyId === reward.id}
                      onClick={() => void handleRequest(reward)}
                    >
                      {alreadyPending ? 'Requested' : canAfford ? 'Request' : 'Not enough'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && !error && requests.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">My requests</h2>
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
              {requests.map((request) => (
                <li key={request.id} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                      {rewards.find((r) => r.id === request.reward_id)?.title ?? 'Reward'}
                    </p>
                    {request.status === 'rejected' && request.rejection_reason && (
                      <p className="mt-0.5 text-xs text-rose-600 dark:text-rose-400">Rejected: {request.rejection_reason}</p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      request.status === 'approved'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : request.status === 'rejected'
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                    }`}
                  >
                    {request.status === 'approved' ? 'Approved' : request.status === 'rejected' ? 'Rejected' : 'Pending'}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </EmployeeLayout>
  );
}
