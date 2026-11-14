import { formatDateIST, formatTimeIST, todayISTDate, yesterdayISTDate } from '@/lib/formatDate';
import type { PointsLogEntry } from '@/types/database';

export interface PointsLogExplanation {
  type: 'task' | 'task_deleted' | 'bonus' | 'penalty' | 'reward';
  clientName: string | null;
  taskTitle: string;
  reasonText: string;
  timingText: string | null;
  formattedTimeIST: string;
  formattedDateTimeIST: string;
  pointsFormatted: string;
  isPositive: boolean;
}

export interface DayPointsGroup {
  dayKey: string;
  dateLabel: string;
  totalPoints: number;
  entries: PointsLogEntry[];
}

/** Formats milliseconds into e.g. "2h 10m", "40m", or "< 1m" */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.round(Math.abs(ms) / 60000);
  if (totalMinutes === 0) return '< 1m';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

/** Explains a single points_log entry with plain language, timing, and related task data. */
export function explainPointsEntry(entry: PointsLogEntry): PointsLogExplanation {
  const isPositive = entry.points >= 0;
  const pointsFormatted = (entry.points >= 0 ? '+' : '') + entry.points;
  const formattedTimeIST = `${formatTimeIST(entry.created_at)} IST`;
  const formattedDateTimeIST = `${formatDateIST(entry.created_at)} at ${formatTimeIST(entry.created_at)} IST`;

  // Case 1: Linked task is present
  if (entry.task_id && entry.task) {
    const task = entry.task;
    let reasonText = 'Finished on time';
    let timingText: string | null = null;

    const doneAtMs = task.done_at ? new Date(task.done_at).getTime() : null;
    const deadlineMs = task.deadline ? new Date(task.deadline).getTime() : null;

    if (doneAtMs !== null && deadlineMs !== null && !isNaN(doneAtMs) && !isNaN(deadlineMs)) {
      const diffMs = deadlineMs - doneAtMs;

      // 1 hour early or 15 points
      if (diffMs >= 3600000 || entry.points === 15) {
        reasonText = 'Finished early, more than 1 hour before the deadline';
      } else if (diffMs >= 0 || entry.points === 10) {
        reasonText = 'Finished on time';
      } else {
        reasonText = 'Finished late';
      }

      if (diffMs > 0) {
        timingText = `Finished ${formatDuration(diffMs)} before the deadline`;
      } else if (diffMs < 0) {
        timingText = `Finished ${formatDuration(Math.abs(diffMs))} after the deadline`;
      } else {
        timingText = 'Finished on the deadline';
      }
    } else {
      // Fallback based on points awarded
      if (entry.points >= 15) {
        reasonText = 'Finished early, more than 1 hour before the deadline';
      } else if (entry.points >= 10) {
        reasonText = 'Finished on time';
      } else if (entry.points > 0) {
        reasonText = 'Finished late';
      } else {
        reasonText = entry.reason || 'Finished task';
      }
    }

    return {
      type: 'task',
      clientName: task.client_name || null,
      taskTitle: task.title,
      reasonText,
      timingText,
      formattedTimeIST,
      formattedDateTimeIST,
      pointsFormatted,
      isPositive,
    };
  }

  // Case 2: Linked task was deleted or cannot be read
  if (entry.task_id && !entry.task) {
    return {
      type: 'task_deleted',
      clientName: null,
      taskTitle: 'Task no longer available',
      reasonText: entry.reason || 'Task was deleted',
      timingText: null,
      formattedTimeIST,
      formattedDateTimeIST,
      pointsFormatted,
      isPositive,
    };
  }

  // Case 3: Row without a task (bonus, penalty, or reward redeemed)
  const lowerReason = (entry.reason || '').toLowerCase();
  const isReward = lowerReason.includes('redeem');

  if (isReward) {
    const rawTitle = entry.reason.replace(/^(reward\s+redeemed:\s*|redeemed:\s*)/i, '').trim() || entry.reason;
    const text = `Reward redeemed: ${rawTitle}`;
    return {
      type: 'reward',
      clientName: null,
      taskTitle: text,
      reasonText: text,
      timingText: null,
      formattedTimeIST,
      formattedDateTimeIST,
      pointsFormatted,
      isPositive,
    };
  }

  if (entry.points >= 0) {
    const cleanReason = entry.reason.replace(/^bonus\s+(from\s+admin:\s*)?/i, '').trim() || 'Points adjustment';
    const text = `Bonus from admin: ${cleanReason}`;
    return {
      type: 'bonus',
      clientName: null,
      taskTitle: text,
      reasonText: text,
      timingText: null,
      formattedTimeIST,
      formattedDateTimeIST,
      pointsFormatted,
      isPositive,
    };
  }

  // Negative adjustment (penalty)
  const cleanReason = entry.reason.replace(/^penalty\s+(from\s+admin:\s*)?/i, '').trim() || 'Points adjustment';
  const text = `Penalty from admin: ${cleanReason}`;
  return {
    type: 'penalty',
    clientName: null,
    taskTitle: text,
    reasonText: text,
    timingText: null,
    formattedTimeIST,
    formattedDateTimeIST,
    pointsFormatted,
    isPositive,
  };
}

/** Groups entries by day in IST, ordered newest day first, with entries within each day ordered newest first. */
export function groupPointsLogByDayIST(entries: PointsLogEntry[]): DayPointsGroup[] {
  const map = new Map<string, PointsLogEntry[]>();

  for (const entry of entries) {
    const dayKey = todayISTDate(new Date(entry.created_at));
    const list = map.get(dayKey);
    if (list) {
      list.push(entry);
    } else {
      map.set(dayKey, [entry]);
    }
  }

  const todayStr = todayISTDate();
  const yesterdayStr = yesterdayISTDate();

  const groups: DayPointsGroup[] = [];

  for (const [dayKey, dayEntries] of map.entries()) {
    // Sort entries newest first
    dayEntries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const sampleDate = dayEntries[0].created_at;
    let dateLabel: string;
    if (dayKey === todayStr) {
      dateLabel = `Today · ${formatDateIST(sampleDate)}`;
    } else if (dayKey === yesterdayStr) {
      dateLabel = `Yesterday · ${formatDateIST(sampleDate)}`;
    } else {
      dateLabel = formatDateIST(sampleDate);
    }

    const totalPoints = dayEntries.reduce((sum, e) => sum + e.points, 0);

    groups.push({
      dayKey,
      dateLabel,
      totalPoints,
      entries: dayEntries,
    });
  }

  // Sort day groups newest first
  groups.sort((a, b) => b.dayKey.localeCompare(a.dayKey));
  return groups;
}
