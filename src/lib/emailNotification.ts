import { supabase } from '@/lib/supabase'

export type EmailNotificationPayload = {
  userId?: string
  recipientEmail?: string
  title: string
  body: string
  linkUrl?: string | null
}

export type EmailNotificationResult = {
  ok: boolean
  detail?: string
}

const EMAIL_TIMEOUT_MS = 7000

export async function sendEmailNotification(payload: EmailNotificationPayload): Promise<EmailNotificationResult> {
  if ((!payload.userId && !payload.recipientEmail) || !payload.title?.trim() || !payload.body?.trim()) {
    console.warn('[email] skipped: invalid payload', {
      hasUserId: Boolean(payload.userId),
      hasRecipientEmail: Boolean(payload.recipientEmail),
      hasTitle: Boolean(payload.title?.trim()),
      hasBody: Boolean(payload.body?.trim()),
    })
    return { ok: false, detail: 'invalid_payload' }
  }

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification-email`
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token ?? ''

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: anonKey,
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), EMAIL_TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timer)
    const isAbort = err instanceof Error && err.name === 'AbortError'
    console.error('[email] fetch failed:', isAbort ? 'timeout' : err)
    return {
      ok: false,
      detail: isAbort
        ? 'email_timeout'
        : err instanceof Error
          ? err.message
          : 'email_request_failed',
    }
  } finally {
    clearTimeout(timer)
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    let detail = text
    try {
      const json = JSON.parse(text)
      detail = String(json.detail ?? json.error ?? text)
    } catch {
      // use raw text
    }
    console.error(`[email] HTTP ${res.status}:`, detail)
    return { ok: false, detail: detail || `email_http_${res.status}` }
  }

  const text = await res.text().catch(() => '')
  try {
    const json = JSON.parse(text)
    if (json.ok === false) {
      console.error('[email] provider error:', json.detail ?? json.error)
      return { ok: false, detail: json.detail ?? json.error ?? 'email_provider_error' }
    }
  } catch {
    // response body is not JSON, but status was ok — treat as success
  }

  console.info('[email] sent successfully')
  return { ok: true }
}
