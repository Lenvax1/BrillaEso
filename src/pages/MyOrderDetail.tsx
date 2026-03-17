import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import type { QuoteRequest } from '@/types'
import { formatDateShort, formatMoneyARS } from '@/lib/format'
import { getStatusTone } from '@/lib/status'
import { getSignedStorageUrl } from '@/lib/storage'
import { Spinner } from '@/components/ui/Spinner'

export default function MyOrderDetail() {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState<QuoteRequest | null>(null)
  const [imgUrl, setImgUrl] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const load = useMemo(() => {
    return async () => {
      if (!id) return
      setLoading(true)
      setError(null)
      const { data, error } = await supabase.from('quote_requests').select('*').eq('id', id).maybeSingle()
      if (error || !data) {
        setError(error?.message ?? 'No encontrado')
        setQ(null)
        setLoading(false)
        return
      }
      const qr = data as QuoteRequest
      setQ(qr)
      try {
        const signed = await getSignedStorageUrl('references', qr.reference_image_url)
        setImgUrl(signed)
      } catch {
        setImgUrl('')
      }
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const acceptAndPay = async () => {
    if (!q) return
    setActionError(null)
    setBusy(true)
    try {
      const { data, error } = await supabase.functions.invoke('mp-create-preference', {
        body: { quoteRequestId: q.id, returnUrlBase: window.location.origin },
      })
      if (error) throw error
      const initPoint = (data as { init_point?: string } | null)?.init_point
      if (!initPoint) throw new Error('No se pudo iniciar el pago')
      window.location.href = initPoint
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'No se pudo iniciar el pago')
    } finally {
      setBusy(false)
    }
  }

  const rejectQuote = async () => {
    if (!q) return
    setActionError(null)
    setBusy(true)
    try {
      const { error } = await supabase.functions.invoke('quote-reject', {
        body: { quoteRequestId: q.id },
      })
      if (error) throw error
      await load()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'No se pudo rechazar el presupuesto')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 text-text-secondary">
          <Spinner />
          Cargando…
        </div>
      </Card>
    )
  }

  if (error || !q) {
    return (
      <Card className="p-6">
        <div className="text-sm font-semibold text-text-primary">No se pudo cargar</div>
        <div className="mt-2 text-sm text-text-secondary">{error ?? 'No encontrado'}</div>
        <div className="mt-4">
          <Link to="/mis-pedidos">
            <Button variant="secondary">Volver</Button>
          </Link>
        </div>
      </Card>
    )
  }

  let specs: unknown = null
  try {
    specs = JSON.parse(q.specs_json)
  } catch {
    specs = q.specs_json
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      <Card className="overflow-hidden">
        {imgUrl ? (
          <img src={imgUrl} alt="Referencia" className="w-full object-cover" />
        ) : (
          <div className="aspect-[4/3] w-full bg-white/5" />
        )}
      </Card>
      <div className="grid gap-4">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-text-primary">Solicitud {q.id.slice(0, 8)}</div>
              <div className="mt-1 text-sm text-text-secondary">Creada: {formatDateShort(q.created_at)}</div>
            </div>
            <Badge tone={getStatusTone(q.status)}>{q.status}</Badge>
          </div>
          {q.quoted_price != null ? (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs text-text-secondary">Presupuesto</div>
              <div className="mt-1 text-lg font-semibold text-text-primary">{formatMoneyARS(q.quoted_price)}</div>
            </div>
          ) : null}

          {q.quoted_price != null ? (
            <div className="mt-4 grid gap-3">
              {q.payment_status === 'paid' ? (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-sm font-semibold text-text-primary">Pago confirmado</div>
                  <div className="mt-1 text-sm text-text-secondary">Ya recibimos tu pago. Te avisamos cuando pase a producción.</div>
                </div>
              ) : q.customer_decision === 'rejected' ? (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-sm font-semibold text-text-primary">Presupuesto rechazado</div>
                  <div className="mt-1 text-sm text-text-secondary">Si querés ajustar medidas o detalles, podés crear una nueva cotización.</div>
                </div>
              ) : q.customer_decision === 'accepted' ? (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-sm font-semibold text-text-primary">Presupuesto aceptado</div>
                  <div className="mt-1 text-sm text-text-secondary">Para continuar, completá el pago.</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button onClick={() => void acceptAndPay()} disabled={busy}>
                      {busy ? 'Redirigiendo…' : 'Pagar ahora'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-sm font-semibold text-text-primary">Decisión del presupuesto</div>
                  <div className="mt-1 text-sm text-text-secondary">Aceptá para pagar y comenzar la producción, o rechazá si querés cambiar algo.</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button onClick={() => void acceptAndPay()} disabled={busy}>
                      {busy ? 'Redirigiendo…' : 'Aceptar y pagar'}
                    </Button>
                    <Button variant="secondary" onClick={() => void rejectQuote()} disabled={busy}>
                      Rechazar
                    </Button>
                  </div>
                </div>
              )}
              {actionError ? (
                <div className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{actionError}</div>
              ) : null}
            </div>
          ) : null}
        </Card>

        <Card className="p-5">
          <div className="text-sm font-semibold text-text-primary">Requisitos</div>
          <pre className="mt-3 overflow-auto rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-text-secondary">
            {typeof specs === 'string' ? specs : JSON.stringify(specs, null, 2)}
          </pre>
        </Card>

        <Link to="/mis-pedidos">
          <Button variant="secondary">Volver</Button>
        </Link>
      </div>
    </div>
  )
}
