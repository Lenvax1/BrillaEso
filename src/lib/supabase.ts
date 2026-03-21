import { createClient } from '@supabase/supabase-js'
import { getEnv, getEnvUrl } from '@/lib/env'

export const supabase = createClient(
  getEnvUrl('VITE_SUPABASE_URL'),
  getEnv('VITE_SUPABASE_ANON_KEY'),
  {
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
