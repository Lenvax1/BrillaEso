import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

type SendEmailArgs = {
  supabaseUrl: string
  serviceRoleKey: string
  userId?: string
  recipientEmail?: string
  title: string
  body: string
  linkUrl?: string | null
}

type SendEmailResult =
  | { ok: true; warning?: string }
  | { ok: false; detail: string }

const RESEND_TIMEOUT_MS = 12000

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function formatBodyHtml(value: string) {
  const text = escapeHtml(value).trim()
  if (!text) return '<p style="margin:0;color:#1f2937;font-size:15px;line-height:1.7;">&nbsp;</p>'
  const paragraphs = text
    .split(/\r?\n\r?\n/)
    .map((paragraph) => paragraph.replace(/\r?\n/g, '<br/>').trim())
    .filter(Boolean)
  if (!paragraphs.length) return '<p style="margin:0;color:#1f2937;font-size:15px;line-height:1.7;">&nbsp;</p>'
  return paragraphs
    .map((paragraph) => `<p style="margin:0 0 14px;color:#1f2937;font-size:15px;line-height:1.7;">${paragraph}</p>`)
    .join('')
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function resolveFullLink(linkUrl?: string | null): { ok: true; fullLink: string; warning?: string } | { ok: false; detail: string } {
  const rawLink = linkUrl?.trim() ?? ''
  if (!rawLink) return { ok: true, fullLink: '' }

  if (rawLink.startsWith('/')) {
    const appBaseUrl = Deno.env.get('APP_BASE_URL')?.trim() ?? ''
    if (!appBaseUrl) return { ok: true, fullLink: '', warning: 'missing_app_base_url' }
    try {
      let safeBaseUrl = appBaseUrl
      if (!safeBaseUrl.startsWith('http://') && !safeBaseUrl.startsWith('https://')) {
        safeBaseUrl = 'https://' + safeBaseUrl
      }
      return { ok: true, fullLink: new URL(rawLink, safeBaseUrl).toString() }
    } catch (e) {
      console.error('Error resolviendo link con APP_BASE_URL:', { appBaseUrl, rawLink, error: e })
      return { ok: true, fullLink: '', warning: 'invalid_app_base_url' }
    }
  }

  try {
    const url = new URL(rawLink)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return { ok: true, fullLink: '', warning: 'invalid_link_url' }
    return { ok: true, fullLink: url.toString() }
  } catch {
    return { ok: true, fullLink: '', warning: 'invalid_link_url' }
  }
}

export async function sendNotificationEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const senderEmail = Deno.env.get('MAIL_SENDER')
  if (!resendApiKey || !senderEmail) return { ok: false, detail: 'missing_resend_config' }

  let recipient = args.recipientEmail?.trim() || ''
  if (!recipient && args.userId) {
    const admin = createClient(args.supabaseUrl, args.serviceRoleKey)
    const userResult = await admin.auth.admin.getUserById(args.userId)
    recipient = userResult.data.user?.email ?? ''
  }
  if (!recipient) return { ok: false, detail: 'missing_recipient_email' }
  if (!isValidEmail(recipient)) return { ok: false, detail: 'invalid_recipient_email' }

  const linkResult = resolveFullLink(args.linkUrl)
  if (!linkResult.ok) return linkResult
  const fullLink = linkResult.fullLink

  const safeTitle = escapeHtml(args.title)
  const safeLink = escapeHtml(fullLink || '')
  const safeBodyHtml = formatBodyHtml(args.body)
  const ctaHtml = fullLink
    ? `<tr><td style="padding:0 32px 28px;"><a href="${safeLink}" style="display:inline-block;background:#2563eb;border-radius:10px;padding:12px 20px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">Ver detalle del pedido</a></td></tr>`
    : ''
  const html = `<html><body style="margin:0;padding:0;background:#f3f4f6;font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:24px 12px;"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:16px;overflow:hidden;"><tr><td style="padding:22px 32px;background:#0f172a;"><div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#93c5fd;font-weight:600;">Brilla Eso</div><h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;line-height:1.3;font-weight:700;">${safeTitle}</h1></td></tr><tr><td style="padding:28px 32px 12px;">${safeBodyHtml}</td></tr>${ctaHtml}<tr><td style="padding:0 32px 28px;color:#6b7280;font-size:12px;line-height:1.6;">Este mensaje fue enviado automáticamente por Brilla Eso.</td></tr></table></td></tr></table></body></html>`

  let response: Response
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), RESEND_TIMEOUT_MS)
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        from: senderEmail,
        to: [recipient],
        subject: args.title,
        html,
        text: fullLink ? `${args.title}\n\n${args.body}\n\n${fullLink}` : `${args.title}\n\n${args.body}`,
      }),
    })
  } catch (error) {
    clearTimeout(timeoutId)
    return {
      ok: false,
      detail: error instanceof Error && error.name === 'AbortError'
        ? 'resend_timeout'
        : error instanceof Error
          ? error.message.slice(0, 600)
          : 'provider_request_failed',
    }
  }
  clearTimeout(timeoutId)

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    return { ok: false, detail: detail.slice(0, 600) }
  }

  return linkResult.warning ? { ok: true, warning: linkResult.warning } : { ok: true }
}
