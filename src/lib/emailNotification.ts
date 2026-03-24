import { supabase } from '@/lib/supabase'
import { getEnv } from '@/lib/env'

type EmailNotificationPayload = {
  userId?: string
  recipientEmail?: string
  title: string
  body: string
  linkUrl?: string | null
}

type EmailNotificationResult = {
  ok: boolean
  status?: number
  detail?: string
}

export async function sendEmailNotification(payload: EmailNotificationPayload) {
  if ((!payload.userId && !payload.recipientEmail) || !payload.title?.trim() || !payload.body?.trim()) {
    console.warn('send-notification-email skipped invalid payload', {
      hasUserId: Boolean(payload.userId),
      hasRecipientEmail: Boolean(payload.recipientEmail),
      hasTitle: Boolean(payload.title?.trim()),
      hasBody: Boolean(payload.body?.trim()),
    })
    return { ok: false, detail: 'invalid_payload' } satisfies EmailNotificationResult
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
      return { ok: false, detail: 'missing_auth_session' } satisfies EmailNotificationResult
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
      return {
        ok: false,
        status: result.status,
        detail: typeof result.data === 'object' && result.data && 'detail' in result.data
          ? String((result.data as { detail?: unknown }).detail ?? '')
          : 'invoke_failed',
      } satisfies EmailNotificationResult
    }
    const data = result.data
    if (data && typeof data === 'object' && 'ok' in data && (data as { ok?: boolean }).ok === false) {
      console.error('send-notification-email provider error', data)
      return {
        ok: false,
        detail: 'provider_error',
      } satisfies EmailNotificationResult
    }
    if (data && typeof data === 'object' && 'skipped' in data && (data as { skipped?: boolean }).skipped) {
      console.warn('send-notification-email skipped', data)
      return { ok: false, detail: 'skipped' } satisfies EmailNotificationResult
    }
    return { ok: true } satisfies EmailNotificationResult
  } catch (e) {
    console.error('send-notification-email unexpected error', e)
    return { ok: false, detail: e instanceof Error ? e.message : 'unexpected_error' } satisfies EmailNotificationResult
  }
}
