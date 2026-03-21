import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import type { Order, PaymentSettings, QuoteRequest } from '@/types'
import { formatDateShort, formatMoneyARS } from '@/lib/format'
import { getStatusTone } from '@/lib/status'
import { getSignedStorageUrl } from '@/lib/storage'
import { Spinner } from '@/components/ui/Spinner'
import { withTimeout } from '@/lib/timeout'

type ParsedSpecs = {
  measures?: { widthCm?: number; heightCm?: number }
  style?: { colors?: string; background?: string }
  text?: string
  notes?: string
  rest: Array<{ key: string; value: string }>
}

export default function MyOrderDetail() {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState<(QuoteRequest & { orders?: Order[] }) | null>(null)
  const [imgUrl, setImgUrl] = useState<string>('')
  const [previewImgUrl, setPreviewImgUrl] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pay, setPay] = useState<PaymentSettings | null>(null)
  const [transferHolder, setTransferHolder] = useState<string>('')
  const [transferLast4, setTransferLast4] = useState<string>('')

  const load = useMemo(() => {
    return async () => {
      if (!id) {
        setError('No encontrado')
        setQ(null)
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      setActionError(null)
      try {
        let qr: (QuoteRequest & { orders: Order[] }) | null = null
        for (let i = 0; i < 2; i++) {
          try {
            const { data, error } = await withTimeout(
              supabase.from('quote_requests').select('*, orders(*)').eq('id', id).maybeSingle(),
              20_000,
              'La carga está tardando demasiado. Reintentá.'
            )
            if (!error && data) {
              qr = data as (QuoteRequest & { orders: Order[] })
              break
            }
            const msg = String(error?.message ?? '').toLowerCase()
            const looksAuth = msg.includes('jwt') || msg.includes('auth')
            if (looksAuth && i === 0) {
              await withTimeout(supabase.auth.refreshSession(), 6_000, 'La sesión está tardando demasiado.').catch(() => null)
              continue
            }
            if (error && i === 1) throw error
          } catch (e) {
            if (i === 0) continue
            throw e
          }
        }
        if (!qr) throw new Error('No encontrado')
        setQ(qr)
        const transferData = parseTransferReference(qr.payment_reference ?? null)
        setTransferHolder(transferData.holder)
        setTransferLast4(transferData.last4)

        try {
          const signed = await withTimeout(
            getSignedStorageUrl('references', qr.reference_image_url),
            20_000,
            'No se pudo cargar la imagen a tiempo.'
          )
          setImgUrl(signed)
        } catch {
          setImgUrl('')
        }

        if (qr.preview_image_url) {
          try {
            const signedPreview = await withTimeout(
              getSignedStorageUrl('previews', qr.preview_image_url),
              20_000,
              'No se pudo cargar la imagen de aproximación a tiempo.'
            )
            setPreviewImgUrl(signedPreview)
          } catch {
            setPreviewImgUrl('')
          }
        } else {
          setPreviewImgUrl('')
        }

        try {
          const { data: ps } = await withTimeout(
            supabase.from('payment_settings').select('*').eq('id', 'default').maybeSingle(),
            20_000,
            'No se pudieron cargar los datos de pago a tiempo.'
          )
          setPay((ps as PaymentSettings) ?? null)
        } catch {
          setPay(null)
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'No encontrado'
        setError(msg)
        setQ(null)
        setImgUrl('')
        setTransferHolder('')
        setTransferLast4('')
        setPay(null)
      } finally {
        setLoading(false)
      }
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const acceptQuote = async () => {
    if (!q) return
    setActionError(null)
    setBusy(true)
    try {
      const { error } = await supabase.rpc('customer_accept_quote', { p_quote_request_id: q.id })
      if (error) throw error
      await load()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'No se pudo aceptar el presupuesto')
    } finally {
      setBusy(false)
    }
  }

  const rejectQuote = async () => {
    if (!q) return
    setActionError(null)
    setBusy(true)
    try {
      const { error } = await supabase.rpc('customer_reject_quote', { p_quote_request_id: q.id })
      if (error) throw error
      await load()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'No se pudo rechazar el presupuesto')
    } finally {
      setBusy(false)
    }
  }

  const submitTransferDetails = async () => {
    if (!q) return
    setActionError(null)
    const holder = transferHolder.trim()
    const last4 = transferLast4.trim()
    if (!holder) {
      setActionError('Indicá a nombre de quién hiciste la transferencia.')
      return
    }
    if (last4 && !/^\d{4}$/.test(last4)) {
      setActionError('Los últimos 4 del número de operación deben ser 4 dígitos.')
      return
    }
    setBusy(true)
    try {
      const { error } = await supabase.rpc('customer_submit_transfer_receipt', {
        p_quote_request_id: q.id,
        p_receipt_url: '',
        p_reference: JSON.stringify({ holder, last4: last4 || null }),
      })
      if (error) throw error
      await load()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'No se pudieron informar los datos de transferencia')
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

  const specs = parseSpecs(q.specs_json)

  const depositAmount = q.quoted_price != null ? q.quoted_price / 2 : null
  const remainingAmount = q.quoted_price != null ? q.quoted_price - q.quoted_price / 2 : null
  const transferSubmitted = q.payment_status === 'pending' || !!q.payment_submitted_at

  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      <div className="grid gap-4">
        {previewImgUrl ? (
          <Card className="overflow-hidden">
            <div className="border-b border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-text-primary">
              Diseño de aproximación
            </div>
            <img src={previewImgUrl} alt="Aproximación" className="w-full object-cover" />
          </Card>
        ) : null}
        <Card className="overflow-hidden">
          <div className="border-b border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-text-primary">
            Imagen de referencia original
          </div>
          {imgUrl ? (
            <img src={imgUrl} alt="Referencia" className="w-full object-cover" />
          ) : (
            <div className="aspect-[4/3] w-full bg-white/5" />
          )}
        </Card>
      </div>
      <div className="grid gap-4">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-text-primary">Solicitud {q.id.slice(0, 8)}</div>
              <div className="mt-1 text-sm text-text-secondary">Creada: {formatDateShort(q.created_at)}</div>
            </div>
            <Badge tone={getStatusTone(q.orders?.[0]?.status ?? q.status)}>{q.orders?.[0]?.status ?? q.status}</Badge>
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
                  <div className="mt-1 text-sm text-text-secondary">
                    Para iniciar la elaboración se requiere una seña del 50%.
                    {depositAmount != null && remainingAmount != null
                      ? ` Seña: ${formatMoneyARS(depositAmount)}. Saldo restante (50%) al recibir el producto: ${formatMoneyARS(remainingAmount)}.`
                      : null}
                  </div>
                  <div className="mt-3 grid gap-3">
                    <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-text-secondary">
                      <div className="text-xs">Datos de transferencia</div>
                      <div className="mt-2 grid gap-1">
                        {pay?.transfer_holder ? <div>Titular: {pay.transfer_holder}</div> : null}
                        {pay?.transfer_bank ? <div>Banco: {pay.transfer_bank}</div> : null}
                        {pay?.transfer_alias ? <div>Alias: {pay.transfer_alias}</div> : null}
                        {pay?.transfer_cbu ? <div>CBU: {pay.transfer_cbu}</div> : null}
                        {pay?.transfer_cuit ? <div>CUIT: {pay.transfer_cuit}</div> : null}
                        {depositAmount != null ? (
                          <div className="text-text-primary">Monto a transferir (50%): {formatMoneyARS(depositAmount)}</div>
                        ) : null}
                      </div>
                    </div>

                    {transferSubmitted ? (
                      <div className="rounded-xl border border-neon-green/30 bg-neon-green/10 p-4 text-sm text-neon-green">
                        ¡Datos de transferencia enviados correctamente!
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        <div className="text-xs text-text-secondary">Transferencia realizada por</div>
                        <input
                          className="h-10 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-text-primary"
                          value={transferHolder}
                          onChange={(e) => setTransferHolder(e.target.value)}
                          placeholder="Ej: Juan Pérez"
                          disabled={busy}
                        />
                        <div className="text-xs text-text-secondary">Nro. operación (últimos 4)</div>
                        <input
                          className="h-10 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-text-primary"
                          value={transferLast4}
                          onChange={(e) => setTransferLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder="Ej: 4821"
                          disabled={busy}
                        />
                        <Button size="sm" onClick={() => void submitTransferDetails()} disabled={busy}>
                          {busy ? 'Enviando…' : 'Informar transferencia'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-sm font-semibold text-text-primary">Decisión del presupuesto y diseño</div>
                  <div className="mt-1 text-sm text-text-secondary">
                    {previewImgUrl
                      ? 'Aceptá para confirmar el diseño de aproximación y el presupuesto.'
                      : 'Aceptá para pagar y comenzar la producción, o rechazá si querés cambiar algo.'}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button onClick={() => void acceptQuote()} disabled={busy}>
                      {busy ? 'Aceptando…' : 'Aceptar diseño y presupuesto'}
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
              {q.specs_json}
            </div>
          )}
        </Card>

        <Link to="/mis-pedidos">
          <Button variant="secondary">Volver</Button>
        </Link>
      </div>
    </div>
  )
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
