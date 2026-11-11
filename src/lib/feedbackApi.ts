import { supabase } from '@/lib/supabase';
import type {
  AdminFeedbackStats,
  FeedbackInboxMessage,
  FeedbackPinStatus,
  FeedbackRecipient,
  FeedbackTag,
  FeedbackVerifyResult,
  ReportedFeedbackMessage,
} from '@/types/database';

const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';

function toError(error: { message?: string } | null): Error {
  return new Error(error?.message?.trim() || FALLBACK_MESSAGE);
}

export async function fetchFeedbackPinStatus(): Promise<FeedbackPinStatus> {
  const { data, error } = await supabase.rpc('get_feedback_pin_status');
  if (error) throw toError(error);
  return data as FeedbackPinStatus;
}

export async function setFeedbackPin(pin: string): Promise<void> {
  const { error } = await supabase.rpc('set_feedback_pin', { p_pin: pin });
  if (error) throw toError(error);
}

export async function verifyFeedbackPin(pin: string): Promise<FeedbackVerifyResult> {
  const { data, error } = await supabase.rpc('verify_feedback_pin', { p_pin: pin });
  if (error) throw toError(error);
  return data as FeedbackVerifyResult;
}

export async function changeFeedbackPin(oldPin: string, newPin: string): Promise<FeedbackVerifyResult> {
  const { data, error } = await supabase.rpc('change_feedback_pin', {
    p_old_pin: oldPin,
    p_new_pin: newPin,
  });
  if (error) throw toError(error);
  return data as FeedbackVerifyResult;
}

export async function adminResetFeedbackPin(employeeId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_reset_feedback_pin', { p_employee_id: employeeId });
  if (error) throw toError(error);
}

export async function fetchFeedbackRecipients(): Promise<FeedbackRecipient[]> {
  const { data, error } = await supabase.rpc('get_feedback_recipients');
  if (error || !Array.isArray(data)) throw toError(error);
  return data as FeedbackRecipient[];
}

export async function sendFeedbackMessage(
  receiverId: string,
  tag: FeedbackTag | null,
  message: string,
): Promise<void> {
  const { error } = await supabase.rpc('send_feedback_message', {
    p_receiver_id: receiverId,
    p_tag: tag,
    p_message: message,
  });
  if (error) throw toError(error);
}

export async function fetchFeedbackInbox(pin: string): Promise<FeedbackInboxMessage[]> {
  const { data, error } = await supabase.rpc('get_feedback_inbox_messages', { p_pin: pin });
  if (error) throw toError(error);
  if (!Array.isArray(data)) return [];
  return data as FeedbackInboxMessage[];
}

export async function markFeedbackMessageRead(messageId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_feedback_message_read', { p_message_id: messageId });
  if (error) throw toError(error);
}

export async function reportFeedbackMessage(messageId: string): Promise<void> {
  const { error } = await supabase.rpc('report_feedback_message', { p_message_id: messageId });
  if (error) throw toError(error);
}

export async function fetchReportedFeedback(): Promise<ReportedFeedbackMessage[]> {
  const { data, error } = await supabase.rpc('get_reported_feedback_messages');
  if (error || !Array.isArray(data)) throw toError(error);
  return data as ReportedFeedbackMessage[];
}

export async function deleteReportedFeedback(messageId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_reported_feedback_message', { p_message_id: messageId });
  if (error) throw toError(error);
}

export async function fetchAdminFeedbackStats(): Promise<AdminFeedbackStats> {
  const { data, error } = await supabase.rpc('get_admin_feedback_stats');
  if (error) throw toError(error);
  const row = Array.isArray(data) ? data[0] : data;
  return {
    total_sent_this_week: Number(row?.total_sent_this_week ?? 0),
    total_reported: Number(row?.total_reported ?? 0),
  };
}

