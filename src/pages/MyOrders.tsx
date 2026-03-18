import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { formatDateShort, formatMoneyARS } from '@/lib/format'
import { getStatusTone } from '@/lib/status'
import { withTimeout } from '@/lib/timeout'
import type { Notification, Order, QuoteRequest } from '@/types'
import { useAuthStore } from '@/stores/authStore'

type Tab = 'pedidos' | 'notificaciones'

export default function MyOrders() {
  const auth = useAuthStore()
  const init = useAuthStore((s) => s.init)
  const user = auth.user
  const [tab, setTab] = useState<Tab>('pedidos')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [quotes, setQuotes] = useState<QuoteRequest[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])

  const unifiedRequests = useMemo(() => {
    const list = quotes.map((q) => {
      const order = orders.find((o) => o.quote_request_id === q.id)
      return {
        id: q.id,
        created_at: q.created_at,
        status: order ? order.status : q.status,
        payment_status: q.payment_status,
        customer_decision: q.customer_decision,
        price: order?.total_amount ?? q.quoted_price,
        hasOrder: !!order,
        isStandalone: false,
      }
    })

    const standaloneOrders = orders.filter((o) => !o.quote_request_id || !quotes.some((q) => q.id === o.quote_request_id))
    for (const o of standaloneOrders) {
      list.push({
        id: o.id, // Using order ID as fallback, but won't be clickable to quote detail
        created_at: o.created_at,
        status: o.status,
        payment_status: null,
        customer_decision: null,
        price: o.total_amount,
        hasOrder: true,
        isStandalone: true,
      })
    }

    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [quotes, orders])

  const load = useMemo(() => {
    return async () => {
      if (!user?.id) {
        setQuotes([])
        setOrders([])
        setNotifications([])
        setLoading(false)
        return
      }
      setLoading(true)
      setLoadError(null)
      try {
        let attempt = 0
        while (attempt < 3) {
          const [{ data: q, error: qErr }, { data: o, error: oErr }, { data: n, error: nErr }] = await withTimeout(
            Promise.all([
              supabase.from('quote_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
              supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
              supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
            ]),
            20_000,
            'La carga tardó demasiado. Reintentá con Actualizar.'
          )

          const anyError = qErr ?? oErr ?? nErr
          if (!anyError) {
            setQuotes((q as QuoteRequest[]) ?? [])
            setOrders((o as Order[]) ?? [])
            setNotifications((n as Notification[]) ?? [])
            return
          }

          const msg = String((anyError as { message?: unknown } | null)?.message ?? '')
          const looksAuth = msg.toLowerCase().includes('jwt') || msg.toLowerCase().includes('auth')
          if (looksAuth && attempt === 0) {
            await supabase.auth.refreshSession().catch(() => null)
            attempt++
            continue
          }
          if (attempt < 2) {
            await new Promise((resolve) => window.setTimeout(resolve, 700))
            attempt++
            continue
          }
          throw anyError
        }
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'No se pudo cargar')
      } finally {
        setLoading(false)
      }
    }
  }, [user?.id])

  useEffect(() => {
    void init()
  }, [init])

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

  const unread = notifications.filter((x) => !x.read_at).length

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id)
    void load()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-lg font-semibold text-text-primary">Mis pedidos y notificaciones</div>
          <div className="mt-1 text-sm text-text-secondary">Seguimiento de tus solicitudes y actualizaciones.</div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => void load()} disabled={loading}>
            Actualizar
          </Button>
          <Link to="/personalizar">
            <Button size="sm">Nueva cotización</Button>
          </Link>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          className={
            'h-10 rounded-lg border px-4 text-sm ' +
            (tab === 'pedidos'
              ? 'border-neon-green/50 bg-neon-green/10 text-neon-green'
              : 'border-white/10 bg-white/5 text-text-secondary hover:bg-white/10')
          }
          onClick={() => setTab('pedidos')}
        >
          Solicitudes/Pedidos
        </button>
        <button
          type="button"
          className={
            'h-10 rounded-lg border px-4 text-sm ' +
            (tab === 'notificaciones'
              ? 'border-neon-purple/50 bg-neon-purple/10 text-neon-purple'
              : 'border-white/10 bg-white/5 text-text-secondary hover:bg-white/10')
          }
          onClick={() => setTab('notificaciones')}
        >
          Notificaciones{unread ? ` (${unread})` : ''}
        </button>
      </div>

      {loading && quotes.length === 0 && orders.length === 0 && notifications.length === 0 ? (
        <div className="h-64 animate-pulse rounded-xl border border-white/10 bg-white/5" />
      ) : null}
      {loading && (quotes.length > 0 || orders.length > 0 || notifications.length > 0) ? (
        <div className="text-xs text-text-secondary">Actualizando…</div>
      ) : null}

      {!loading && loadError ? (
        <Card className="p-4 text-sm text-danger border border-danger/40 bg-danger/10">{loadError}</Card>
      ) : null}

      {!loading && tab === 'pedidos' ? (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-12 gap-2 border-b border-white/10 bg-white/5 px-4 py-3 text-xs text-text-secondary">
            <div className="col-span-3">ID</div>
            <div className="col-span-3">Fecha</div>
            <div className="col-span-3">Estado</div>
            <div className="col-span-3 text-right">Acción</div>
          </div>
          <div>
            {unifiedRequests.length === 0 ? (
              <div className="p-4 text-sm text-text-secondary">Todavía no tenés solicitudes.</div>
            ) : (
              unifiedRequests.map((req) => (
                <div key={req.id} className="grid grid-cols-12 items-center gap-2 border-b border-white/5 px-4 py-3">
                  <div className="col-span-3 text-sm text-text-primary">{req.id.slice(0, 8)}</div>
                  <div className="col-span-3 text-sm text-text-secondary">{formatDateShort(req.created_at)}</div>
                  <div className="col-span-3">
                    <Badge tone={getStatusTone(req.status)}>{req.status}</Badge>
                    {req.payment_status === 'paid' ? <div className="mt-1 text-xs text-text-secondary">Pagado</div> : null}
                    {req.customer_decision === 'accepted' && req.payment_status !== 'paid' ? (
                      <div className="mt-1 text-xs text-text-secondary">Pago pendiente</div>
                    ) : null}
                    {req.price != null ? (
                      <div className="mt-1 text-xs text-text-secondary">{formatMoneyARS(req.price)}</div>
                    ) : null}
                  </div>
                  <div className="col-span-3 text-right">
                    {!req.isStandalone ? (
                      <Link to={`/mis-pedidos/${req.id}`} className="text-sm">
                        Ver detalle
                      </Link>
                    ) : (
                      <div className="text-xs text-text-secondary">Pedido directo</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      ) : null}

      {!loading && tab === 'notificaciones' ? (
        <div className="grid gap-3">
          {notifications.length === 0 ? (
            <Card className="p-4 text-sm text-text-secondary">No tenés notificaciones todavía.</Card>
          ) : (
            notifications.map((n) => (
              <Card key={n.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-text-primary">{n.title}</div>
                    <div className="mt-1 text-sm text-text-secondary">{n.body}</div>
                    <div className="mt-2 text-xs text-text-secondary">{formatDateShort(n.created_at)}</div>
                    {n.link_url ? (
                      <div className="mt-2 text-sm">
                        <Link to={n.link_url}>Abrir</Link>
                      </div>
                    ) : null}
                  </div>
                  {n.read_at ? (
                    <Badge>Leída</Badge>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => void markRead(n.id)}>
                      Marcar leída
                    </Button>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}
