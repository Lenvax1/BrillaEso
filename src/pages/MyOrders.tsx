import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { formatDateShort, formatMoneyARS } from '@/lib/format'
import { getStatusTone } from '@/lib/status'
import type { Notification, Order, QuoteRequest } from '@/types'
import { useAuthStore } from '@/stores/authStore'

type Tab = 'pedidos' | 'notificaciones'

export default function MyOrders() {
  const auth = useAuthStore()
  const user = auth.user!
  const [tab, setTab] = useState<Tab>('pedidos')
  const [loading, setLoading] = useState(true)
  const [quotes, setQuotes] = useState<QuoteRequest[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])

  const load = useMemo(() => {
    return async () => {
      setLoading(true)
      const [{ data: q }, { data: o }, { data: n }] = await Promise.all([
        supabase.from('quote_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      ])
      setQuotes((q as QuoteRequest[]) ?? [])
      setOrders((o as Order[]) ?? [])
      setNotifications((n as Notification[]) ?? [])
      setLoading(false)
    }
  }, [user.id])

  useEffect(() => {
    void load()
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
        <Link to="/personalizar">
          <Button size="sm">Nueva cotización</Button>
        </Link>
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

      {loading ? <div className="h-64 animate-pulse rounded-xl border border-white/10 bg-white/5" /> : null}

      {!loading && tab === 'pedidos' ? (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-12 gap-2 border-b border-white/10 bg-white/5 px-4 py-3 text-xs text-text-secondary">
            <div className="col-span-3">ID</div>
            <div className="col-span-3">Fecha</div>
            <div className="col-span-3">Estado</div>
            <div className="col-span-3 text-right">Acción</div>
          </div>
          <div>
            {quotes.length === 0 ? (
              <div className="p-4 text-sm text-text-secondary">Todavía no tenés solicitudes.</div>
            ) : (
              quotes.map((q) => (
                <div key={q.id} className="grid grid-cols-12 items-center gap-2 border-b border-white/5 px-4 py-3">
                  <div className="col-span-3 text-sm text-text-primary">{q.id.slice(0, 8)}</div>
                  <div className="col-span-3 text-sm text-text-secondary">{formatDateShort(q.created_at)}</div>
                  <div className="col-span-3">
                    <Badge tone={getStatusTone(q.status)}>{q.status}</Badge>
                    {q.payment_status === 'paid' ? <div className="mt-1 text-xs text-text-secondary">Pagado</div> : null}
                    {q.customer_decision === 'accepted' && q.payment_status !== 'paid' ? (
                      <div className="mt-1 text-xs text-text-secondary">Pago pendiente</div>
                    ) : null}
                    {q.quoted_price != null ? (
                      <div className="mt-1 text-xs text-text-secondary">{formatMoneyARS(q.quoted_price)}</div>
                    ) : null}
                  </div>
                  <div className="col-span-3 text-right">
                    <Link to={`/mis-pedidos/${q.id}`} className="text-sm">
                      Ver detalle
                    </Link>
                  </div>
                </div>
              ))
            )}

            {orders.length ? (
              <div className="border-t border-white/10 bg-white/5 px-4 py-3 text-xs text-text-secondary">Pedidos</div>
            ) : null}
            {orders.map((o) => (
              <div key={o.id} className="grid grid-cols-12 items-center gap-2 border-b border-white/5 px-4 py-3">
                <div className="col-span-3 text-sm text-text-primary">{o.id.slice(0, 8)}</div>
                <div className="col-span-3 text-sm text-text-secondary">{formatDateShort(o.created_at)}</div>
                <div className="col-span-3">
                  <Badge tone={getStatusTone(o.status)}>{o.status}</Badge>
                  {o.total_amount != null ? (
                    <div className="mt-1 text-xs text-text-secondary">{formatMoneyARS(o.total_amount)}</div>
                  ) : null}
                </div>
                <div className="col-span-3 text-right">
                  <div className="text-xs text-text-secondary">Desde cotización</div>
                </div>
              </div>
            ))}
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
