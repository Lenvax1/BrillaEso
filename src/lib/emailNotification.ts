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

export async function sendEmailNotification(payload: EmailNotificationPayload): Promise<EmailNotificationResult> {
  if ((!payload.userId && !payload.recipientEmail) || !payload.title?.trim() || !payload.body?.trim()) {
    console.warn('send-notification-email skipped: invalid payload', {
      hasUserId: Boolean(payload.userId),
      hasRecipientEmail: Boolean(payload.recipientEmail),
      hasTitle: Boolean(payload.title?.trim()),
      hasBody: Boolean(payload.body?.trim()),
    })
    return { ok: false, detail: 'invalid_payload' }
  }

  try {
    const { data, error } = await supabase.functions.invoke('send-notification-email', {
      body: payload,
    })

    if (error) {
      console.error('send-notification-email error:', error)
      return { ok: false, detail: error.message || 'invoke_failed' }
    }

    if (data && typeof data === 'object' && data.ok === false) {
      console.error('send-notification-email returned not ok:', data)
      return { ok: false, detail: data.detail || 'provider_error' }
    }

    console.info('send-notification-email success:', data)
    return { ok: true }
  } catch (e) {
    console.error('send-notification-email exception:', e)
    return { ok: false, detail: e instanceof Error ? e.message : 'unexpected_error' }
  }
}
