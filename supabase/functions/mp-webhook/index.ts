import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'
import { sendNotificationEmail } from '../_shared/sendNotificationEmail.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type WebhookBody = {
  type?: string
  data?: { id?: string | number }
}

async function fetchPayment(mpAccessToken: string, paymentId: string) {
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${mpAccessToken}` },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text.slice(0, 600) || 'Mercado Pago error')
  }
  return (await res.json()) as {
    id: number
    status: string
    status_detail?: string
    external_reference?: string
    transaction_amount?: number
    payer?: { email?: string }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const mpAccessToken = Deno.env.get('MP_ACCESS_TOKEN')
  if (!supabaseUrl || !serviceKey || !mpAccessToken) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let paymentId = new URL(req.url).searchParams.get('data.id')
  if (!paymentId) {
    try {
      const body = (await req.json()) as WebhookBody
      const id = body?.data?.id
      if (id != null) paymentId = String(id)
    } catch {
      paymentId = null
    }
  }

  if (!paymentId) {
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const admin = createClient(supabaseUrl, serviceKey)

  let payment
  try {
    payment = await fetchPayment(mpAccessToken, paymentId)
  } catch {
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const quoteRequestId = payment.external_reference
  if (!quoteRequestId) {
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: qr } = await admin.from('quote_requests').select('*').eq('id', quoteRequestId).maybeSingle()
  if (!qr) {
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (payment.status === 'approved') {
    const { data: updatedQr, error: paidError } = await admin
      .from('quote_requests')
      .update({
        payment_provider: 'mercadopago',
        payment_status: 'paid',
        payment_id: String(payment.id),
        payment_paid_at: new Date().toISOString(),
      })
      .eq('id', quoteRequestId)
      .not('payment_status', 'eq', 'paid')
      .select('id,user_id,quoted_price')
      .maybeSingle()
    if (paidError) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (updatedQr?.user_id) {
      await admin.from('orders').upsert(
        {
          user_id: updatedQr.user_id,
          quote_request_id: quoteRequestId,
          status: 'Creado',
          total_amount: updatedQr.quoted_price,
          shipping_json: null,
        },
        { onConflict: 'quote_request_id' }
      )

      await admin.from('notifications').insert({
        user_id: updatedQr.user_id,
        title: 'Pago recibido',
        body: 'Recibimos tu pago. Te vamos avisando los próximos estados.',
        link_url: `/mis-pedidos/${quoteRequestId}`,
      })
      const emailResult = await sendNotificationEmail({
        supabaseUrl,
        serviceRoleKey: serviceKey,
        userId: updatedQr.user_id,
        title: 'Pago recibido',
        body: 'Recibimos tu pago. Te vamos avisando los próximos estados.',
        linkUrl: `/mis-pedidos/${quoteRequestId}`,
      }).catch((error) => {
        console.error('sendNotificationEmail unexpected error', error)
        return { ok: false, detail: 'unexpected_error' }
      })
      if (!emailResult.ok) {
        console.error('sendNotificationEmail failed', emailResult)
      }

      await sendNotificationEmail({
        supabaseUrl,
        serviceRoleKey: serviceKey,
        recipientEmail: 'brillaesoneon@gmail.com',
        title: '¡Nuevo pedido pagado y creado!',
        body: `Se ha creado automáticamente un nuevo pedido tras recibir el pago.\nID de Cotización: ${quoteRequestId}\nMonto: $${updatedQr.quoted_price}`,
        linkUrl: '/admin/pedidos',
      }).catch((error) => console.error('Admin notification failed', error))
    }
  } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
    await admin
      .from('quote_requests')
      .update({
        payment_provider: 'mercadopago',
        payment_status: 'failed',
        payment_id: String(payment.id),
      })
      .eq('id', quoteRequestId)
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})

