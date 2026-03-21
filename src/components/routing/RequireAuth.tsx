import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { Spinner } from '@/components/ui/Spinner'

export function RequireAuth() {
  const auth = useAuthStore()
  const loc = useLocation()

  if (auth.loading && !auth.initDone) {
    return (
      <div className="container py-16">
        <div className="flex items-center justify-center gap-3 text-text-secondary">
          <Spinner />
          Cargando…
        </div>
      </div>
    )
  }

  if (!auth.user) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  }

  return <Outlet />
}