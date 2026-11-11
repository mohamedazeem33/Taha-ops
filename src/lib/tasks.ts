import type { Task, TaskStatus, TaskWithRequests, TimeRequest } from '@/types/database';

export const TASK_COLUMNS =
  'id, assigned_to, assigned_by, task_date, client_name, title, description, deadline, status, done_at, confirmed_at, rejection_reason, rolled_over_from, created_at';

const HOUR_MS = 60 * 60 * 1000;

export function isDoneStatus(status: TaskStatus) {
  return status === 'done_pending' || status === 'completed';
}

export function isOpenStatus(status: TaskStatus) {
  return status === 'assigned' || status === 'rejected';
}

export function isOverdue(task: Task, now: number) {
  return isOpenStatus(task.status) && new Date(task.deadline).getTime() <= now;
}

export function latestPendingRequest(task: TaskWithRequests): TimeRequest | null {
  return task.time_requests.find((request) => request.status === 'pending') ?? null;
}

export function latestRejectedRequest(task: TaskWithRequests): TimeRequest | null {
  const rejected = task.time_requests.filter((request) => request.status === 'rejected');
  return rejected.sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
}

export type DayChip = 'on_track' | 'late' | 'all_done' | 'no_tasks';

export interface DaySummary {
  total: number;
  done: number;
  waiting: number;
  late: number;
  chip: DayChip;
}

export function summarizeDay(tasks: Task[], now: number): DaySummary {
  const total = tasks.length;
  const done = tasks.filter((task) => isDoneStatus(task.status)).length;
  const waiting = tasks.filter((task) => task.status === 'done_pending').length;
  const late = tasks.filter((task) => task.status === 'missed' || isOverdue(task, now)).length;

  let chip: DayChip = 'on_track';
  if (total === 0) chip = 'no_tasks';
  else if (done === total) chip = 'all_done';
  else if (late > 0) chip = 'late';

  return { total, done, waiting, late, chip };
}

export function formatRemaining(deadline: string, now: number) {
  const diff = new Date(deadline).getTime() - now;
  const overdue = diff <= 0;
  const abs = Math.abs(diff);
  const hours = Math.floor(abs / HOUR_MS);
  const minutes = Math.floor((abs % HOUR_MS) / 60000);
  const span = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  return {
    label: overdue ? `Overdue by ${span}` : `${span} left`,
    urgent: overdue || diff < HOUR_MS,
  };
}
