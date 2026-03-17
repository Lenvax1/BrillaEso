import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type ReqBody = {
  quoteRequestId: string
  returnUrlBase: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const mpAccessToken = Deno.env.get('MP_ACCESS_TOKEN')

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Missing Supabase env' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!mpAccessToken) {
    return new Response(JSON.stringify({ error: 'Missing MP_ACCESS_TOKEN' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  const supabaseUser = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
  const { data: userData, error: userErr } = await supabaseUser.auth.getUser()
  if (userErr || !userData.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let body: ReqBody
  try {
    body = (await req.json()) as ReqBody
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!body.quoteRequestId || !body.returnUrlBase) {
    return new Response(JSON.stringify({ error: 'Missing quoteRequestId/returnUrlBase' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const admin = createClient(supabaseUrl, serviceKey)

  const { data: qr, error: qrErr } = await admin.from('quote_requests').select('*').eq('id', body.quoteRequestId).maybeSingle()
  if (qrErr || !qr) {
    return new Response(JSON.stringify({ error: 'Quote not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (qr.user_id !== userData.user.id) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (qr.quoted_price == null) {
    return new Response(JSON.stringify({ error: 'No quoted price yet' }), {
      status: 409,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (qr.payment_status === 'paid') {
    return new Response(JSON.stringify({ error: 'Already paid' }), {
      status: 409,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const returnUrl = new URL('/pago/mercadopago', body.returnUrlBase).toString()
  const notificationUrl = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/mp-webhook`

  const prefRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${mpAccessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      external_reference: body.quoteRequestId,
      notification_url: notificationUrl,
      back_urls: {
        success: returnUrl,
        pending: returnUrl,
        failure: returnUrl,
      },
      auto_return: 'approved',
      payer: {
        email: qr.contact_email,
      },
      items: [
        {
          title: 'Cuadro neón personalizado',
          quantity: 1,
          currency_id: 'ARS',
          unit_price: Number(qr.quoted_price),
        },
      ],
    }),
  })

  if (!prefRes.ok) {
    const text = await prefRes.text().catch(() => '')
    return new Response(JSON.stringify({ error: 'Mercado Pago error', detail: text.slice(0, 600) }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const pref = (await prefRes.json()) as { id?: string; init_point?: string; sandbox_init_point?: string }
  const initPoint = pref.init_point ?? pref.sandbox_init_point
  if (!pref.id || !initPoint) {
    return new Response(JSON.stringify({ error: 'Invalid Mercado Pago response' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  await admin
    .from('quote_requests')
    .update({
      customer_decision: 'accepted',
      decision_at: new Date().toISOString(),
      payment_provider: 'mercadopago',
      payment_status: 'pending',
      payment_preference_id: pref.id,
    })
    .eq('id', body.quoteRequestId)

  await admin.from('notifications').insert({
    user_id: userData.user.id,
    title: 'Presupuesto aceptado',
    body: 'Aceptaste el presupuesto. Completá el pago para continuar.',
    link_url: `/mis-pedidos/${body.quoteRequestId}`,
  })

  return new Response(JSON.stringify({ init_point: initPoint }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})

