import { NavLink, Outlet } from 'react-router-dom'
import { LayoutGrid, Image, ClipboardList, Package } from 'lucide-react'
import { cn } from '@/lib/utils'

function Item({ to, icon, children }: { to: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-secondary hover:bg-white/5 hover:text-text-primary',
          isActive && 'bg-white/5 text-text-primary'
        )
      }
      end={to === '/admin'}
    >
      <span className="text-neon-purple">{icon}</span>
      {children}
    </NavLink>
  )
}

export default function AdminShell() {
  return (
    <div className="min-h-screen bg-bg">
      <div className="container py-8">
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="rounded-2xl border border-white/10 bg-surface p-3">
            <div className="px-3 pb-2 pt-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Panel admin
            </div>
            <div className="grid gap-1">
              <Item to="/admin" icon={<LayoutGrid className="h-4 w-4" />}>
                Inicio
              </Item>
              <Item to="/admin/cotizaciones" icon={<ClipboardList className="h-4 w-4" />}>
                Cotizaciones
              </Item>
              <Item to="/admin/pedidos" icon={<Package className="h-4 w-4" />}>
                Pedidos
              </Item>
              <Item to="/admin/galeria" icon={<Image className="h-4 w-4" />}>
                Galería
              </Item>
            </div>
          </aside>
          <main className="min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}

