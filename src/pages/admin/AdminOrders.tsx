import { useCallback, useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { supabase } from '@/lib/supabase'
import { withTimeout } from '@/lib/timeout'
import { getEnv } from '@/lib/env'
import type { Order } from '@/types'
import { formatDateShort, formatMoneyARS } from '@/lib/format'
import { getStatusTone } from '@/lib/status'
import { getSignedStorageUrl } from '@/lib/storage'
import { useAuthStore } from '@/stores/authStore'

const ORDER_STATUSES = ['Creado', 'En producción', 'Listo', 'Enviado', 'Finalizado', 'Cancelado']
const supabaseUrl = getEnv('VITE_SUPABASE_URL')
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY')

export default function AdminOrders() {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [items, setItems] = useState<Order[]>([])
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [detail, setDetail] = useState<Order | null>(null)
  const [status, setStatus] = useState('Creado')
  const [amount, setAmount] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [quoteAccepted, setQuoteAccepted] = useState<boolean>(false)
  const [orderImg, setOrderImg] = useState<string>('')

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const accessToken = useAuthStore.getState().session?.access_token
      if (!accessToken) throw new Error('No access token')
      const params = new URLSearchParams({
        select: '*,quote_requests(contact_email,contact_phone)',
        order: 'created_at.desc',
        limit: '200',
      })
      const response = await withTimeout(
        fetch(`${supabaseUrl}/rest/v1/orders?${params.toString()}`, {
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${accessToken}`,
          },
        }),
        12000,
        'Tiempo de espera agotado al cargar pedidos'
      )
      if (!response.ok) throw new Error(`orders: ${response.status}`)
      const data = (await response.json()) as Order[]
      setItems(data ?? [])
    } catch {
      setLoadError('No se pudo cargar. Intentá con Actualizar.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!openId) { setDetail(null); setQuoteAccepted(false); return }
    const found = items.find((x) => x.id === openId) ?? null
    setDetail(found)
    setStatus(found?.status ?? 'Creado')
    setAmount(found?.total_amount != null ? String(found.total_amount) : '')

    if (found?.quote_request_id) {
      void supabase.from('quote_requests').select('customer_decision,payment_status').eq('id', found.quote_request_id).maybeSingle().then(({ data }) => {
        const decision = (data as { customer_decision?: string | null } | null)?.customer_decision
        const paid = (data as { payment_status?: string | null } | null)?.payment_status === 'paid'
        setQuoteAccepted(decision === 'accepted' || paid)
      })
    }

    if (found?.image_url) {
      void getSignedStorageUrl('previews', found.image_url).then(setOrderImg).catch(() => setOrderImg(''))
    } else {
      setOrderImg('')
    }
  }, [openId, items])

  const filtered = items.filter((x) => {
    if (!query) return true
    const q = query.toLowerCase()
    return x.id.toLowerCase().includes(q) || (x.quote_request_id ?? '').toLowerCase().includes(q)
  })

  const save = async () => {
    if (!detail) return
    setBusy(true)
    const numeric = amount.trim() ? Number(amount) : null
    const nextStatus = quoteAccepted ? status : 'Creado'

    if (nextStatus === 'Finalizado' && detail.quote_request_id) {
      const { data: qr } = await supabase.from('quote_requests').select('reference_image_url, preview_image_url').eq('id', detail.quote_request_id).maybeSingle()
      if (qr?.reference_image_url) await supabase.storage.from('references').remove([qr.reference_image_url]).catch(() => null)
      if (qr?.preview_image_url) await supabase.storage.from('previews').remove([qr.preview_image_url]).catch(() => null)
    }

    await supabase.from('orders').update({ status: nextStatus, total_amount: numeric }).eq('id', detail.id)
    if (detail.user_id) {
      await supabase.from('notifications').insert({
        user_id: detail.user_id,
        title: `Pedido ${detail.id.slice(0, 8)}: ${nextStatus}`,
        body: numeric != null ? `Total: ${formatMoneyARS(numeric)}` : `Estado actualizado: ${nextStatus}`,
        link_url: detail.quote_request_id ? `/mis-pedidos/${detail.quote_request_id}` : '/mis-pedidos',
      })
    }
    await load()
    setBusy(false)
    setOpenId(null)
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-lg font-semibold text-text-primary">Pedidos</div>
          <div className="mt-1 text-sm text-text-secondary">Estados operativos y notificaciones.</div>
        </div>
        <div className="flex items-end gap-3">
          <Button size="sm" variant="secondary" onClick={() => void load()} disabled={loading}>Actualizar</Button>
          <div className="w-full max-w-sm">
            <div className="mb-2 text-xs text-text-secondary">Buscar por ID / quote</div>
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="8f3a1c2b" />
          </div>
        </div>
      </div>

      {loading && items.length === 0 ? <div className="h-72 animate-pulse rounded-xl border border-white/10 bg-white/5" /> : null}
      {loading && items.length > 0 ? <div className="text-xs text-text-secondary">Actualizando pedidos…</div> : null}
      {!loading && loadError ? <div className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{loadError}</div> : null}

      {!loadError && (!loading || items.length > 0) ? (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-12 gap-2 border-b border-white/10 bg-white/5 px-4 py-3 text-xs text-text-secondary">
            <div className="col-span-2">ID</div>
            <div className="col-span-3">Quote</div>
            <div className="col-span-2">Fecha</div>
            <div className="col-span-3">Estado</div>
            <div className="col-span-2 text-right">Acción</div>
          </div>
          <div>
            {filtered.length === 0 ? (
              <div className="p-4 text-sm text-text-secondary">Sin pedidos.</div>
            ) : (
              filtered.map((o) => (
                <div key={o.id} className="grid grid-cols-12 items-center gap-2 border-b border-white/5 px-4 py-3">
                  <div className="col-span-2 text-sm text-text-primary">{o.id.slice(0, 8)}</div>
                  <div className="col-span-3 text-sm text-text-secondary">
                    <div>{o.quote_requests?.contact_email ?? '-'}</div>
                    <div className="text-text-secondary/80">{o.quote_requests?.contact_phone}</div>
                    <div className="text-xs text-text-secondary/70">Quote: {o.quote_request_id?.slice(0, 8) ?? '-'}</div>
                  </div>
                  <div className="col-span-2 text-sm text-text-secondary">{formatDateShort(o.created_at)}</div>
                  <div className="col-span-3">
                    <Badge tone={getStatusTone(o.status)}>{o.status}</Badge>
                    {o.total_amount != null ? <div className="mt-1 text-xs text-text-secondary">{formatMoneyARS(o.total_amount)}</div> : null}
                  </div>
                  <div className="col-span-2 text-right">
                    <Button size="sm" variant="secondary" onClick={() => setOpenId(o.id)}>Editar</Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      ) : null}

      <Modal open={!!openId} title="Editar pedido" onClose={() => setOpenId(null)}>
        {detail ? (
          <div className="grid gap-4">
            <Card className="p-4">
              <div className="text-sm font-semibold text-text-primary">Editar pedido</div>
              <div className="mt-1 text-sm text-text-secondary/70">ID: {detail.id}</div>
            </Card>
            {orderImg ? <Card className="overflow-hidden"><img src={orderImg} alt="Imagen del pedido" className="w-full object-cover" /></Card> : null}
            <Card className="p-4">
              <div className="mb-2 text-xs text-text-secondary">Total (ARS)</div>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Ej: 65000" />
              <div className="mt-4 mb-2 text-xs text-text-secondary">Estado</div>
              {!quoteAccepted ? (
                <div className="mb-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-text-secondary">
                  Para cambiar estados operativos, el cliente primero debe aceptar la cotización.
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-2">
                {ORDER_STATUSES.map((s) => (
                  <button key={s} type="button"
                    className={'h-10 rounded-lg border px-3 text-sm text-left ' + (status === s ? 'border-neon-green/50 bg-neon-green/10 text-neon-green' : 'border-white/10 bg-white/5 text-text-secondary hover:bg-white/10')}
                    onClick={() => setStatus(s)} disabled={!quoteAccepted && s !== 'Creado'}>
                    {s}
                  </button>
                ))}
              </div>
            </Card>
            <div className="flex justify-end">
              <Button onClick={() => void save()} disabled={busy}>Guardar y notificar</Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
