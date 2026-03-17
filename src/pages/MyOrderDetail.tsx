import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import type { PaymentSettings, QuoteRequest } from '@/types'
import { formatDateShort, formatMoneyARS } from '@/lib/format'
import { getStatusTone } from '@/lib/status'
import { getSignedStorageUrl } from '@/lib/storage'
import { Spinner } from '@/components/ui/Spinner'
import { useAuthStore } from '@/stores/authStore'

export default function MyOrderDetail() {
  const { id } = useParams()
  const user = useAuthStore((s) => s.user)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState<QuoteRequest | null>(null)
  const [imgUrl, setImgUrl] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pay, setPay] = useState<PaymentSettings | null>(null)
  const [receiptUrl, setReceiptUrl] = useState<string>('')
  const [transferRef, setTransferRef] = useState<string>('')

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

      if (qr.payment_receipt_url) {
        try {
          const signed = await getSignedStorageUrl('receipts', qr.payment_receipt_url)
          setReceiptUrl(signed)
        } catch {
          setReceiptUrl('')
        }
      } else {
        setReceiptUrl('')
      }

      try {
        const signed = await getSignedStorageUrl('references', qr.reference_image_url)
        setImgUrl(signed)
      } catch {
        setImgUrl('')
      }

      const { data: ps } = await supabase.from('payment_settings').select('*').eq('id', 'default').maybeSingle()
      setPay((ps as PaymentSettings) ?? null)

      setLoading(false)
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

  const submitReceipt = async (file: File) => {
    if (!q || !user) return
    setActionError(null)
    setBusy(true)
    try {
      const ext = getExt(file.name)
      const path = `${user.id}/${q.id}/${crypto.randomUUID()}.${ext}`
      const { error: upErr } = await supabase.storage.from('receipts').upload(path, file, {
        upsert: false,
        contentType: file.type,
      })
      if (upErr) throw upErr
      const { error } = await supabase.rpc('customer_submit_transfer_receipt', {
        p_quote_request_id: q.id,
        p_receipt_url: path,
        p_reference: transferRef,
      })
      if (error) throw error
      await load()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'No se pudo enviar el comprobante')
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

  const depositAmount = q.quoted_price != null ? q.quoted_price / 2 : null
  const remainingAmount = q.quoted_price != null ? q.quoted_price - q.quoted_price / 2 : null

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

                    {receiptUrl ? (
                      <a className="text-sm text-neon-green" href={receiptUrl} target="_blank" rel="noreferrer">
                        Ver comprobante enviado
                      </a>
                    ) : null}

                    <div className="grid gap-2">
                      <div className="text-xs text-text-secondary">Referencia (opcional)</div>
                      <input
                        className="h-10 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-text-primary"
                        value={transferRef}
                        onChange={(e) => setTransferRef(e.target.value)}
                        placeholder="Ej: Nro de operación / últimos 4"
                        disabled={busy}
                      />
                      <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary hover:bg-white/10">
                        {busy ? 'Subiendo…' : 'Subir comprobante'}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,application/pdf"
                          className="hidden"
                          disabled={busy}
                          onChange={(e) => {
                            const f = e.target.files?.[0]
                            if (f) void submitReceipt(f)
                            e.currentTarget.value = ''
                          }}
                        />
                      </label>
                      <div className="text-xs text-text-secondary">Podés subir JPG/PNG o PDF.</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-sm font-semibold text-text-primary">Decisión del presupuesto</div>
                  <div className="mt-1 text-sm text-text-secondary">Aceptá para pagar y comenzar la producción, o rechazá si querés cambiar algo.</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button onClick={() => void acceptQuote()} disabled={busy}>
                      {busy ? 'Aceptando…' : 'Aceptar'}
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

function getExt(name: string) {
  const parts = name.split('.')
  const ext = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'jpg'
  if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'pdf') return ext === 'jpeg' ? 'jpg' : ext
  return 'jpg'
}
