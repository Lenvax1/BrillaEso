import { supabase } from '@/lib/supabase'

type SupabaseResult<T> = {
  data: T | null
  error: { message?: unknown } | null
}

export async function loadWithSessionRetry<T>(
  runQuery: () => PromiseLike<SupabaseResult<T>>
): Promise<SupabaseResult<T>> {
  const result = await runQuery()

  if (!result.error) return result

  const message = String(result.error?.message ?? '').toLowerCase()
  const isAuthError =
    message.includes('jwt') ||
    message.includes('invalid token') ||
    message.includes('token expired') ||
    message.includes('not authenticated') ||
    message.includes('not_authenticated') ||
    message.includes('session expired') ||
    message.includes('unauthorized') ||
    /\bauth\b/.test(message)

  if (isAuthError) {
    const { error: refreshError } = await supabase.auth.refreshSession()
    if (refreshError) return result
    return runQuery()
  }

  return result
}
