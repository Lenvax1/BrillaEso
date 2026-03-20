import { createClient } from '@supabase/supabase-js'
import { getEnv } from '@/lib/env'

const SUPABASE_FETCH_TIMEOUT_MS = 12000

const timedFetch: typeof fetch = async (input, init) => {
  const controller = new AbortController()
  const externalSignal = init?.signal

  if (externalSignal?.aborted) {
    throw new DOMException('Aborted', 'AbortError')
  }

  const timeoutId = window.setTimeout(() => {
    controller.abort()
  }, SUPABASE_FETCH_TIMEOUT_MS)

  const onExternalAbort = () => controller.abort()
  externalSignal?.addEventListener('abort', onExternalAbort)

  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    window.clearTimeout(timeoutId)
    externalSignal?.removeEventListener('abort', onExternalAbort)
  }
}

export const supabase = createClient(
  getEnv('VITE_SUPABASE_URL'),
  getEnv('VITE_SUPABASE_ANON_KEY'),
  {
    global: {
      fetch: timedFetch,
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      lock: async (name, acquireTimeout, fn) => {
        return fn()
      },
    },
  }
)
