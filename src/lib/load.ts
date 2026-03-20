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
  const isAuthError = message.includes('jwt') || message.includes('auth')

  if (isAuthError) {
    await supabase.auth.refreshSession().catch(() => null)
    return runQuery()
  }

  return result
}