export type AppRole = 'admin' | 'employee';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
}

export interface Account {
  profile: Profile;
  role: AppRole;
}

export type TaskStatus = 'assigned' | 'done_pending' | 'completed' | 'rejected' | 'missed';

export type TimeRequestStatus = 'pending' | 'approved' | 'rejected';

export interface Task {
  id: string;
  assigned_to: string;
  assigned_by: string;
  task_date: string;
  client_name: string;
  title: string;
  description: string;
  deadline: string;
  status: TaskStatus;
  done_at: string | null;
  confirmed_at: string | null;
  rejection_reason: string | null;
  rolled_over_from: string | null;
  created_at: string;
}

export interface TimeRequest {
  id: string;
  status: TimeRequestStatus;
  requested_deadline: string;
  created_at: string;
}

export interface TaskWithRequests extends Task {
  time_requests: TimeRequest[];
}

export interface TaskDraft {
  client_name: string;
  title: string;
  description: string;
  deadline: string;
}

export interface PointsLogEntry {
  id: string;
  employee_id: string;
  task_id: string | null;
  points: number;
  reason: string;
  created_at: string;
}

export interface EmployeeStreak {
  employee_id: string;
  current_streak: number;
  best_streak: number;
  last_streak_date: string | null;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon_name: string;
  created_at: string;
}

export interface EmployeeBadge {
  employee_id: string;
  badge_id: string;
  awarded_at: string;
}

export interface Reward {
  id: string;
  title: string;
  description: string;
  points_cost: number;
  is_active: boolean;
  created_at: string;
}

export interface RewardRequest {
  id: string;
  employee_id: string;
  reward_id: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export interface RewardWithReward extends Reward {
  reward_requests?: RewardRequest[];
}

export interface LeaderboardRow {
  employee_id: string;
  full_name: string;
  total_points: number;
  current_streak: number;
}
