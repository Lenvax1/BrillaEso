import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/authStore'
import { getErrorMessage } from '@/lib/error'
import { Seo } from '@/components/Seo'

import { GoogleIcon } from '@/components/ui/GoogleIcon'

export default function Register() {
  const auth = useAuthStore()
  const init = useAuthStore((s) => s.init)
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    void init()
  }, [init])

  useEffect(() => {
    if (auth.user) nav('/mis-pedidos', { replace: true })
  }, [auth.user, nav])

  const onSubmit = async () => {
    setError(null)
    setNotice(null)
    try {
      const result = await auth.signUp({ email, password })
      if (result === 'needs_email_confirm') {
        setNotice('Te enviamos un email para confirmar tu cuenta. Después podés iniciar sesión.')
        nav('/login', { replace: true })
        return
      }
      nav('/mis-pedidos', { replace: true })
    } catch (e) {
      setError(getErrorMessage(e, 'Error al registrarse'))
    }
  }

  const onGoogleSignIn = async () => {
    if (!accepted) {
      setError('Debés aceptar los términos para continuar.')
      return
    }
    setError(null)
    setNotice(null)
    try {
      await auth.signInWithGoogle('/mis-pedidos')
    } catch (e) {
      setError(getErrorMessage(e, 'Error al continuar con Google'))
    }
  }

  return (
    <>
      <Seo title="Crear cuenta" description="Registrate para gestionar tus pedidos y notificaciones." canonicalPath="/registro" noIndex />
      <div className="mx-auto max-w-md">
        <Card className="p-6">
          <div className="text-lg font-semibold text-text-primary">Crear cuenta</div>
          <div className="mt-1 text-sm text-text-secondary">Registrate con email y contraseña.</div>

        <div className="mt-5 grid gap-3">
          <div>
            <div className="mb-2 text-xs text-text-secondary">Email</div>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" />
          </div>
          <div>
            <div className="mb-2 text-xs text-text-secondary">Contraseña</div>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
            Acepto los términos básicos
          </label>
          {error ? (
            <div className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{error}</div>
          ) : null}
          {notice ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-text-secondary">{notice}</div>
          ) : null}
          <Button onClick={() => void onSubmit()} disabled={!email || password.length < 6 || !accepted || auth.loading}>
            Crear cuenta
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <div className="text-xs text-text-secondary">o</div>
            <div className="h-px flex-1 bg-white/10" />
          </div>
          <Button variant="secondary" onClick={() => void onGoogleSignIn()} disabled={auth.loading || !accepted} icon={<GoogleIcon />}>
            Continuar con Google
          </Button>
          <div className="text-sm text-text-secondary">
            ¿Ya tenés cuenta? <Link to="/login">Entrá</Link>
          </div>
        </div>
        </Card>
      </div>
    </>
  )
}
