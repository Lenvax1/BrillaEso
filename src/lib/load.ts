import { supabase } from '@/lib/supabase'
import { withTimeout } from '@/lib/timeout'

type SupabaseResult<T> = {
  data: T | null
  error: { message?: unknown } | null
}

const DEFAULT_QUERY_TIMEOUT_MS = 20_000
const DEFAULT_QUERY_TIMEOUT_MESSAGE = 'La carga tardó demasiado. Reintentá con Actualizar.'
const DEFAULT_SESSION_TIMEOUT_MESSAGE = 'La sesión está tardando demasiado.'

function looksLikeAuthError(error: { message?: unknown } | null) {
  const message = String(error?.message ?? '').toLowerCase()
  return message.includes('jwt') || message.includes('auth')
}

export async function loadWithSessionRetry<T>(
  runQuery: (signal: AbortSignal) => PromiseLike<SupabaseResult<T>>,
  options?: {
    signal?: AbortSignal
    queryTimeoutMs?: number
    queryTimeoutMessage?: string
    sessionTimeoutMessage?: string
  }
) {
  const upstreamSignal = options?.signal
  const queryTimeoutMs = options?.queryTimeoutMs ?? DEFAULT_QUERY_TIMEOUT_MS
  const queryTimeoutMessage = options?.queryTimeoutMessage ?? DEFAULT_QUERY_TIMEOUT_MESSAGE
  const sessionTimeoutMessage = options?.sessionTimeoutMessage ?? DEFAULT_SESSION_TIMEOUT_MESSAGE

  const run = () => {
    const controller = new AbortController()

    if (upstreamSignal) {
      if (upstreamSignal.aborted) controller.abort()
      else upstreamSignal.addEventListener('abort', () => controller.abort(), { once: true })
    }

    return withTimeout(runQuery(controller.signal), queryTimeoutMs, queryTimeoutMessage, () => controller.abort())
  }

  let result = await run()
  if (!result.error || !looksLikeAuthError(result.error)) return result

  await withTimeout(supabase.auth.refreshSession(), 6_000, sessionTimeoutMessage).catch(() => null)
  result = await run()
  return result
}
