import { createClient } from '@supabase/supabase-js'
import { getEnv } from '@/lib/env'

const DEFAULT_FETCH_TIMEOUT_MS = 45_000

function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit) {
  const controller = new AbortController()
  const timeoutSignal =
    typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal
      ? (AbortSignal as unknown as { timeout: (ms: number) => AbortSignal }).timeout(DEFAULT_FETCH_TIMEOUT_MS)
      : null

  const t = timeoutSignal ? null : window.setTimeout(() => controller.abort(), DEFAULT_FETCH_TIMEOUT_MS)

  const upstreamSignal = init?.signal
  if (upstreamSignal) {
    if (upstreamSignal.aborted) controller.abort()
    else upstreamSignal.addEventListener('abort', () => controller.abort(), { once: true })
  }

  if (timeoutSignal) {
    if (timeoutSignal.aborted) controller.abort()
    else timeoutSignal.addEventListener('abort', () => controller.abort(), { once: true })
  }

  return fetch(input, { ...init, signal: controller.signal }).finally(() => {
    if (t) window.clearTimeout(t)
  })
}

export const supabase = createClient(
  getEnv('VITE_SUPABASE_URL'),
  getEnv('VITE_SUPABASE_ANON_KEY'),
  {
    global: {
      fetch: fetchWithTimeout,
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
)
