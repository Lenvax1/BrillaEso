﻿﻿﻿﻿﻿import { getEnv, getEnvUrl } from '@/lib/env'

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

function parseResponseDetail(text: string) {
  if (!text.trim()) return ''
  try {
    const json = JSON.parse(text) as { detail?: unknown; error?: unknown; message?: unknown }
    const detail = json.detail ?? json.error ?? json.message
    return typeof detail === 'string' && detail.trim() ? detail.trim() : text
  } catch {
    return text
  }
}

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

  const url = `${getEnvUrl('VITE_SUPABASE_URL')}/functions/v1/send-notification-email`
  const headers = {
    'Content-Type': 'application/json',
    apikey: getEnv('VITE_SUPABASE_ANON_KEY'),
  }

  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), EMAIL_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
      keepalive: true,
    })
  } catch (error) {
    window.clearTimeout(timer)
    const isAbort = error instanceof Error && error.name === 'AbortError'
    console.error('[email] fetch failed:', isAbort ? 'timeout' : error)
    return {
      ok: false,
      detail: isAbort
        ? 'email_timeout'
        : error instanceof Error
          ? error.message
          : 'email_request_failed',
    }
  } finally {
    window.clearTimeout(timer)
  }

  const text = await response.text().catch(() => '')
  const detail = parseResponseDetail(text)

  if (!response.ok) {
    console.error(`[email] HTTP ${response.status}:`, detail || text)
    return { ok: false, detail: detail || `email_http_${response.status}` }
  }

  if (text.trim()) {
    try {
      const json = JSON.parse(text) as { ok?: boolean; detail?: unknown; error?: unknown; message?: unknown }
      if (json.ok === false) {
        const providerDetail = typeof json.detail === 'string'
          ? json.detail
          : typeof json.error === 'string'
            ? json.error
            : typeof json.message === 'string'
              ? json.message
              : 'email_provider_error'
        console.error('[email] provider error:', providerDetail)
        return { ok: false, detail: providerDetail }
      }
    } catch {
    }
  }

  console.info('[email] sent successfully')
  return { ok: true }
}
