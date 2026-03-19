import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type RealtimeOptions = {
  channel: string
  table: string
  schema?: string
  delayMs?: number
}

export function useAutoRefresh(load: () => void | Promise<void>, realtime?: RealtimeOptions) {
  const realtimeChannel = realtime?.channel
  const realtimeDelayMs = realtime?.delayMs
  const realtimeSchema = realtime?.schema ?? 'public'
  const realtimeTable = realtime?.table

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const refresh = () => {
      void load()
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', refresh)
    window.addEventListener('online', refresh)

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', refresh)
      window.removeEventListener('online', refresh)
    }
  }, [load])

  useEffect(() => {
    if (!realtimeChannel || !realtimeTable) return

    let timeoutId: number | undefined
    const scheduleRefresh = () => {
      if (timeoutId) window.clearTimeout(timeoutId)
      timeoutId = window.setTimeout(() => {
        void load()
      }, realtimeDelayMs ?? 300)
    }

    const channel = supabase
      .channel(realtimeChannel)
      .on('postgres_changes', { event: '*', schema: realtimeSchema, table: realtimeTable }, scheduleRefresh)
      .subscribe()

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId)
      void supabase.removeChannel(channel)
    }
  }, [load, realtimeChannel, realtimeDelayMs, realtimeSchema, realtimeTable])
}
