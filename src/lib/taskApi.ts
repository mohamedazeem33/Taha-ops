import { supabase } from '@/lib/supabase';
import { TASK_COLUMNS } from '@/lib/tasks';
import type { TaskDraft, TaskWithRequests, Task } from '@/types/database';

const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';

function toError(error: { message?: string } | null): Error {
  return new Error(error?.message?.trim() || FALLBACK_MESSAGE);
}

const TASK_WITH_REQUESTS = `${TASK_COLUMNS}, time_requests(id, status, requested_deadline, created_at)`;

export async function fetchTasksForDay(day: string, includeCarriedOver = true): Promise<TaskWithRequests[]> {
  if (!includeCarriedOver) {
    const { data, error } = await supabase
      .from('tasks')
      .select(TASK_WITH_REQUESTS)
      .eq('task_date', day)
      .order('deadline', { ascending: true });
    if (error || !Array.isArray(data)) throw toError(error);
    return data as TaskWithRequests[];
  }

  // Fetch today's tasks and any unfinished tasks from earlier days (assigned, rejected, done_pending)
  const [currentDayRes, carriedOverRes] = await Promise.all([
    supabase
      .from('tasks')
      .select(TASK_WITH_REQUESTS)
      .eq('task_date', day)
      .order('deadline', { ascending: true }),
    supabase
      .from('tasks')
      .select(TASK_WITH_REQUESTS)
      .lt('task_date', day)
      .in('status', ['assigned', 'rejected', 'done_pending'])
      .order('deadline', { ascending: true }),
  ]);

  if (currentDayRes.error) throw toError(currentDayRes.error);
  if (carriedOverRes.error) throw toError(carriedOverRes.error);

  const combined = [...(currentDayRes.data ?? []), ...(carriedOverRes.data ?? [])];
  const uniqueMap = new Map<string, TaskWithRequests>();
  for (const t of combined) {
    uniqueMap.set(t.id, t as TaskWithRequests);
  }
  return Array.from(uniqueMap.values());
}

export interface CloseDayAuditTask extends Task {
  assignee?: { full_name: string } | null;
}

export async function fetchAuditTasksForCloseDay(day: string): Promise<CloseDayAuditTask[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(`${TASK_COLUMNS}, assignee:profiles!assigned_to(full_name)`)
    .lte('task_date', day)
    .in('status', ['assigned', 'rejected', 'done_pending'])
    .order('deadline', { ascending: true });
  if (error || !Array.isArray(data)) throw toError(error);
  return data as unknown as CloseDayAuditTask[];
}

export async function fetchTasksAwaitingConfirmation() {
  const { data, error } = await supabase
    .from('tasks')
    .select(`${TASK_COLUMNS}, assignee:profiles!assigned_to(full_name)`)
    .eq('status', 'done_pending')
    .order('done_at', { ascending: true });
  if (error || !Array.isArray(data)) throw toError(error);
  return data as unknown as (Task & { assignee: { full_name: string } | null })[];
}

export interface PendingTimeRequest {
  id: string;
  reason: string;
  requested_deadline: string;
  created_at: string;
  task: { client_name: string; title: string; deadline: string; status: string } | null;
  employee: { full_name: string } | null;
}

export async function fetchPendingTimeRequests(): Promise<PendingTimeRequest[]> {
  const { data, error } = await supabase
    .from('time_requests')
    .select(
      'id, reason, requested_deadline, created_at, task:tasks!task_id(client_name, title, deadline, status), employee:profiles!employee_id(full_name)',
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error || !Array.isArray(data)) throw toError(error);
  return data as unknown as PendingTimeRequest[];
}

export async function markTaskDone(taskId: string) {
  const { error } = await supabase.rpc('mark_task_done', { p_task_id: taskId });
  if (error) throw toError(error);
}

export async function requestMoreTime(input: {
  taskId: string;
  employeeId: string;
  reason: string;
  requestedDeadlineIso: string;
}) {
  const { error } = await supabase.from('time_requests').insert({
    task_id: input.taskId,
    employee_id: input.employeeId,
    reason: input.reason,
    requested_deadline: input.requestedDeadlineIso,
  });
  if (error) throw toError(error);
}

export async function createTasks(input: {
  assignedTo: string;
  assignedBy: string;
  taskDate: string;
  drafts: TaskDraft[];
}): Promise<TaskWithRequests[]> {
  const rows = input.drafts.map((draft) => ({
    assigned_to: input.assignedTo,
    assigned_by: input.assignedBy,
    task_date: input.taskDate,
    client_name: draft.client_name,
    title: draft.title,
    description: draft.description,
    deadline: draft.deadline,
  }));
  const { data, error } = await supabase
    .from('tasks')
    .insert(rows)
    .select(TASK_WITH_REQUESTS);
  if (error || !data) throw toError(error);
  return data as unknown as TaskWithRequests[];
}

export async function updateTask(taskId: string, draft: TaskDraft) {
  const { error } = await supabase
    .from('tasks')
    .update({
      client_name: draft.client_name,
      title: draft.title,
      description: draft.description,
      deadline: draft.deadline,
    })
    .eq('id', taskId);
  if (error) throw toError(error);
}

export async function deleteTask(taskId: string) {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  if (error) throw toError(error);
}

export async function reviewTask(taskId: string, decision: 'confirm' | 'reject', reason?: string) {
  const { error } = await supabase.rpc('review_task', {
    p_task_id: taskId,
    p_decision: decision,
    p_reason: reason ?? null,
  });
  if (error) throw toError(error);
}

export async function reviewTimeRequest(requestId: string, decision: 'approve' | 'reject', newDeadlineIso?: string) {
  const { error } = await supabase.rpc('review_time_request', {
    p_request_id: requestId,
    p_decision: decision,
    p_new_deadline: newDeadlineIso ?? null,
  });
  if (error) throw toError(error);
}

export async function closeDay(day: string): Promise<number> {
  const { data, error } = await supabase.rpc('close_day', { p_day: day });
  if (error || typeof data !== 'number') throw toError(error);
  return data;
}

export async function rollOverTasks(day: string): Promise<number> {
  const { data, error } = await supabase.rpc('roll_over_tasks', { p_day: day });
  if (error || typeof data !== 'number') throw toError(error);
  return data;
}
