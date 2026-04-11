import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import type { QuoteRequest } from '@/types'
import { withTimeout } from '@/lib/timeout'
import { Seo } from '@/components/Seo'

type ResultTone = 'success' | 'pending' | 'failure'

function getTone(statusParam: string | null): ResultTone {
  const s = (statusParam ?? '').toLowerCase()
  if (s.includes('approved') || s.includes('success')) return 'success'
  if (s.includes('pending') || s.includes('in_process')) return 'pending'
  return 'failure'
}

export default function PaymentResult() {
  const [params] = useSearchParams()
  const quoteId = params.get('external_reference') ?? params.get('quote')
  const status = params.get('status')
  const tone = useMemo(() => getTone(status), [status])
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState<QuoteRequest | null>(null)

  useEffect(() => {
    if (!quoteId) return
    let alive = true
    ;(async () => {
      setLoading(true)
      try {
        const { data } = await withTimeout(
          supabase.from('quote_requests').select('*').eq('id', quoteId).maybeSingle(),
          20_000,
          'El resultado de pago está tardando demasiado en cargar. Reintentá.'
        )
        if (!alive) return
        setQ((data as QuoteRequest) ?? null)
      } catch {
        if (!alive) return
        setQ(null)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [quoteId])

  const title =
    tone === 'success'
      ? 'Pago recibido'
      : tone === 'pending'
        ? 'Pago pendiente'
        : 'Pago no completado'

  const body =
    tone === 'success'
      ? 'Si todo salió bien, en unos segundos tu pedido va a quedar marcado como pagado.'
      : tone === 'pending'
        ? 'Mercado Pago indicó que el pago está pendiente. Podés volver más tarde para verificar.'
        : 'El pago no se completó. Podés intentar pagar de nuevo desde tu cotización.'

  return (
    <>
      <Seo title={title} description={body} canonicalPath="/pago/mercadopago" noIndex />
      <div className="mx-auto max-w-lg">
        <Card className="p-6">
          <div className="text-lg font-semibold text-text-primary">{title}</div>
          <div className="mt-2 text-sm text-text-secondary">{body}</div>
          {loading ? <div className="mt-4 h-10 animate-pulse rounded-lg border border-white/10 bg-white/5" /> : null}
          {q ? (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs text-text-secondary">Cotización</div>
              <div className="mt-1 text-sm text-text-primary">{q.id.slice(0, 8)}</div>
              {q.payment_status ? (
                <div className="mt-2 text-xs text-text-secondary">Estado: {q.payment_status}</div>
              ) : null}
            </div>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-2">
            <Link to="/mis-pedidos">
              <Button>Ir a mis pedidos</Button>
            </Link>
            <Link to="/">
              <Button variant="secondary">Volver al inicio</Button>
            </Link>
          </div>
        </Card>
      </div>
    </>
  )
}
