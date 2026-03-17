import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { supabase } from '@/lib/supabase'
import type { QuoteRequest } from '@/types'
import { formatDateShort, formatMoneyARS } from '@/lib/format'
import { getStatusTone } from '@/lib/status'
import { getSignedStorageUrl } from '@/lib/storage'
import { withTimeout } from '@/lib/timeout'

const QUOTE_STATUS_ALLOWED = 'Cotizado'

export default function AdminQuotes() {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [items, setItems] = useState<QuoteRequest[]>([])
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [detail, setDetail] = useState<QuoteRequest | null>(null)
  const [detailImg, setDetailImg] = useState<string>('')
  const [receiptUrl, setReceiptUrl] = useState<string>('')
  const [price, setPrice] = useState<string>('')
  const [status, setStatus] = useState<string>('En revisión')
  const [note, setNote] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [hasOrder, setHasOrder] = useState(false)

  const load = useMemo(() => {
    return async () => {
      setLoading(true)
      setLoadError(null)
      try {
        let attempt = 0
        while (attempt < 2) {
          const { data, error } = await withTimeout(
            supabase.from('quote_requests').select('*').order('created_at', { ascending: false }).limit(200),
            20_000,
            'La carga tardó demasiado. Reintentá con Actualizar.'
          )
          if (!error) {
            setItems((data as QuoteRequest[]) ?? [])
            return
          }

          const msg = String((error as { message?: unknown } | null)?.message ?? '')
          const looksAuth = msg.toLowerCase().includes('jwt') || msg.toLowerCase().includes('auth')
          if (looksAuth && attempt === 0) {
            await supabase.auth.refreshSession().catch(() => null)
            attempt++
            continue
          }
          throw error
        }
      } catch (e) {
        setItems([])
        setLoadError(e instanceof Error ? e.message : 'No se pudo cargar')
      } finally {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load()
    }
    const onOnline = () => void load()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
    }
  }, [load])

  useEffect(() => {
    let t: number | undefined
    const channel = supabase
      .channel('admin-quote-requests')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quote_requests' },
        () => {
          if (t) window.clearTimeout(t)
          t = window.setTimeout(() => {
            void load()
          }, 300)
        }
      )
      .subscribe()

    return () => {
      if (t) window.clearTimeout(t)
      void supabase.removeChannel(channel)
    }
  }, [load])

  useEffect(() => {
    if (!openId) {
      setDetail(null)
      setDetailImg('')
      setReceiptUrl('')
      setHasOrder(false)
      return
    }
    const found = items.find((x) => x.id === openId) ?? null
    setDetail(found)
    setPrice(found?.quoted_price != null ? String(found.quoted_price) : '')
    setStatus(found?.status ?? 'En revisión')
    setNote('')
    if (found?.reference_image_url) {
      void (async () => {
        try {
          const signed = await getSignedStorageUrl('references', found.reference_image_url)
          setDetailImg(signed)
        } catch {
          setDetailImg('')
        }
      })()
    }

    if (found?.payment_receipt_url) {
      void (async () => {
        try {
          const signed = await getSignedStorageUrl('receipts', found.payment_receipt_url)
          setReceiptUrl(signed)
        } catch {
          setReceiptUrl('')
        }
      })()
    } else {
      setReceiptUrl('')
    }

    if (found?.id) {
      void (async () => {
        const { count } = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('quote_request_id', found.id)
        setHasOrder((count ?? 0) > 0)
      })()
    }
  }, [openId, items])

  const filtered = items.filter((x) => {
    if (!query) return true
    const q = query.toLowerCase()
    return x.id.toLowerCase().includes(q) || x.contact_email.toLowerCase().includes(q)
  })

  const save = async () => {
    if (!detail) return
    setBusy(true)
    const numeric = price.trim() ? Number(price) : null

    const nextStatus = detail.status === QUOTE_STATUS_ALLOWED ? QUOTE_STATUS_ALLOWED : status === QUOTE_STATUS_ALLOWED ? QUOTE_STATUS_ALLOWED : detail.status
    await supabase
      .from('quote_requests')
      .update({ quoted_price: numeric, status: nextStatus })
      .eq('id', detail.id)
    if (note.trim()) {
      await supabase.from('notifications').insert({
        user_id: detail.user_id,
        title: `Actualización de solicitud ${detail.id.slice(0, 8)}`,
        body: note.trim(),
        link_url: `/mis-pedidos/${detail.id}`,
      })
    } else {
      await supabase.from('notifications').insert({
        user_id: detail.user_id,
        title: `Solicitud ${detail.id.slice(0, 8)}: ${status}`,
        body: numeric != null ? `Presupuesto: ${formatMoneyARS(numeric)}` : `Estado actualizado: ${status}`,
        link_url: `/mis-pedidos/${detail.id}`,
      })
    }
    await load()
    setBusy(false)
    setOpenId(null)
  }

  const createOrder = async () => {
    if (!detail) return
    if (!detail.user_id) return
    const numeric = price.trim() ? Number(price) : null
    setBusy(true)
    await supabase.from('orders').insert({
      user_id: detail.user_id,
      quote_request_id: detail.id,
      status: 'Creado',
      total_amount: numeric,
    })
    await supabase.from('notifications').insert({
      user_id: detail.user_id,
      title: `Pedido creado desde ${detail.id.slice(0, 8)}`,
      body: numeric != null ? `Total: ${formatMoneyARS(numeric)}` : 'Tu pedido ya está en proceso.',
      link_url: `/mis-pedidos/${detail.id}`,
    })
    await load()
    setBusy(false)
    setHasOrder(true)
  }

  const markPaid = async () => {
    if (!detail) return
    setBusy(true)
    await supabase.rpc('admin_mark_transfer_paid', { p_quote_request_id: detail.id })
    await supabase.from('notifications').insert({
      user_id: detail.user_id,
      title: `Pago verificado ${detail.id.slice(0, 8)}`,
      body: 'Verificamos tu transferencia. Continuamos con la producción.',
      link_url: `/mis-pedidos/${detail.id}`,
    })
    await load()
    setBusy(false)
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-lg font-semibold text-text-primary">Cotizaciones</div>
          <div className="mt-1 text-sm text-text-secondary">Bandeja de solicitudes y presupuestos.</div>
        </div>
        <div className="flex items-end gap-3">
          <Button size="sm" variant="secondary" onClick={() => void load()} disabled={loading}>
            Actualizar
          </Button>
        <div className="w-full max-w-sm">
          <div className="mb-2 text-xs text-text-secondary">Buscar por email/ID</div>
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="cliente@email.com" />
        </div>
        </div>
      </div>

      {loading ? <div className="h-72 animate-pulse rounded-xl border border-white/10 bg-white/5" /> : null}

      {!loading && loadError ? (
        <div className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{loadError}</div>
      ) : null}

      {!loading && !loadError ? (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-12 gap-2 border-b border-white/10 bg-white/5 px-4 py-3 text-xs text-text-secondary">
            <div className="col-span-2">ID</div>
            <div className="col-span-3">Email</div>
            <div className="col-span-2">Fecha</div>
            <div className="col-span-3">Estado</div>
            <div className="col-span-2 text-right">Acción</div>
          </div>
          <div>
            {filtered.length === 0 ? (
              <div className="p-4 text-sm text-text-secondary">Sin resultados.</div>
            ) : (
              filtered.map((q) => (
                <div key={q.id} className="grid grid-cols-12 items-center gap-2 border-b border-white/5 px-4 py-3">
                  <div className="col-span-2 text-sm text-text-primary">{q.id.slice(0, 8)}</div>
                  <div className="col-span-3 text-sm text-text-secondary">{q.contact_email}</div>
                  <div className="col-span-2 text-sm text-text-secondary">{formatDateShort(q.created_at)}</div>
                  <div className="col-span-3">
                    <Badge tone={getStatusTone(q.status)}>{q.status}</Badge>
                    {q.quoted_price != null ? (
                      <div className="mt-1 text-xs text-text-secondary">{formatMoneyARS(q.quoted_price)}</div>
                    ) : null}
                  </div>
                  <div className="col-span-2 text-right">
                    <Button size="sm" variant="secondary" onClick={() => setOpenId(q.id)}>
                      Abrir
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      ) : null}

      <Modal open={!!openId} title="Detalle de cotización" onClose={() => setOpenId(null)}>
        {detail ? (
          <div className="grid gap-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="overflow-hidden">
                {detailImg ? <img src={detailImg} alt="Referencia" className="w-full object-cover" /> : <div className="aspect-[4/3] bg-white/5" />}
              </Card>
              <Card className="p-4">
                <div className="text-sm font-semibold text-text-primary">{detail.contact_email}</div>
                <div className="mt-1 text-sm text-text-secondary">ID {detail.id}</div>
                <div className="mt-3">
                  <div className="mb-2 text-xs text-text-secondary">Precio (ARS)</div>
                  <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Ej: 45000" />
                </div>
                <div className="mt-3">
                  <div className="mb-2 text-xs text-text-secondary">Estado</div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-text-secondary">
                    Desde esta pantalla solo se puede marcar como <span className="text-text-primary">{QUOTE_STATUS_ALLOWED}</span>.
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge tone={getStatusTone(detail.status)}>{detail.status}</Badge>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy || detail.status === QUOTE_STATUS_ALLOWED}
                      onClick={() => setStatus(QUOTE_STATUS_ALLOWED)}
                    >
                      Marcar como {QUOTE_STATUS_ALLOWED}
                    </Button>
                  </div>
                </div>

                {detail.customer_decision === 'accepted' ? (
                  <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="text-xs text-text-secondary">Pago por transferencia</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge tone={detail.payment_status === 'paid' ? 'green' : 'purple'}>
                        {detail.payment_status === 'paid' ? 'Pagado' : 'Pendiente'}
                      </Badge>
                      {receiptUrl ? (
                        <a className="text-sm text-neon-green" href={receiptUrl} target="_blank" rel="noreferrer">
                          Ver comprobante
                        </a>
                      ) : (
                        <span className="text-sm text-text-secondary">Sin comprobante</span>
                      )}
                    </div>
                    <div className="mt-3">
                      <Button size="sm" onClick={() => void markPaid()} disabled={busy || detail.payment_status === 'paid'}>
                        {detail.payment_status === 'paid' ? 'Pago ya verificado' : 'Marcar como pagado'}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </Card>
            </div>
            <Card className="p-4">
              <div className="text-sm font-semibold text-text-primary">Requisitos</div>
              <pre className="mt-3 overflow-auto rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-text-secondary">
                {safePrettyJson(detail.specs_json)}
              </pre>
            </Card>
            <Card className="p-4">
              <div className="text-sm font-semibold text-text-primary">Mensaje al cliente</div>
              <div className="mt-2 text-sm text-text-secondary">Esto crea una notificación in-app.</div>
              <div className="mt-3">
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej: Te paso el presupuesto. Si querés ajustar medidas avisame." />
              </div>
            </Card>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Link to={`/mis-pedidos/${detail.id}`} className="text-sm">
                Abrir como cliente
              </Link>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="secondary" onClick={() => void createOrder()} disabled={busy || hasOrder}>
                  {hasOrder ? 'Pedido ya creado' : 'Crear pedido'}
                </Button>
                <Button onClick={() => void save()} disabled={busy}>
                  Guardar y notificar
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

function safePrettyJson(specs: string) {
  try {
    return JSON.stringify(JSON.parse(specs), null, 2)
  } catch {
    return specs
  }
}
