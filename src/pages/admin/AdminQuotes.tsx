import { useEffect, useMemo, useRef, useState } from 'react'
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
import { isAbortLikeError } from '@/lib/abort'
import { getErrorMessage } from '@/lib/error'

const QUOTE_STATUS_ALLOWED = 'Cotizado'
type ParsedSpecs = {
  measures?: { widthCm?: number; heightCm?: number }
  style?: { colors?: string; background?: string }
  text?: string
  notes?: string
  rest: Array<{ key: string; value: string }>
}

function ModalContent({ detail }: { detail: QuoteRequest | null }) {
  const [status, setStatus] = useState<string>('En revisión')
  const [price, setPrice] = useState<string>('')
  const [note, setNote] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [hasOrder, setHasOrder] = useState(false)
  const [detailImg, setDetailImg] = useState<string>('')
  const [previewImgFile, setPreviewImgFile] = useState<File | null>(null)
  const [previewImgUrl, setPreviewImgUrl] = useState<string>('')

  const specs = detail ? parseSpecs(detail.specs_json) : null
  const transferData = parseTransferReference(detail?.payment_reference ?? null)

  useEffect(() => {
    if (!detail) {
      setDetailImg('')
      setHasOrder(false)
      setPrice('')
      setStatus('En revisión')
      setNote('')
      setPreviewImgFile(null)
      setPreviewImgUrl('')
      return
    }

    setPrice(detail.quoted_price != null ? String(detail.quoted_price) : '')
    setStatus(detail.status ?? 'En revisión')
    setNote('')
    setPreviewImgFile(null)
    setPreviewImgUrl('')

    if (detail.reference_image_url) {
      void (async () => {
        try {
          const signed = await getSignedStorageUrl('references', detail.reference_image_url)
          setDetailImg(signed)
        } catch {
          setDetailImg('')
        }
      })()
    } else {
      setDetailImg('')
    }

    if (detail.preview_image_url) {
      void (async () => {
        try {
          const signed = await getSignedStorageUrl('previews', detail.preview_image_url)
          setPreviewImgUrl(signed)
        } catch {
          setPreviewImgUrl('')
        }
      })()
    }

    void (async () => {
      const { count } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('quote_request_id', detail.id)
      setHasOrder((count ?? 0) > 0)
    })()
  }, [detail])

  if (!detail) return <div className="p-4 text-sm text-text-secondary">Cargando...</div>

  const save = async () => {
    setBusy(true)
    const numeric = price.trim() ? Number(price) : null
    
    let previewUrl = detail.preview_image_url
    if (previewImgFile) {
      const fileExt = previewImgFile.name.split('.').pop()
      const newPath = `${detail.user_id}/${detail.id}.${fileExt}`
      const { error } = await supabase.storage.from('previews').upload(newPath, previewImgFile, { upsert: true })
      if (error) {
        console.error(error)
      } else {
        previewUrl = newPath
      }
    }

    const nextStatus = detail.status === QUOTE_STATUS_ALLOWED ? QUOTE_STATUS_ALLOWED : status === QUOTE_STATUS_ALLOWED ? QUOTE_STATUS_ALLOWED : detail.status
    
    await supabase.from('quote_requests').update({ quoted_price: numeric, status: nextStatus, preview_image_url: previewUrl }).eq('id', detail.id)
    
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
    
    // Forzar actualización local para UI rápida
    detail.status = nextStatus
    detail.quoted_price = numeric
    detail.preview_image_url = previewUrl
    setStatus(nextStatus)
    
    setBusy(false)
  }

  const createOrder = async () => {
    if (!detail.user_id) return
    const numeric = price.trim() ? Number(price) : null
    setBusy(true)
    await supabase.from('orders').insert({
      user_id: detail.user_id,
      quote_request_id: detail.id,
      status: 'Creado',
      total_amount: numeric,
      image_url: detail.preview_image_url || detail.reference_image_url,
    })
    await supabase.from('notifications').insert({
      user_id: detail.user_id,
      title: `Pedido creado desde ${detail.id.slice(0, 8)}`,
      body: numeric != null ? `Total: ${formatMoneyARS(numeric)}` : 'Tu pedido ya está en proceso.',
      link_url: `/mis-pedidos/${detail.id}`,
    })
    setBusy(false)
    setHasOrder(true)
  }

  const markPaid = async () => {
    setBusy(true)
    await supabase.rpc('admin_mark_transfer_paid', { p_quote_request_id: detail.id })
    await supabase.from('notifications').insert({
      user_id: detail.user_id,
      title: `Pago verificado ${detail.id.slice(0, 8)}`,
      body: 'Verificamos tu transferencia. Continuamos con la producción.',
      link_url: `/mis-pedidos/${detail.id}`,
    })
    // Forzar una actualización de la cotización actual para que la UI se refresque rápido
    detail.payment_status = 'paid'
    setBusy(false)
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden relative group">
          {detailImg ? (
            <>
              <img src={detailImg} alt="Referencia" className="w-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <a
                  href={detailImg}
                  download={`referencia-${detail.id.slice(0, 8)}.jpg`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 backdrop-blur-sm"
                >
                  Descargar Referencia
                </a>
              </div>
            </>
          ) : (
            <div className="aspect-[4/3] bg-white/5" />
          )}
        </Card>
        <Card className="p-4">
          <div className="text-sm font-semibold text-text-primary">{detail.contact_email}</div>
          <div className="mt-1 text-sm text-text-secondary">{detail.contact_phone}</div>
          <div className="mt-1 text-sm text-text-secondary">ID {detail.id}</div>
          <div className="mt-3">
            <div className="mb-2 text-xs text-text-secondary">Imagen de aproximación</div>
            {previewImgUrl ? <img src={previewImgUrl} alt="Aproximación" className="mb-2 w-full rounded-lg object-cover" /> : null}
            <Input type="file" accept="image/*" onChange={(e) => setPreviewImgFile(e.target.files?.[0] ?? null)} />
          </div>
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
                {transferData.holder ? <span className="text-sm text-text-primary">Titular: {transferData.holder}</span> : null}
                {transferData.last4 ? <span className="text-sm text-text-secondary">Op. ****{transferData.last4}</span> : null}
              </div>
              {!transferData.holder ? <div className="mt-2 text-xs text-text-secondary">El cliente aún no informó los datos de transferencia.</div> : null}
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
        {specs ? (
          <div className="mt-3 grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-text-secondary">Medidas</div>
                <div className="mt-2 text-sm text-text-primary">
                  {specs.measures?.widthCm ?? '-'} cm × {specs.measures?.heightCm ?? '-'} cm
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-text-secondary">Fondo</div>
                <div className="mt-2 text-sm text-text-primary">{prettyBackground(specs.style?.background)}</div>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs text-text-secondary">Colores / estilo</div>
              <div className="mt-2 text-sm text-text-primary">{specs.style?.colors || '-'}</div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-text-secondary">Texto</div>
                <div className="mt-2 text-sm text-text-primary">{specs.text || '-'}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-text-secondary">Notas</div>
                <div className="mt-2 text-sm text-text-primary whitespace-pre-wrap">{specs.notes || '-'}</div>
              </div>
            </div>
            {specs.rest.length ? (
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-xs text-text-secondary">Otros datos</div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {specs.rest.map((item) => (
                    <div key={item.key} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                      <div className="text-[11px] uppercase tracking-wide text-text-secondary">{item.key}</div>
                      <div className="mt-1 text-sm text-text-primary break-words">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-text-secondary">
            {safePrettyJson(detail.specs_json)}
          </div>
        )}
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
  )
}

export default function AdminQuotes() {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [items, setItems] = useState<QuoteRequest[]>([])
  const loadInFlight = useRef(false)
  const loadAbort = useRef<AbortController | null>(null)
  const loadToken = useRef(0)
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [detail, setDetail] = useState<QuoteRequest | null>(null)

  const resetLoad = () => {
    loadToken.current += 1
    loadAbort.current?.abort()
    loadAbort.current = null
    loadInFlight.current = false
    setLoading(false)
  }

  const load = useMemo(() => {
    return async () => {
      if (document.visibilityState !== 'visible') return
      if (loadInFlight.current) return
      const token = (loadToken.current += 1)
      const isStale = () => loadToken.current !== token
      loadInFlight.current = true
      setLoading(true)
      setLoadError(null)
      try {
        let attempt = 0
        while (attempt < 3) {
          const controller = new AbortController()
          loadAbort.current?.abort()
          loadAbort.current = controller

          const query = supabase
            .from('quote_requests')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200)
            .abortSignal(controller.signal)

          const { data, error } = await withTimeout(query, 20_000, 'La carga tardó demasiado. Reintentá con Actualizar.', () => controller.abort())
          if (isStale()) return
          if (!error) {
            if (isStale()) return
            setItems((data as QuoteRequest[]) ?? [])
            return
          }

          if (document.visibilityState !== 'visible') return
          if (isAbortLikeError(error)) return

          const msg = String((error as { message?: unknown } | null)?.message ?? '')
          const looksAuth = msg.toLowerCase().includes('jwt') || msg.toLowerCase().includes('auth')
          if (looksAuth && attempt === 0) {
            await withTimeout(supabase.auth.refreshSession(), 6_000, 'La sesión está tardando demasiado.').catch(() => null)
            if (isStale()) return
            attempt++
            continue
          }
          if (attempt < 2) {
            await new Promise((resolve) => window.setTimeout(resolve, 700))
            if (isStale()) return
            attempt++
            continue
          }
          throw error
        }
      } catch (e) {
        if (isStale()) return
        if (isAbortLikeError(e)) return
        setLoadError(getErrorMessage(e, 'No se pudo cargar'))
      } finally {
        if (isStale()) return
        setLoading(false)
        loadInFlight.current = false
        loadAbort.current = null
      }
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') {
        resetLoad()
        return
      }
      resetLoad()
      window.setTimeout(() => void load(), 0)
    }
    const onOnline = () => {
      if (document.visibilityState === 'visible') void load()
    }
    const onFocus = () => {
      if (document.visibilityState !== 'visible') return
      resetLoad()
      window.setTimeout(() => void load(), 0)
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)
    window.addEventListener('focus', onFocus)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('focus', onFocus)
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
          if (document.visibilityState !== 'visible') return
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
      return
    }
    const found = items.find((x) => x.id === openId) ?? null
    setDetail(found)
  }, [openId, items])

  const filtered = items.filter((x) => {
    if (!query) return true
    const q = query.toLowerCase()
    return x.id.toLowerCase().includes(q) || x.contact_email.toLowerCase().includes(q)
  })

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

      {loading && items.length === 0 ? <div className="h-72 animate-pulse rounded-xl border border-white/10 bg-white/5" /> : null}
      {loading && items.length > 0 ? <div className="text-xs text-text-secondary">Actualizando cotizaciones…</div> : null}

      {!loading && loadError ? (
        <div className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{loadError}</div>
      ) : null}

      {!loadError && (!loading || items.length > 0) ? (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-12 gap-2 border-b border-white/10 bg-white/5 px-4 py-3 text-xs text-text-secondary">
            <div className="col-span-2">ID</div>
            <div className="col-span-3">Contacto</div>
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
                  <div className="col-span-3 text-sm text-text-secondary">
                    <div>{q.contact_email}</div>
                    <div className="text-text-secondary/80">{q.contact_phone}</div>
                  </div>
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
        <ModalContent detail={detail} />
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

function prettyBackground(value?: string) {
  if (!value) return '-'
  if (value === 'dark') return 'Oscuro'
  if (value === 'light') return 'Claro'
  if (value === 'transparent') return 'Transparente'
  return value
}

function parseSpecs(specsJson: string): ParsedSpecs | null {
  try {
    const parsed = JSON.parse(specsJson) as Record<string, unknown>
    const known = new Set(['measures', 'style', 'text', 'notes'])
    const rest = Object.entries(parsed)
      .filter(([k]) => !known.has(k))
      .map(([key, value]) => ({
        key,
        value: typeof value === 'string' ? value : JSON.stringify(value),
      }))

    const measuresRaw = (parsed.measures ?? null) as Record<string, unknown> | null
    const styleRaw = (parsed.style ?? null) as Record<string, unknown> | null
    return {
      measures: {
        widthCm: typeof measuresRaw?.widthCm === 'number' ? measuresRaw.widthCm : undefined,
        heightCm: typeof measuresRaw?.heightCm === 'number' ? measuresRaw.heightCm : undefined,
      },
      style: {
        colors: typeof styleRaw?.colors === 'string' ? styleRaw.colors : undefined,
        background: typeof styleRaw?.background === 'string' ? styleRaw.background : undefined,
      },
      text: typeof parsed.text === 'string' ? parsed.text : '',
      notes: typeof parsed.notes === 'string' ? parsed.notes : '',
      rest,
    }
  } catch {
    return null
  }
}

function parseTransferReference(reference: string | null): { holder: string; last4: string } {
  if (!reference) return { holder: '', last4: '' }
  try {
    const parsed = JSON.parse(reference) as { holder?: unknown; last4?: unknown }
    return {
      holder: typeof parsed.holder === 'string' ? parsed.holder : '',
      last4: typeof parsed.last4 === 'string' ? parsed.last4 : '',
    }
  } catch {
    return { holder: reference, last4: '' }
  }
}
