import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Bell, LogOut, Shield } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { getEnv } from '@/lib/env'
import { withTimeout } from '@/lib/timeout'
import { useAuthStore } from '@/stores/authStore'
import type { Notification } from '@/types'
import { formatDateShort } from '@/lib/format'

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'rounded-lg px-3 py-2 text-sm text-text-secondary hover:bg-white/5 hover:text-text-primary',
          isActive && 'bg-white/5 text-text-primary'
        )
      }
    >
      {children}
    </NavLink>
  )
}

export function Navbar() {
  const supabaseUrl = getEnv('VITE_SUPABASE_URL')
  const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY')
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const auth = useAuthStore()
  const user = auth.user
  const profile = auth.profile
  const [unread, setUnread] = useState<number>(0)
  const [openNotifications, setOpenNotifications] = useState(false)
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const notifRef = useRef<HTMLDivElement | null>(null)
  const userId = user?.id

  const isAdmin = !!profile?.is_admin
  const showShellLinks = !pathname.startsWith('/admin')

  const loadUnread = useCallback(async () => {
    if (!userId) { setUnread(0); return }
    const accessToken = useAuthStore.getState().session?.access_token
    if (!accessToken) { setUnread(0); return }
    try {
      const params = new URLSearchParams({
        select: 'id',
        user_id: `eq.${userId}`,
        read_at: 'is.null',
      })
      const response = await withTimeout(
        fetch(`${supabaseUrl}/rest/v1/notifications?${params.toString()}`, {
          method: 'GET',
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${accessToken}`,
            Prefer: 'count=exact',
          },
        }),
        7000,
        'Tiempo de espera agotado al contar notificaciones'
      )
      if (!response.ok) return
      const total = Number(response.headers.get('content-range')?.split('/')[1] ?? '0')
      setUnread(Number.isFinite(total) ? total : 0)
    } catch {
      setUnread(0)
    }
  }, [supabaseAnonKey, supabaseUrl, userId])

  useEffect(() => {
    void loadUnread()
  }, [loadUnread])

  const loadNotifications = useCallback(async () => {
    if (!userId) { setNotifications([]); return }
    const accessToken = useAuthStore.getState().session?.access_token
    if (!accessToken) { setNotifications([]); setUnread(0); return }
    setNotificationsLoading(true)
    try {
      const params = new URLSearchParams({
        select: '*',
        user_id: `eq.${userId}`,
        order: 'created_at.desc',
        limit: '10',
      })
      const response = await withTimeout(
        fetch(`${supabaseUrl}/rest/v1/notifications?${params.toString()}`, {
          method: 'GET',
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${accessToken}`,
          },
        }),
        7000,
        'Tiempo de espera agotado al cargar notificaciones'
      )
      if (!response.ok) return
      const list = ((await response.json()) as Notification[]) ?? []
      setNotifications(list)
      setUnread(list.filter((x) => !x.read_at).length)
    } finally {
      setNotificationsLoading(false)
    }
  }, [supabaseAnonKey, supabaseUrl, userId])

  useEffect(() => {
    if (!userId) {
      setOpenNotifications(false)
      setNotifications([])
      return
    }
    if (openNotifications) void loadNotifications()
  }, [openNotifications, loadNotifications, userId])

  useEffect(() => {
    if (!openNotifications) return
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node | null
      if (!target || !notifRef.current) return
      if (!notifRef.current.contains(target)) setOpenNotifications(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenNotifications(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [openNotifications])

  const markRead = async (id: string) => {
    if (!userId) return
    const now = new Date().toISOString()
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: now } : n)))
    setUnread((prev) => (prev > 0 ? prev - 1 : 0))
    await supabase.from('notifications').update({ read_at: now }).eq('id', id)
  }

  const onSignOut = () => {
    navigate('/login', { replace: true })
    void auth.signOut()
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-bg/80 backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-3">
        <Link to="/" className="shrink-0">
          <Logo />
        </Link>
        {showShellLinks ? (
          <nav className="hidden items-center gap-1 md:flex">
            <NavItem to="/">Galería</NavItem>
            <NavItem to="/personalizar">Personalizar</NavItem>
            <NavItem to="/mis-pedidos">Mis pedidos</NavItem>
          </nav>
        ) : null}

        <div className="flex items-center gap-2">
          {user ? (
            <div ref={notifRef} className="relative">
              <button
                type="button"
                className="relative rounded-lg p-2 text-text-secondary hover:bg-white/5"
                aria-label="Notificaciones"
                aria-expanded={openNotifications}
                onClick={() => setOpenNotifications((v) => !v)}
              >
                <Bell className="h-5 w-5" />
                {unread > 0 ? (
                  <span className="absolute right-1 top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-neon-purple px-1 text-[11px] font-semibold text-bg">
                    {unread > 99 ? '99+' : unread}
                  </span>
                ) : null}
              </button>
              {openNotifications ? (
                <div className="absolute right-0 mt-2 w-[calc(100vw-1rem)] max-w-[22rem] overflow-hidden rounded-xl border border-white/10 bg-bg/95 shadow-xl backdrop-blur sm:w-[22rem]">
                  <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-3 py-2">
                    <div className="text-sm font-semibold text-text-primary">Notificaciones</div>
                    <Link to="/mis-pedidos" className="text-xs" onClick={() => setOpenNotifications(false)}>
                      Ver todas
                    </Link>
                  </div>
                  <div className="max-h-[60vh] overflow-auto">
                    {notificationsLoading ? (
                      <div className="p-3 text-sm text-text-secondary">Cargando…</div>
                    ) : notifications.length === 0 ? (
                      <div className="p-3 text-sm text-text-secondary">No tenés notificaciones.</div>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          className={
                            'w-full px-3 py-3 text-left hover:bg-white/5 ' +
                            (n.read_at ? 'bg-transparent' : 'bg-neon-purple/10')
                          }
                          onClick={() => {
                            if (!n.read_at) void markRead(n.id)
                            if (n.link_url) navigate(n.link_url)
                            setOpenNotifications(false)
                          }}
                        >
                          <div className="text-sm font-semibold text-text-primary">{n.title}</div>
                          <div className="mt-1 text-sm text-text-secondary">{n.body}</div>
                          <div className="mt-2 text-xs text-text-secondary">{formatDateShort(n.created_at)}</div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
          {isAdmin ? (
            <Link
              to="/admin"
              className="hidden items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary hover:bg-white/10 md:flex"
            >
              <Shield className="h-4 w-4" />
              Admin
            </Link>
          ) : null}
          {user ? (
            <Button variant="secondary" size="sm" onClick={onSignOut} disabled={auth.loading}>
              <LogOut className="h-4 w-4" />
              {auth.loading ? 'Saliendo…' : 'Salir'}
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="secondary" size="sm">Entrar</Button>
              </Link>
              <Link to="/registro" className="hidden sm:block">
                <Button size="sm">Crear cuenta</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
