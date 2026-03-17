import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'

type AuthState = {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  initDone: boolean
  init: () => Promise<void>
  signIn: (args: { email: string; password: string }) => Promise<void>
  signUp: (args: { email: string; password: string }) => Promise<'signed_in' | 'needs_email_confirm'>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

let authListener: { unsubscribe: () => void } | null = null
let initPromise: Promise<void> | null = null

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  loading: true,
  initDone: false,
  init: async () => {
    if (get().initDone) return
    if (initPromise) return initPromise

    initPromise = (async () => {
      set({ loading: true })

      try {
        const sessionResult = await Promise.race([
          supabase.auth.getSession(),
          new Promise<{ data: { session: null }; error: null }>((resolve) => {
            window.setTimeout(() => resolve({ data: { session: null }, error: null }), 2000)
          }),
        ])

        if (sessionResult.error) throw sessionResult.error

        set({ session: sessionResult.data.session ?? null, user: sessionResult.data.session?.user ?? null })
        await get().refreshProfile()

        if (!authListener) {
          const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
            set({ session: session ?? null, user: session?.user ?? null })
            try {
              await get().refreshProfile()
            } catch {
              set({ profile: null })
            }
          })
          authListener = sub.subscription
        }
      } finally {
        set({ loading: false, initDone: true })
        initPromise = null
      }
    })()

    return initPromise
  },
  signIn: async ({ email, password }) => {
    set({ loading: true })
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    set({ loading: false })
    if (error) throw error
  },
  signUp: async ({ email, password }) => {
    set({ loading: true })
    try {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
      return data.session ? 'signed_in' : 'needs_email_confirm'
    } finally {
      set({ loading: false })
    }
  },
  signOut: async () => {
    set({ loading: true, session: null, user: null, profile: null })

    const clearPromise = supabase.auth.signOut({ scope: 'local' }).catch(() => null)
    await Promise.race([
      clearPromise,
      new Promise((resolve) => {
        window.setTimeout(resolve, 1200)
      }),
    ])

    set({ loading: false })
  },
  refreshProfile: async () => {
    const user = get().user
    if (!user) {
      set({ profile: null })
      return
    }

    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
    if (error) {
      set({ profile: null })
      return
    }

    if (data) {
      set({ profile: (data as Profile) ?? null })
      return
    }

    try {
      const inserted = await supabase.from('profiles').insert({ id: user.id }).select('*').single()
      set({ profile: (inserted.data as Profile) ?? null })
    } catch {
      set({ profile: null })
    }
  },
}))
