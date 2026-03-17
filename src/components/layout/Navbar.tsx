import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Bell, LogOut, Shield } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

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
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const auth = useAuthStore()
  const user = auth.user
  const profile = auth.profile
  const [unread, setUnread] = useState<number>(0)

  const isAdmin = !!profile?.is_admin
  const showShellLinks = !pathname.startsWith('/admin')

  const loadUnread = useMemo(() => {
    return async () => {
      if (!user) {
        setUnread(0)
        return
      }
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('read_at', null)
      if (error) return
      setUnread(count ?? 0)
    }
  }, [user])

  useEffect(() => {
    void loadUnread()
  }, [loadUnread])

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
            <Link to="/mis-pedidos" className="relative rounded-lg p-2 text-text-secondary hover:bg-white/5">
              <Bell className="h-5 w-5" />
              {unread > 0 ? (
                <span className="absolute right-1 top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-neon-purple px-1 text-[11px] font-semibold text-bg">
                  {unread > 99 ? '99+' : unread}
                </span>
              ) : null}
            </Link>
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
                <Button variant="secondary" size="sm">
                  Entrar
                </Button>
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
