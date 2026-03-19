import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type RealtimeOptions = {
  channel: string
  table: string
  schema?: string
  delayMs?: number
}

type AutoRefreshOptions = {
  realtime?: RealtimeOptions
  onHidden?: () => void
}

export function useAutoRefresh(load: () => void | Promise<void>, options?: AutoRefreshOptions) {
  const realtimeChannel = options?.realtime?.channel
  const realtimeDelayMs = options?.realtime?.delayMs
  const realtimeSchema = options?.realtime?.schema ?? 'public'
  const realtimeTable = options?.realtime?.table
  const onHidden = options?.onHidden

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const refresh = () => {
      void load()
    }

    const onVisible = () => {
      if (document.visibilityState !== 'visible') {
        onHidden?.()
        return
      }

      window.setTimeout(refresh, 0)
    }

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', refresh)
    window.addEventListener('online', refresh)

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', refresh)
      window.removeEventListener('online', refresh)
    }
  }, [load, onHidden])

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
