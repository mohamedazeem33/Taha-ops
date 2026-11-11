import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';

export async function callEdgeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T & { error?: string }>(name, { body });

  if (error) {
    let message = FALLBACK_MESSAGE;
    if (error instanceof FunctionsHttpError) {
      try {
        const payload = (await error.context.json()) as { error?: unknown };
        if (typeof payload.error === 'string') message = payload.error;
      } catch {
        message = FALLBACK_MESSAGE;
      }
    }
    throw new Error(message);
  }

  if (!data || typeof data !== 'object' || 'error' in data) {
    throw new Error(FALLBACK_MESSAGE);
  }
  return data;
}
