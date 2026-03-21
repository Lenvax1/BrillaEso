import { useCallback, useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { withTimeout } from '@/lib/timeout'
import { getEnv } from '@/lib/env'
import type { GalleryWork } from '@/types'
import { getPublicStorageUrl, isVideoMediaPath } from '@/lib/storage'
import { useAuthStore } from '@/stores/authStore'
import { GalleryEditorModal } from '@/pages/admin/GalleryEditorModal'

const supabaseUrl = getEnv('VITE_SUPABASE_URL')
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY')

export default function AdminGallery() {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [items, setItems] = useState<GalleryWork[]>([])
  const [open, setOpen] = useState(false)
  const [workId, setWorkId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const accessToken = useAuthStore.getState().session?.access_token
      if (!accessToken) throw new Error('No access token')
      const params = new URLSearchParams({
        select: '*',
        order: 'created_at.desc',
        limit: '200',
      })
      const response = await withTimeout(
        fetch(`${supabaseUrl}/rest/v1/gallery_works?${params.toString()}`, {
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${accessToken}`,
          },
        }),
        12000,
        'Tiempo de espera agotado al cargar galería'
      )
      if (!response.ok) throw new Error(`gallery_works: ${response.status}`)
      const data = (await response.json()) as GalleryWork[]
      setItems(data ?? [])
    } catch {
      setLoadError('No se pudo cargar. Intentá con Actualizar.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const removeWork = async (id: string) => {
    if (!confirm('Eliminar trabajo?')) return
    await supabase.from('gallery_works').delete().eq('id', id)
    void load()
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-lg font-semibold text-text-primary">Galería</div>
          <div className="mt-1 text-sm text-text-secondary">Gestioná trabajos e imágenes.</div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => void load()} disabled={loading}>Actualizar</Button>
          <Button onClick={() => { setWorkId(null); setOpen(true) }}>
            <Plus className="h-4 w-4" />Nuevo trabajo
          </Button>
        </div>
      </div>

      {loading && items.length === 0 ? <div className="h-72 animate-pulse rounded-xl border border-white/10 bg-white/5" /> : null}
      {loading && items.length > 0 ? <div className="text-xs text-text-secondary">Actualizando galería…</div> : null}
      {!loading && loadError ? <div className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{loadError}</div> : null}

      {!loadError && (!loading || items.length > 0) ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((w) => (
            <Card key={w.id} className="overflow-hidden">
              <div className="aspect-[4/3] bg-black/30">
                {isVideoMediaPath(w.cover_image_url) ? (
                  <video
                    src={getPublicStorageUrl('gallery', w.cover_image_url)}
                    className="h-full w-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <img src={getPublicStorageUrl('gallery', w.cover_image_url)} alt={w.title ?? 'Trabajo'} className="h-full w-full object-cover" loading="lazy" decoding="async" />
                )}
              </div>
              <div className="grid gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-text-primary line-clamp-1">{w.title ?? 'Sin título'}</div>
                    <div className="mt-1 text-xs text-text-secondary">{w.id.slice(0, 8)}</div>
                  </div>
                  <div className="flex gap-2">
                    {w.is_featured ? <Badge tone="purple">Destacado</Badge> : null}
                    {w.is_published ? <Badge tone="green">Publicado</Badge> : <Badge>Oculto</Badge>}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Button size="sm" variant="secondary" onClick={() => { setWorkId(w.id); setOpen(true) }}>Editar</Button>
                  <Button size="sm" variant="danger" onClick={() => void removeWork(w.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      <GalleryEditorModal open={open} workId={workId} onClose={() => setOpen(false)} onSaved={() => void load()} />
    </div>
  )
}
