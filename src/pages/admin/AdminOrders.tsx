import { useCallback, useEffect, useRef, useState } from 'react'
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
import { sendEmailNotification } from '@/lib/emailNotification'
import { useAuthStore } from '@/stores/authStore'

const ORDER_STATUSES = ['Creado', 'En producción', 'Listo', 'Enviado', 'Finalizado', 'Cancelado']
const supabaseUrl = getEnv('VITE_SUPABASE_URL')
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY')
type AdminOrder = Order & {
  quote_requests: (Order['quote_requests'] & {
    customer_decision?: string | null
    payment_status?: string | null
  }) | null
}

export default function AdminOrders() {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [items, setItems] = useState<AdminOrder[]>([])
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [detail, setDetail] = useState<Order | null>(null)
  const [status, setStatus] = useState('Creado')
  const [amount, setAmount] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [opError, setOpError] = useState<string | null>(null)
  const [quoteAccepted, setQuoteAccepted] = useState<boolean>(false)
  const [sendEmailOnUpdate, setSendEmailOnUpdate] = useState(true)
  const [orderImg, setOrderImg] = useState<string>('')
  const prevOpenIdRef = useRef<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const accessToken = useAuthStore.getState().session?.access_token
      if (!accessToken) throw new Error('No access token')
      const params = new URLSearchParams({
        select: '*,quote_requests(contact_email,contact_phone,customer_decision,payment_status)',
        order: 'created_at.desc',
        limit: '200',
      })
      const response = await withTimeout(
        fetch(`${supabaseUrl}/rest/v1/orders?${params.toString()}`, {
          cache: 'no-store',
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${accessToken}`,
          },
        }),
        12000,
        'Tiempo de espera agotado al cargar pedidos'
      )
      if (!response.ok) throw new Error(`orders: ${response.status}`)
      const data = (await response.json()) as AdminOrder[]
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
    if (!openId) { prevOpenIdRef.current = null; setDetail(null); setQuoteAccepted(false); setBusy(false); return }
    const found = items.find((x) => x.id === openId) ?? null
    if (prevOpenIdRef.current !== openId) {
      setOpError(null)
      setSendEmailOnUpdate(true)
    }
    prevOpenIdRef.current = openId
    setDetail(found)
    setStatus(found?.status ?? 'Creado')
    setAmount(found?.total_amount != null ? String(found.total_amount) : '')
    const decision = found?.quote_requests?.customer_decision
    const paid = found?.quote_requests?.payment_status === 'paid'
    setQuoteAccepted(decision === 'accepted' || paid)

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
    setOpError(null)
    try {
      const numeric = amount.trim() ? Number(amount) : null
      if (numeric !== null && !Number.isFinite(numeric)) {
        setOpError('Introduce un total válido.')
        return
      }
      const nextStatus = quoteAccepted ? status : 'Creado'
      const title = `Pedido ${detail.id.slice(0, 8)}: ${nextStatus}`
      const body = numeric != null ? `Total: ${formatMoneyARS(numeric)}` : `Estado actualizado: ${nextStatus}`
      const linkUrl = detail.quote_request_id ? `/mis-pedidos/${detail.quote_request_id}` : '/mis-pedidos'
      const accessToken = useAuthStore.getState().session?.access_token
      if (!accessToken) throw new Error('Sesión expirada. Ingresá nuevamente.')

      const updateResponse = await withTimeout(
        fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${detail.id}`, {
          method: 'PATCH',
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({ status: nextStatus, total_amount: numeric }),
        }),
        10000,
        'Tiempo de espera agotado al actualizar el pedido'
      )
      if (!updateResponse.ok) throw new Error(`No se pudo actualizar el pedido (${updateResponse.status}).`)
      setItems((prev) =>
        prev.map((item) =>
          item.id === detail.id
            ? { ...item, status: nextStatus, total_amount: numeric }
            : item
        )
      )
      setDetail((prev) =>
        prev && prev.id === detail.id
          ? { ...prev, status: nextStatus, total_amount: numeric }
          : prev
      )
      setOpenId(null)
      void (async () => {
        try {
          const postSaveTasks: Array<Promise<void>> = []
          if (nextStatus === 'Finalizado' && detail.quote_request_id) {
            postSaveTasks.push((async () => {
              const { data: qr } = await withTimeout(
                supabase.from('quote_requests').select('reference_image_url, preview_image_url').eq('id', detail.quote_request_id).maybeSingle(),
                10000,
                'Tiempo de espera agotado al limpiar archivos del pedido'
              )
              const cleanupReferencePath = qr?.reference_image_url ?? null
              const cleanupPreviewPath = qr?.preview_image_url ?? null
              if (cleanupReferencePath) {
                const { error } = await supabase.storage.from('references').remove([cleanupReferencePath])
                if (error) throw error
              }
              if (cleanupPreviewPath) {
                const { error } = await supabase.storage.from('previews').remove([cleanupPreviewPath])
                if (error) throw error
              }
            })())
          }
          if (detail.user_id) {
            postSaveTasks.push((async () => {
              const notifyResponse = await withTimeout(
                fetch(`${supabaseUrl}/rest/v1/notifications`, {
                  method: 'POST',
                  headers: {
                    apikey: supabaseAnonKey,
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    Prefer: 'return=minimal',
                  },
                  body: JSON.stringify({
                    user_id: detail.user_id,
                    title,
                    body,
                    link_url: linkUrl,
                  }),
                }),
                10000,
                'Tiempo de espera agotado al crear la notificación'
              )
              if (!notifyResponse.ok) throw new Error(`No se pudo notificar (${notifyResponse.status}).`)
            })())
          }
          let recipientEmail = detail.quote_requests?.contact_email?.trim() ?? ''
          if (!recipientEmail && detail.quote_request_id) {
            const { data: qrEmail } = await withTimeout(
              supabase.from('quote_requests').select('contact_email').eq('id', detail.quote_request_id).maybeSingle(),
              10000,
              'Tiempo de espera agotado al buscar email del pedido'
            )
            recipientEmail = qrEmail?.contact_email?.trim() ?? ''
          }
          if (sendEmailOnUpdate) {
            if (detail.user_id || recipientEmail) {
              postSaveTasks.push((async () => {
                console.info('admin-orders email attempt', {
                  orderId: detail.id,
                  hasUserId: Boolean(detail.user_id),
                  hasRecipientEmail: Boolean(recipientEmail),
                })
                const emailResult = await sendEmailNotification({
                  userId: detail.user_id ?? undefined,
                  recipientEmail: recipientEmail || undefined,
                  title,
                  body,
                  linkUrl,
                })
                console.info('admin-orders email result', emailResult)
                if (!emailResult.ok) throw new Error(emailResult.detail ?? 'No se pudo enviar el email.')
              })())
            } else {
              console.warn('admin-orders email skipped missing recipient', {
                orderId: detail.id,
                quoteRequestId: detail.quote_request_id,
              })
              setOpError('Pedido guardado, pero no se envió email porque falta usuario y email de contacto.')
            }
          }
          const results = await Promise.allSettled(postSaveTasks)
          const rejected = results.find((result) => result.status === 'rejected')
          if (rejected && rejected.status === 'rejected') {
            const reason = rejected.reason instanceof Error ? rejected.reason.message : 'Error desconocido'
            setOpError(`Pedido guardado, pero hubo fallas al notificar: ${reason}`)
          }
        } catch (error) {
          const reason = error instanceof Error ? error.message : 'Error desconocido'
          setOpError(`Pedido guardado, pero hubo fallas al notificar: ${reason}`)
        }
      })()
      void load()
    } catch (e) {
      setOpError(e instanceof Error ? e.message : 'No se pudo guardar el pedido.')
    } finally {
      setBusy(false)
    }
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
      {!loading && !loadError && opError ? <div className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{opError}</div> : null}

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
            {opError ? (
              <div className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{opError}</div>
            ) : null}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={sendEmailOnUpdate}
                  onChange={(e) => setSendEmailOnUpdate(e.target.checked)}
                  disabled={busy}
                />
                Enviar email al actualizar
              </label>
              <Button onClick={() => void save()} disabled={busy}>
                {sendEmailOnUpdate ? 'Guardar y notificar' : 'Guardar sin email'}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
