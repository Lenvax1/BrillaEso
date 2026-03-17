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

const STATUSES = ['En revisión', 'Cotizado', 'En producción', 'Listo', 'Enviado', 'Cancelado']

export default function AdminQuotes() {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<QuoteRequest[]>([])
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [detail, setDetail] = useState<QuoteRequest | null>(null)
  const [detailImg, setDetailImg] = useState<string>('')
  const [price, setPrice] = useState<string>('')
  const [status, setStatus] = useState<string>('En revisión')
  const [note, setNote] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [hasOrder, setHasOrder] = useState(false)

  const load = useMemo(() => {
    return async () => {
      setLoading(true)
      const { data } = await supabase.from('quote_requests').select('*').order('created_at', { ascending: false }).limit(200)
      setItems((data as QuoteRequest[]) ?? [])
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!openId) {
      setDetail(null)
      setDetailImg('')
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
    await supabase
      .from('quote_requests')
      .update({ quoted_price: numeric, status })
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

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-lg font-semibold text-text-primary">Cotizaciones</div>
          <div className="mt-1 text-sm text-text-secondary">Bandeja de solicitudes y presupuestos.</div>
        </div>
        <div className="w-full max-w-sm">
          <div className="mb-2 text-xs text-text-secondary">Buscar por email/ID</div>
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="cliente@email.com" />
        </div>
      </div>

      {loading ? <div className="h-72 animate-pulse rounded-xl border border-white/10 bg-white/5" /> : null}

      {!loading ? (
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
                  <div className="grid grid-cols-2 gap-2">
                    {STATUSES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={
                          'h-10 rounded-lg border px-3 text-sm text-left ' +
                          (status === s
                            ? 'border-neon-green/50 bg-neon-green/10 text-neon-green'
                            : 'border-white/10 bg-white/5 text-text-secondary hover:bg-white/10')
                        }
                        onClick={() => setStatus(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
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
