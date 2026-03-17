import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import type { GalleryWork } from '@/types'
import { getPublicStorageUrl } from '@/lib/storage'
import { GalleryEditorModal } from '@/pages/admin/GalleryEditorModal'
import { withTimeout } from '@/lib/timeout'

export default function AdminGallery() {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [items, setItems] = useState<GalleryWork[]>([])
  const [open, setOpen] = useState(false)
  const [workId, setWorkId] = useState<string | null>(null)

  const load = useMemo(() => {
    return async () => {
      setLoading(true)
      setLoadError(null)
      try {
        let attempt = 0
        while (attempt < 2) {
          const { data, error } = await withTimeout(
            supabase.from('gallery_works').select('*').order('created_at', { ascending: false }).limit(200),
            20_000,
            'La carga tardó demasiado. Reintentá con Actualizar.'
          )
          if (!error) {
            setItems((data as GalleryWork[]) ?? [])
            return
          }

          const msg = String((error as { message?: unknown } | null)?.message ?? '')
          const looksAuth = msg.toLowerCase().includes('jwt') || msg.toLowerCase().includes('auth')
          if (looksAuth && attempt === 0) {
            await supabase.auth.refreshSession().catch(() => null)
            attempt++
            continue
          }
          throw error
        }
      } catch (e) {
        setItems([])
        setLoadError(e instanceof Error ? e.message : 'No se pudo cargar')
      } finally {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load()
    }
    const onOnline = () => void load()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
    }
  }, [load])

  useEffect(() => {
    let t: number | undefined
    const channel = supabase
      .channel('admin-gallery-works')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery_works' }, () => {
        if (t) window.clearTimeout(t)
        t = window.setTimeout(() => void load(), 300)
      })
      .subscribe()

    return () => {
      if (t) window.clearTimeout(t)
      void supabase.removeChannel(channel)
    }
  }, [load])

  const openCreate = () => {
    setWorkId(null)
    setOpen(true)
  }

  const openEdit = async (work: GalleryWork) => {
    setWorkId(work.id)
    setOpen(true)
  }

  const removeWork = async (id: string) => {
    if (!confirm('Eliminar trabajo?')) return
    await supabase.from('gallery_works').delete().eq('id', id)
    await load()
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-lg font-semibold text-text-primary">Galería</div>
          <div className="mt-1 text-sm text-text-secondary">Gestioná trabajos e imágenes.</div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => void load()} disabled={loading}>
            Actualizar
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nuevo trabajo
          </Button>
        </div>
      </div>

      {loading ? <div className="h-72 animate-pulse rounded-xl border border-white/10 bg-white/5" /> : null}

      {!loading && loadError ? (
        <div className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{loadError}</div>
      ) : null}

      {!loading && !loadError ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((w) => (
            <Card key={w.id} className="overflow-hidden">
              <div className="aspect-[4/3] bg-black/30">
                <img
                  src={getPublicStorageUrl('gallery', w.cover_image_url)}
                  alt={w.title ?? 'Trabajo'}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
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
                  <Button size="sm" variant="secondary" onClick={() => void openEdit(w)}>
                    Editar
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => void removeWork(w.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      <GalleryEditorModal
        open={open}
        workId={workId}
        onClose={() => setOpen(false)}
        onSaved={() => void load()}
      />
    </div>
  )
}
