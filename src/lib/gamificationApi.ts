import { supabase } from '@/lib/supabase';
import type {
  Badge,
  EmployeeBadge,
  EmployeeStreak,
  LeaderboardRow,
  PointsLogEntry,
  Reward,
  RewardRequest,
} from '@/types/database';

const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';

function toError(error: { message?: string } | null): Error {
  return new Error(error?.message?.trim() || FALLBACK_MESSAGE);
}

export async function fetchMyPointsLog(limit = 50, offset = 0): Promise<PointsLogEntry[]> {
  const { data, error } = await supabase
    .from('points_log')
    .select(`
      id,
      employee_id,
      task_id,
      points,
      reason,
      created_at,
      task:tasks!task_id(id, title, client_name, deadline, done_at, status)
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error || !Array.isArray(data)) throw toError(error);
  return data as unknown as PointsLogEntry[];
}

export async function fetchMyStreak(): Promise<EmployeeStreak | null> {
  const { data, error } = await supabase
    .from('employee_streaks')
    .select('employee_id, current_streak, best_streak, last_streak_date')
    .maybeSingle();
  if (error) throw toError(error);
  return data as EmployeeStreak | null;
}

export async function fetchMyPoints(employeeId?: string): Promise<number> {
  let targetId = employeeId;
  if (!targetId) {
    const { data: { user } } = await supabase.auth.getUser();
    targetId = user?.id;
  }
  const { data, error } = await supabase.rpc('get_employee_points', {
    p_employee_id: targetId ?? null,
  });
  if (error) throw toError(error);
  return typeof data === 'number' ? data : 0;
}

export async function fetchMyPointsById(employeeId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_employee_points', { p_employee_id: employeeId });
  if (error) throw toError(error);
  return typeof data === 'number' ? data : 0;
}

export async function fetchAllBadges(): Promise<Badge[]> {
  const { data, error } = await supabase
    .from('badges')
    .select('id, name, description, icon_name, created_at')
    .order('created_at', { ascending: true });
  if (error || !Array.isArray(data)) throw toError(error);
  return data as Badge[];
}

export async function fetchMyBadges(): Promise<EmployeeBadge[]> {
  const { data, error } = await supabase
    .from('employee_badges')
    .select('employee_id, badge_id, awarded_at')
    .order('awarded_at', { ascending: false });
  if (error || !Array.isArray(data)) throw toError(error);
  return data as EmployeeBadge[];
}

export async function fetchLeaderboard(period: 'weekly' | 'all_time'): Promise<LeaderboardRow[]> {
  const { data, error } = await supabase.rpc('get_leaderboard', { p_period: period });
  if (error || !Array.isArray(data)) throw toError(error);
  return data as LeaderboardRow[];
}

export async function fetchRewards(): Promise<Reward[]> {
  const { data, error } = await supabase
    .from('rewards')
    .select('id, title, description, points_cost, is_active, created_at')
    .order('points_cost', { ascending: true });
  if (error || !Array.isArray(data)) throw toError(error);
  return data as Reward[];
}

export async function fetchMyRewardRequests(): Promise<RewardRequest[]> {
  const { data, error } = await supabase
    .from('reward_requests')
    .select('id, employee_id, reward_id, status, rejection_reason, created_at, reviewed_at')
    .order('created_at', { ascending: false });
  if (error || !Array.isArray(data)) throw toError(error);
  return data as RewardRequest[];
}

export async function createRewardRequest(rewardId: string, employeeId: string) {
  const { error } = await supabase
    .from('reward_requests')
    .insert({ reward_id: rewardId, employee_id: employeeId });
  if (error) throw toError(error);
}

export async function createReward(input: { title: string; description: string; points_cost: number }) {
  const { error } = await supabase
    .from('rewards')
    .insert({ title: input.title, description: input.description, points_cost: input.points_cost });
  if (error) throw toError(error);
}

export async function updateReward(rewardId: string, input: Partial<Pick<Reward, 'title' | 'description' | 'points_cost' | 'is_active'>>) {
  const { error } = await supabase.from('rewards').update(input).eq('id', rewardId);
  if (error) throw toError(error);
}

export async function deleteReward(rewardId: string) {
  const { error } = await supabase.from('rewards').delete().eq('id', rewardId);
  if (error) throw toError(error);
}

export async function approveRewardRequest(requestId: string) {
  const { error } = await supabase.rpc('approve_reward_request', { p_request_id: requestId });
  if (error) throw toError(error);
}

export async function rejectRewardRequest(requestId: string, reason?: string) {
  const { error } = await supabase.rpc('reject_reward_request', {
    p_request_id: requestId,
    p_reason: reason ?? null,
  });
  if (error) throw toError(error);
}

export async function addManualAdjustment(employeeId: string, points: number, reason: string) {
  const { error } = await supabase.rpc('add_manual_adjustment', {
    p_employee_id: employeeId,
    p_points: points,
    p_reason: reason,
  });
  if (error) throw toError(error);
}

export async function fetchPendingRewardRequests() {
  const { data, error } = await supabase
    .from('reward_requests')
    .select(
      'id, employee_id, reward_id, status, rejection_reason, created_at, reviewed_at, reward:rewards!reward_id(title, description, points_cost), employee:profiles!employee_id(full_name)',
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error || !Array.isArray(data)) throw toError(error);
  return data as unknown as Array<{
    id: string;
    employee_id: string;
    reward_id: string;
    status: string;
    rejection_reason: string | null;
    created_at: string;
    reviewed_at: string | null;
    reward: { title: string; description: string; points_cost: number } | null;
    employee: { full_name: string } | null;
  }>;
}
