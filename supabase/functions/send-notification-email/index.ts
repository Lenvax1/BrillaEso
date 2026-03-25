import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { sendNotificationEmail } from '../_shared/sendNotificationEmail.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type ReqBody = {
  userId?: string
  recipientEmail?: string
  title?: string
  body?: string
  linkUrl?: string | null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing Supabase env' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let payload: ReqBody
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const userId = payload.userId?.trim()
  const recipientEmail = payload.recipientEmail?.trim()
  const title = payload.title?.trim()
  const body = payload.body?.trim()
  
  if ((!userId && !recipientEmail) || !title || !body) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing recipient/title/body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const result = await sendNotificationEmail({
    supabaseUrl,
    serviceRoleKey,
    userId,
    recipientEmail,
    title,
    body,
    linkUrl: payload.linkUrl ?? null,
  })

  return new Response(JSON.stringify(result), {
    status: 200, 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
