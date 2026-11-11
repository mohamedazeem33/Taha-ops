import { useEffect, useState, type FormEvent } from 'react';
import { Gift, Plus, Trash2 } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Alert, Button, Field, Modal, Spinner, TextAreaField } from '@/components/ui';
import {
  approveRewardRequest,
  createReward,
  deleteReward,
  fetchPendingRewardRequests,
  fetchRewards,
  rejectRewardRequest,
  updateReward,
} from '@/lib/gamificationApi';
import type { Reward } from '@/types/database';

export function AdminRewardsPage() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [pendingRequests, setPendingRequests] = useState<
    Array<{
      id: string;
      employee_id: string;
      reward_id: string;
      reward: { title: string; description: string; points_cost: number } | null;
      employee: { full_name: string } | null;
      created_at: string;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteRewardItem, setDeleteRewardItem] = useState<Reward | null>(null);

  const load = async () => {
    try {
      const [rewardData, requestData] = await Promise.all([fetchRewards(), fetchPendingRewardRequests()]);
      setRewards(rewardData);
      setPendingRequests(requestData);
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

  const handleApprove = async (requestId: string) => {
    setActionError(null);
    try {
      await approveRewardRequest(requestId);
      await load();
    } catch (approveError) {
      setActionError(approveError instanceof Error ? approveError.message : 'Something went wrong.');
    }
  };

  const handleReject = async (requestId: string) => {
    setActionError(null);
    try {
      await rejectRewardRequest(requestId);
      await load();
    } catch (rejectError) {
      setActionError(rejectError instanceof Error ? rejectError.message : 'Something went wrong.');
    }
  };

  const handleToggleActive = async (reward: Reward) => {
    setActionError(null);
    try {
      await updateReward(reward.id, { is_active: !reward.is_active });
      await load();
    } catch (toggleError) {
      setActionError(toggleError instanceof Error ? toggleError.message : 'Something went wrong.');
    }
  };

  const handleDelete = async () => {
    if (!deleteRewardItem) return;
    setActionError(null);
    try {
      await deleteReward(deleteRewardItem.id);
      setDeleteRewardItem(null);
      await load();
    } catch (deleteError) {
      setActionError(deleteError instanceof Error ? deleteError.message : 'Something went wrong.');
    }
  };

  return (
    <AdminLayout active="rewards">
      <div className="space-y-8 animate-slide-up">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)] sm:text-4xl">Rewards</h1>
            <p className="mt-2 text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]">Perks employees can redeem with their points.</p>
          </div>
          <Button onClick={() => setShowAddModal(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add reward
          </Button>
        </header>

        {loading && <Spinner label="Loading rewards" />}
        {!loading && error && <Alert tone="error">{error}</Alert>}
        {actionError && <Alert tone="error">{actionError}</Alert>}

        {!loading && !error && pendingRequests.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Pending requests</h2>
            <ul className="space-y-3">
              {pendingRequests.map((request) => (
                <li
                  key={request.id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {request.reward?.title ?? 'Reward'}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {request.employee?.full_name ?? 'Employee'} · {request.reward?.points_cost ?? 0} pts
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2.5">
                    <Button size="sm" onClick={() => void handleApprove(request.id)}>
                      Approve
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => void handleReject(request.id)}>
                      Reject
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {!loading && !error && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">All rewards</h2>
            {rewards.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No rewards yet. Add one to let employees redeem their points.
              </p>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {rewards.map((reward) => (
                  <li
                    key={reward.id}
                    className={`flex flex-col rounded-2xl border p-5 shadow-sm dark:bg-slate-900 ${
                      reward.is_active
                        ? 'border-slate-200 bg-white dark:border-slate-800'
                        : 'border-slate-200 bg-slate-50 opacity-70 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
                        <Gift className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          reward.is_active
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {reward.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <h3 className="mt-3 font-semibold text-slate-900 dark:text-slate-100">{reward.title}</h3>
                    {reward.description && (
                      <p className="mt-1 flex-1 text-sm text-slate-500 dark:text-slate-400">{reward.description}</p>
                    )}
                    <p className="font-display mt-3 text-lg font-bold tabular-nums text-brand-700 dark:text-brand-300">
                      {reward.points_cost} pts
                    </p>
                    <div className="mt-4 flex gap-2.5">
                      <Button size="sm" variant="secondary" onClick={() => void handleToggleActive(reward)}>
                        {reward.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => setDeleteRewardItem(reward)}>
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Delete
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>

      {showAddModal && (
        <AddRewardModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => {
            setShowAddModal(false);
            void load();
          }}
        />
      )}

      {deleteRewardItem && (
        <Modal
          title="Delete reward?"
          description={deleteRewardItem.title}
          onClose={() => setDeleteRewardItem(null)}
        >
          <div className="space-y-5">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              This removes the reward permanently. Existing requests for it stay as-is.
            </p>
            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={() => setDeleteRewardItem(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => void handleDelete()}>
                Delete reward
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}

interface AddRewardModalProps {
  onClose: () => void;
  onCreated: () => void;
}

function AddRewardModal({ onClose, onCreated }: AddRewardModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pointsCost, setPointsCost] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const cost = Number(pointsCost);
    if (!title.trim()) {
      setError('Please add a reward title.');
      return;
    }
    if (!Number.isInteger(cost) || cost <= 0) {
      setError('Points cost must be a positive whole number.');
      return;
    }
    setSubmitting(true);
    try {
      await createReward({ title: title.trim(), description: description.trim(), points_cost: cost });
      onCreated();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Something went wrong.');
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Add reward" onClose={() => { if (!submitting) onClose(); }}>
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {error && <Alert tone="error">{error}</Alert>}
        <Field
          id="reward-title"
          label="Title"
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          disabled={submitting}
        />
        <TextAreaField
          id="reward-description"
          label="Description (optional)"
          rows={2}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={submitting}
        />
        <Field
          id="reward-cost"
          label="Points cost"
          type="number"
          min={1}
          required
          value={pointsCost}
          onChange={(event) => setPointsCost(event.target.value)}
          disabled={submitting}
        />
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Add reward
          </Button>
        </div>
      </form>
    </Modal>
  );
}
