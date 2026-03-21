import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/authStore'
import { getErrorMessage } from '@/lib/error'

import { GoogleIcon } from '@/components/ui/GoogleIcon'

export default function Login() {
  const auth = useAuthStore()
  const init = useAuthStore((s) => s.init)
  const nav = useNavigate()
  const loc = useLocation() as { state?: { from?: string } }
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void init()
  }, [init])

  useEffect(() => {
    if (auth.user) nav(loc.state?.from ?? '/mis-pedidos', { replace: true })
  }, [auth.user, nav, loc.state?.from])

  const onSubmit = async () => {
    setError(null)
    try {
      await auth.signIn({ email, password })
      nav(loc.state?.from ?? '/mis-pedidos', { replace: true })
    } catch (e) {
      setError(getErrorMessage(e, 'Error al iniciar sesión'))
    }
  }

  const onGoogleSignIn = async () => {
    setError(null)
    try {
      await auth.signInWithGoogle(loc.state?.from ?? '/mis-pedidos')
    } catch (e) {
      setError(getErrorMessage(e, 'Error al iniciar sesión con Google'))
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Card className="p-6">
        <div className="text-lg font-semibold text-text-primary">Acceso</div>
        <div className="mt-1 text-sm text-text-secondary">Inicia sesión para ver tus pedidos y notificaciones.</div>

        <div className="mt-5 grid gap-3">
          <div>
            <div className="mb-2 text-xs text-text-secondary">Email</div>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" />
          </div>
          <div>
            <div className="mb-2 text-xs text-text-secondary">Contraseña</div>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error ? (
            <div className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{error}</div>
          ) : null}
          <Button onClick={() => void onSubmit()} disabled={!email || !password || auth.loading}>
            Entrar
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <div className="text-xs text-text-secondary">o</div>
            <div className="h-px flex-1 bg-white/10" />
          </div>
          <Button variant="secondary" onClick={() => void onGoogleSignIn()} disabled={auth.loading} icon={<GoogleIcon />}>
            Continuar con Google
          </Button>
          <div className="text-sm text-text-secondary">
            ¿No tenés cuenta? <Link to="/registro">Creá una</Link>
          </div>
        </div>
      </Card>
    </div>
  )
}
