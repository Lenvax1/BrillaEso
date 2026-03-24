import { supabase } from '@/lib/supabase'
import { getEnv } from '@/lib/env'

type EmailNotificationPayload = {
  userId?: string
  recipientEmail?: string
  title: string
  body: string
  linkUrl?: string | null
}

export async function sendEmailNotification(payload: EmailNotificationPayload) {
  if ((!payload.userId && !payload.recipientEmail) || !payload.title?.trim() || !payload.body?.trim()) {
    console.warn('send-notification-email skipped invalid payload', payload)
    return
  }

  const invokeWithToken = async (accessToken: string) => {
    const supabaseUrl = getEnv('VITE_SUPABASE_URL')
    const anonKey = getEnv('VITE_SUPABASE_ANON_KEY')
    const response = await fetch(`${supabaseUrl}/functions/v1/send-notification-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    })
    let data: unknown = null
    try {
      data = await response.json()
    } catch {
      data = null
    }
    return { ok: response.ok, status: response.status, data }
  }

  try {
    const sessionResult = await supabase.auth.getSession()
    const initialToken = sessionResult.data.session?.access_token ?? null
    const refreshed = await supabase.auth.refreshSession().catch(() => null)
    const token = refreshed?.data.session?.access_token ?? initialToken
    if (!token) {
      console.warn('send-notification-email skipped missing auth session')
      return
    }

    let result = await invokeWithToken(token)
    if (!result.ok && result.status === 401) {
      const secondRefresh = await supabase.auth.refreshSession().catch(() => null)
      const retryToken = secondRefresh?.data.session?.access_token
      if (retryToken) {
        result = await invokeWithToken(retryToken)
      }
    }
    if (!result.ok) {
      console.error('send-notification-email invoke failed', result)
      return
    }
    const data = result.data
    if (data && typeof data === 'object' && 'ok' in data && (data as { ok?: boolean }).ok === false) {
      console.error('send-notification-email provider error', data)
      return
    }
    if (data && typeof data === 'object' && 'skipped' in data && (data as { skipped?: boolean }).skipped) {
      console.warn('send-notification-email skipped', data)
    }
  } catch (e) {
    console.error('send-notification-email unexpected error', e)
    return
  }
}
