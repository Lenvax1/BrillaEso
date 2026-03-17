import { useEffect, useMemo, useState } from 'react'
import { Upload } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Modal } from '@/components/ui/Modal'
import { supabase } from '@/lib/supabase'
import type { GalleryWork, GalleryWorkImage } from '@/types'
import { GalleryImagesEditor } from '@/pages/admin/GalleryImagesEditor'

type EditModel = {
  id?: string
  title: string
  description: string
  tags: string
  is_published: boolean
  is_featured: boolean
  cover_image_url: string
  images: Array<{ id?: string; image_url: string; sort_order: number }>
}

export function GalleryEditorModal({
  open,
  workId,
  onClose,
  onSaved,
}: {
  open: boolean
  workId: string | null
  onClose: () => void
  onSaved: () => void
}) {
  const [model, setModel] = useState<EditModel | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const title = workId ? 'Editar trabajo' : 'Nuevo trabajo'

  const load = useMemo(() => {
    return async () => {
      if (!open) return
      if (!workId) {
        setModel({
          title: '',
          description: '',
          tags: '',
          is_published: true,
          is_featured: false,
          cover_image_url: '',
          images: [],
        })
        return
      }

      const { data: w } = await supabase.from('gallery_works').select('*').eq('id', workId).maybeSingle()
      const work = w as GalleryWork | null
      const { data: imgs } = await supabase
        .from('gallery_work_images')
        .select('*')
        .eq('work_id', workId)
        .order('sort_order', { ascending: true })

      if (!work) {
        setModel(null)
        return
      }

      setModel({
        id: work.id,
        title: work.title ?? '',
        description: work.description ?? '',
        tags: work.tags_json ?? '',
        is_published: work.is_published,
        is_featured: work.is_featured,
        cover_image_url: work.cover_image_url,
        images: ((imgs as GalleryWorkImage[]) ?? []).map((i) => ({ id: i.id, image_url: i.image_url, sort_order: i.sort_order })),
      })
    }
  }, [open, workId])

  useEffect(() => {
    void load()
  }, [load])

  const save = async () => {
    if (!model) return
    if (!model.cover_image_url) return
    setBusy(true)
    setError(null)
    const tags_json = model.tags.trim() ? model.tags.trim() : null

    try {
      if (!model.id) {
        const { data, error } = await supabase
          .from('gallery_works')
          .insert({
            title: model.title || null,
            description: model.description || null,
            cover_image_url: model.cover_image_url,
            tags_json,
            is_featured: model.is_featured,
            is_published: model.is_published,
          })
          .select('id')
          .single()

        if (error) throw error

        const id = (data as { id: string }).id
        if (model.images.length) {
          const { error: imgErr } = await supabase
            .from('gallery_work_images')
            .insert(model.images.map((i) => ({ work_id: id, image_url: i.image_url, sort_order: i.sort_order })))
          if (imgErr) throw imgErr
        }
      } else {
        const { error: workErr } = await supabase
          .from('gallery_works')
          .update({
            title: model.title || null,
            description: model.description || null,
            cover_image_url: model.cover_image_url,
            tags_json,
            is_featured: model.is_featured,
            is_published: model.is_published,
          })
          .eq('id', model.id)
        if (workErr) throw workErr

        const existing = new Map(model.images.filter((x) => x.id).map((x) => [x.id!, x]))
        const dbImgs = await supabase.from('gallery_work_images').select('id').eq('work_id', model.id)
        const dbList = ((dbImgs.data as Array<{ id: string }>) ?? [])

        const toDelete = dbList.filter((x) => !existing.has(x.id)).map((x) => x.id)
        const toUpdate = model.images.filter((x) => x.id)
        const toInsert = model.images.filter((x) => !x.id)

        const ops: Array<PromiseLike<unknown>> = []

        if (toDelete.length) {
          ops.push(supabase.from('gallery_work_images').delete().in('id', toDelete))
        }

        if (toUpdate.length) {
          ops.push(
            Promise.all(
              toUpdate.map((i) =>
                supabase
                  .from('gallery_work_images')
                  .update({ image_url: i.image_url, sort_order: i.sort_order })
                  .eq('id', i.id!)
              )
            )
          )
        }

        if (toInsert.length) {
          ops.push(
            supabase
              .from('gallery_work_images')
              .insert(toInsert.map((i) => ({ work_id: model.id, image_url: i.image_url, sort_order: i.sort_order })))
          )
        }

        await Promise.all(ops)
      }

      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} title={title} onClose={onClose}>
      {model ? (
        <div className="grid gap-4">
          <Card className="p-4">
            <div className="grid gap-3">
              <div>
                <div className="mb-2 text-xs text-text-secondary">Título (opcional)</div>
                <Input value={model.title} onChange={(e) => setModel({ ...model, title: e.target.value })} />
              </div>
              <div>
                <div className="mb-2 text-xs text-text-secondary">Descripción (opcional)</div>
                <Textarea value={model.description} onChange={(e) => setModel({ ...model, description: e.target.value })} />
              </div>
              <div>
                <div className="mb-2 text-xs text-text-secondary">Tags (JSON array o coma-separado)</div>
                <Input value={model.tags} onChange={(e) => setModel({ ...model, tags: e.target.value })} placeholder='["verde","morado"]' />
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="flex items-center gap-2 text-sm text-text-secondary">
                  <input
                    type="checkbox"
                    checked={model.is_published}
                    onChange={(e) => setModel({ ...model, is_published: e.target.checked })}
                  />
                  Publicado
                </label>
                <label className="flex items-center gap-2 text-sm text-text-secondary">
                  <input
                    type="checkbox"
                    checked={model.is_featured}
                    onChange={(e) => setModel({ ...model, is_featured: e.target.checked })}
                  />
                  Destacado
                </label>
              </div>
            </div>
          </Card>

          <GalleryImagesEditor
            model={{ cover_image_url: model.cover_image_url, images: model.images }}
            onChange={(next) => setModel({ ...model, cover_image_url: next.cover_image_url, images: next.images })}
            busy={busy}
            setBusy={setBusy}
          />

          {error ? (
            <div className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{error}</div>
          ) : null}

          <div className="flex justify-end">
            <Button onClick={() => void save()} disabled={busy || !model.cover_image_url}>
              {busy ? (
                <>
                  <Upload className="h-4 w-4" /> Guardando…
                </>
              ) : (
                'Guardar'
              )}
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  )
}
