import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'
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
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Missing Supabase env' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
  const { data: authData, error: authError } = await userClient.auth.getUser()
  if (authError || !authData.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized', detail: authError?.message ?? '' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)
  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('is_admin')
    .eq('id', authData.user.id)
    .maybeSingle()
  if (profileError) {
    return new Response(JSON.stringify({ error: 'Failed to verify permissions' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const isAdmin = !!profile?.is_admin

  let payload: ReqBody
  try {
    payload = (await req.json()) as ReqBody
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const userId = payload.userId?.trim()
  const recipientEmail = payload.recipientEmail?.trim()
  const title = payload.title?.trim()
  const body = payload.body?.trim()
  if ((!userId && !recipientEmail) || !title || !body) {
    return new Response(JSON.stringify({ error: 'Missing recipient/title/body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  if (!isAdmin) {
    if (userId && userId !== authData.user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (recipientEmail && recipientEmail.toLowerCase() !== (authData.user.email ?? '').toLowerCase()) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }
  if (!isAdmin && !userId && !recipientEmail) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
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

  if (!result.ok) {
    return new Response(JSON.stringify({ error: 'Email provider error', detail: result.detail ?? '' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
