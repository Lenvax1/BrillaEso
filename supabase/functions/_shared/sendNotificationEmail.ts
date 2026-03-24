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

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export async function sendNotificationEmail(args: SendEmailArgs) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const senderEmail = Deno.env.get('MAIL_SENDER')
  if (!resendApiKey || !senderEmail) return { ok: true, skipped: true }

  let recipient = args.recipientEmail?.trim() || ''
  if (!recipient && args.userId) {
    const admin = createClient(args.supabaseUrl, args.serviceRoleKey)
    const userResult = await admin.auth.admin.getUserById(args.userId)
    recipient = userResult.data.user?.email ?? ''
  }
  if (!recipient) return { ok: true, skipped: true }

  const appBaseUrl = Deno.env.get('APP_BASE_URL') ?? ''
  const fullLink = args.linkUrl?.startsWith('http')
    ? args.linkUrl
    : (args.linkUrl ? `${appBaseUrl}${args.linkUrl}` : '')

  const safeTitle = escapeHtml(args.title)
  const safeBody = escapeHtml(args.body)
  const safeLink = escapeHtml(fullLink || '')
  const html = fullLink
    ? `<div><h2>${safeTitle}</h2><p>${safeBody}</p><p><a href="${safeLink}">Ver detalle</a></p></div>`
    : `<div><h2>${safeTitle}</h2><p>${safeBody}</p></div>`

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: senderEmail,
      to: [recipient],
      subject: args.title,
      html,
      text: fullLink ? `${args.title}\n\n${args.body}\n\n${fullLink}` : `${args.title}\n\n${args.body}`,
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    return { ok: false, detail: detail.slice(0, 600) }
  }

  return { ok: true }
}
