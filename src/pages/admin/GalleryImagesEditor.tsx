import { useState } from 'react'
import { ArrowDown, ArrowUp, Trash2, Upload } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { supabase } from '@/lib/supabase'
import { getPublicStorageUrl } from '@/lib/storage'

export type GalleryImagesModel = {
  cover_image_url: string
  images: Array<{ id?: string; image_url: string; sort_order: number }>
}

export function GalleryImagesEditor({
  model,
  onChange,
  busy,
  setBusy,
}: {
  model: GalleryImagesModel
  onChange: (next: GalleryImagesModel) => void
  busy: boolean
  setBusy: (next: boolean) => void
}) {
  const [error, setError] = useState<string | null>(null)

  const uploadGalleryImage = async (file: File) => {
    const ext = getExt(file.name)
    const path = `${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from('gallery').upload(path, file, { upsert: false, contentType: file.type })
    if (error) throw error
    return path
  }

  const addImage = async (file: File) => {
    setBusy(true)
    setError(null)
    try {
      const path = await uploadGalleryImage(file)
      const nextOrder = model.images.length ? Math.max(...model.images.map((x) => x.sort_order)) + 1 : 0
      const images = [...model.images, { image_url: path, sort_order: nextOrder }]
      const cover_image_url = model.cover_image_url || path
      onChange({ cover_image_url, images })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir la imagen')
    } finally {
      setBusy(false)
    }
  }

  const setCover = (path: string) => {
    onChange({ ...model, cover_image_url: path })
  }

  const move = (index: number, dir: -1 | 1) => {
    const copy = [...model.images]
    const to = index + dir
    if (to < 0 || to >= copy.length) return
    const tmp = copy[index]
    copy[index] = copy[to]
    copy[to] = tmp
    const normalized = copy.map((x, i) => ({ ...x, sort_order: i }))
    onChange({ ...model, images: normalized })
  }

  const removeImage = (index: number) => {
    const img = model.images[index]
    const remaining = model.images.filter((_, i) => i !== index).map((x, i) => ({ ...x, sort_order: i }))
    const cover = model.cover_image_url === img.image_url ? (remaining[0]?.image_url ?? '') : model.cover_image_url
    onChange({ cover_image_url: cover, images: remaining })
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-text-primary">Imágenes</div>
          <div className="mt-1 text-sm text-text-secondary">Subí múltiples, ordená y elegí portada.</div>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary hover:bg-white/10">
          {busy ? <Spinner className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
          {busy ? 'Subiendo…' : 'Subir'}
          <input
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void addImage(f)
              e.currentTarget.value = ''
            }}
          />
        </label>
      </div>

      {model.cover_image_url ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-black/30">
          <img
            src={getPublicStorageUrl('gallery', model.cover_image_url)}
            alt="Portada"
            className="w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-text-secondary">
          Subí al menos una imagen para poder guardar.
        </div>
      )}

      {error ? (
        <div className="mt-3 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{error}</div>
      ) : null}

      <div className="mt-4 grid gap-2">
        {model.images.map((i, idx) => (
          <div key={`${i.image_url}-${idx}`} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-2">
            <img
              src={getPublicStorageUrl('gallery', i.image_url)}
              alt=""
              className="h-14 w-20 rounded-lg object-cover"
              loading="lazy"
              decoding="async"
            />
            <div className="min-w-0 flex-1">
              <div className="text-xs text-text-secondary truncate">{i.image_url}</div>
              {model.cover_image_url === i.image_url ? <Badge tone="green">Portada</Badge> : null}
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="secondary" onClick={() => move(idx, -1)} disabled={busy}>
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="secondary" onClick={() => move(idx, 1)} disabled={busy}>
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setCover(i.image_url)} disabled={busy}>
                Portada
              </Button>
              <Button size="sm" variant="danger" onClick={() => removeImage(idx)} disabled={busy}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function getExt(name: string) {
  const parts = name.split('.')
  const ext = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'jpg'
  if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') return ext === 'jpeg' ? 'jpg' : ext
  return 'jpg'
}
