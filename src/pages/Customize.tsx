import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ImageUp, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { supabase } from '@/lib/supabase'
import { withTimeout } from '@/lib/timeout'
import { useAuthStore } from '@/stores/authStore'

type Specs = {
  measures: { widthCm: number; heightCm: number }
  style: { colors: string; background: 'transparent' | 'dark' | 'light' }
  text: string
  notes: string
}

export default function Customize() {
  const auth = useAuthStore()
  const init = useAuthStore((s) => s.init)
  const nav = useNavigate()
  const user = auth.user

  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'optimize' | 'upload' | 'create' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [okId, setOkId] = useState<string | null>(null)

  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [widthCm, setWidthCm] = useState(60)
  const [heightCm, setHeightCm] = useState(40)
  const [colors, setColors] = useState('verde, morado')
  const [background, setBackground] = useState<'transparent' | 'dark' | 'light'>('dark')
  const [text, setText] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    void init()
  }, [init])

  useEffect(() => {
    if (user?.email && !email) setEmail(user.email)
  }, [user?.email, email])

  useEffect(() => {
    if (!file) {
      setPreview('')
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const canSubmit = useMemo(() => {
    return !!user && !!file && email.includes('@') && widthCm > 0 && heightCm > 0
  }, [user, file, email, widthCm, heightCm])

  const onSubmit = async () => {
    if (!user) {
      nav('/login', { replace: false })
      return
    }
    if (!file) return
    setLoading(true)
    setStep('optimize')
    setError(null)
    setOkId(null)
    try {
      const uploadFile = await withTimeout(
        compressImageIfNeeded(file),
        8000,
        'La imagen es muy pesada. Probá con una más liviana.'
      )
      const ext = getExt(uploadFile.name)
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`

      setStep('upload')
      const uploadRes = await withTimeout(
        supabase.storage.from('references').upload(path, uploadFile, {
          upsert: false,
          contentType: uploadFile.type,
        }),
        25000,
        'La subida está tardando demasiado. Probá con otra imagen o revisá tu conexión.'
      )
      const upErr = uploadRes.error
      if (upErr) throw upErr

      setStep('create')

      const specs: Specs = {
        measures: { widthCm, heightCm },
        style: { colors, background },
        text,
        notes,
      }

      const { data, error: insErr } = await supabase
        .from('quote_requests')
        .insert({
          user_id: user.id,
          contact_email: email,
          contact_phone: phone || null,
          reference_image_url: path,
          specs_json: JSON.stringify(specs),
        })
        .select('id')
        .single()
      if (insErr) throw insErr

      setOkId((data as { id: string }).id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al enviar solicitud')
    } finally {
      setLoading(false)
      setStep(null)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      <Card className="p-5">
        <div className="text-sm font-semibold text-text-primary">Subí tu imagen de referencia</div>
        <div className="mt-1 text-sm text-text-secondary">Formatos: JPG/PNG. Te recomendamos buena iluminación.</div>

        <div className="mt-4">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/5 px-4 py-10 text-text-secondary hover:bg-white/10">
            <ImageUp className="h-6 w-6" />
            <div className="text-sm">Elegir archivo</div>
            <input
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        {preview ? (
          <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-black/30">
            <img src={preview} alt="Preview" className="w-full object-cover" />
          </div>
        ) : null}

        {!user ? (
          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-text-secondary">
            Para enviar una solicitud necesitás iniciar sesión.
            <div className="mt-3 flex gap-2">
              <Link to="/login">
                <Button size="sm">Entrar</Button>
              </Link>
              <Link to="/registro">
                <Button size="sm" variant="secondary">
                  Crear cuenta
                </Button>
              </Link>
            </div>
          </div>
        ) : null}
      </Card>

      <Card className="p-5">
        <div className="text-sm font-semibold text-text-primary">Detalles para cotizar</div>
        <div className="mt-1 text-sm text-text-secondary">Completá medidas, estilo y contacto.</div>

        <div className="mt-5 grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-2 text-xs text-text-secondary">Ancho (cm)</div>
              <Input type="number" min={1} value={widthCm} onChange={(e) => setWidthCm(Number(e.target.value))} />
            </div>
            <div>
              <div className="mb-2 text-xs text-text-secondary">Alto (cm)</div>
              <Input type="number" min={1} value={heightCm} onChange={(e) => setHeightCm(Number(e.target.value))} />
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs text-text-secondary">Colores / estilo</div>
            <Input value={colors} onChange={(e) => setColors(e.target.value)} placeholder="verde, morado" />
          </div>

          <div>
            <div className="mb-2 text-xs text-text-secondary">Fondo</div>
            <div className="grid grid-cols-3 gap-2">
              {(['transparent', 'dark', 'light'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  className={
                    'h-11 rounded-lg border text-sm transition ' +
                    (background === v
                      ? 'border-neon-green/50 bg-neon-green/10 text-neon-green'
                      : 'border-white/10 bg-white/5 text-text-secondary hover:bg-white/10')
                  }
                  onClick={() => setBackground(v)}
                >
                  {v === 'transparent' ? 'Transparente' : v === 'dark' ? 'Oscuro' : 'Claro'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs text-text-secondary">Texto (opcional)</div>
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ej: Brilla Eso" />
          </div>

          <div>
            <div className="mb-2 text-xs text-text-secondary">Notas (opcional)</div>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Contame qué te gustaría…" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-2 text-xs text-text-secondary">Email</div>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" />
            </div>
            <div>
              <div className="mb-2 text-xs text-text-secondary">Teléfono (opcional)</div>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+54…" />
            </div>
          </div>

          {error ? (
            <div className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{error}</div>
          ) : null}

          {okId ? (
            <div className="rounded-xl border border-neon-green/30 bg-neon-green/10 p-4 text-sm text-neon-green">
              Solicitud enviada. Número: <span className="font-semibold">{okId.slice(0, 8)}</span>
              <div className="mt-3">
                <Link to={`/mis-pedidos/${okId}`}>
                  <Button size="sm" variant="secondary">
                    Ver detalle
                  </Button>
                </Link>
              </div>
            </div>
          ) : null}

          <Button onClick={() => void onSubmit()} disabled={!canSubmit || loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {step === 'optimize'
                  ? 'Optimizando imagen…'
                  : step === 'upload'
                    ? 'Subiendo imagen…'
                    : step === 'create'
                      ? 'Creando solicitud…'
                      : 'Enviando…'}
              </>
            ) : (
              'Enviar solicitud'
            )}
          </Button>

        </div>
      </Card>
    </div>
  )
}

function getExt(name: string) {
  const parts = name.split('.')
  const ext = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'jpg'
  if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') return ext === 'jpeg' ? 'jpg' : ext
  return 'jpg'
}

async function compressImageIfNeeded(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  if (file.size < 900_000) return file

  const maxDim = 1600
  const quality = 0.85

  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
    const targetW = Math.max(1, Math.round(bitmap.width * scale))
    const targetH = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, targetW, targetH)

    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob) return file
    if (blob.size >= file.size) return file

    const name = file.name.replace(/\.(png|jpe?g)$/i, '.jpg')
    return new File([blob], name, { type: 'image/jpeg' })
  } catch {
    return file
  }
}
