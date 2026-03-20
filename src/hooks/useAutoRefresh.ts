import { useCallback, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

type RealtimeOptions = {
  channel: string
  table: string
  schema?: string
}

type AutoRefreshOptions = {
  realtime?: RealtimeOptions
}

export function useAutoRefresh(load: () => void | Promise<void>, options?: AutoRefreshOptions) {
  const realtimeChannel = options?.realtime?.channel
  const realtimeSchema = options?.realtime?.schema ?? 'public'
  const realtimeTable = options?.realtime?.table
  const loadRef = useRef(load)
  const runningRef = useRef(false)
  const queuedRef = useRef(false)
  loadRef.current = load

  const runLoad = useCallback(() => {
    if (runningRef.current) {
      queuedRef.current = true
      return
    }
    runningRef.current = true
    Promise.resolve(loadRef.current())
      .catch(() => null)
      .finally(() => {
        runningRef.current = false
        if (!queuedRef.current) return
        queuedRef.current = false
        if (document.visibilityState === 'visible') runLoad()
      })
  }, [])

  useEffect(() => {
    if (document.visibilityState === 'visible') runLoad()
  }, [runLoad])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') runLoad()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onVisible)
    }
  }, [runLoad])

  useEffect(() => {
    if (!realtimeChannel || !realtimeTable) return
    const channel = supabase
      .channel(realtimeChannel)
      .on('postgres_changes', { event: '*', schema: realtimeSchema, table: realtimeTable }, () => {
        if (document.visibilityState === 'visible') runLoad()
      })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [realtimeChannel, realtimeSchema, realtimeTable, runLoad])
}
