import { Navigate, Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { Spinner } from '@/components/ui/Spinner'

export function RequireAdmin() {
  const auth = useAuthStore()
  const init = useAuthStore((s) => s.init)

  useEffect(() => {
    void init()
  }, [init])

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

  if (!auth.user) return <Navigate to="/login" replace />
  if (!auth.profile?.is_admin) return <Navigate to="/" replace />
  return <Outlet />
}
