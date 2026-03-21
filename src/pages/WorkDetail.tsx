import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { ImageCarousel } from '@/components/gallery/ImageCarousel'
import { supabase } from '@/lib/supabase'
import type { GalleryWork, GalleryWorkImage } from '@/types'
import { getPublicStorageUrl } from '@/lib/storage'
import { withTimeout } from '@/lib/timeout'
import { getErrorMessage } from '@/lib/error'

export default function WorkDetail() {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [work, setWork] = useState<GalleryWork | null>(null)
  const [imgs, setImgs] = useState<GalleryWorkImage[]>([])

  useEffect(() => {
    if (!id) {
      setError('No encontrado')
      setLoading(false)
      return
    }
    let alive = true
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const { data: w, error: wErr } = await withTimeout(
          supabase.from('gallery_works').select('*').eq('id', id).maybeSingle(),
          20_000,
          'El trabajo está tardando demasiado en cargar. Reintentá.'
        )
        if (!alive) return
        if (wErr || !w) {
          setError(wErr?.message ?? 'No encontrado')
          setWork(null)
          setImgs([])
          return
        }
        setWork(w as GalleryWork)

        const { data: images, error: imgErr } = await withTimeout(
          supabase
            .from('gallery_work_images')
            .select('*')
            .eq('work_id', id)
            .order('sort_order', { ascending: true }),
          20_000,
          'El contenido está tardando demasiado en cargar. Reintentá.'
        )
        if (!alive) return
        if (imgErr) {
          setImgs([])
        } else {
          setImgs((images as GalleryWorkImage[]) ?? [])
        }
      } catch (e) {
        if (!alive) return
        setError(getErrorMessage(e, 'No se pudo cargar el trabajo'))
        setWork(null)
        setImgs([])
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [id])

  const images = useMemo(() => {
    const list: string[] = []
    if (work?.cover_image_url) list.push(getPublicStorageUrl('gallery', work.cover_image_url))
    for (const i of imgs) list.push(getPublicStorageUrl('gallery', i.image_url))
    return Array.from(new Set(list))
  }, [work?.cover_image_url, imgs])

  if (loading) {
    return <div className="h-72 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
  }

  if (error || !work) {
    return (
      <Card className="p-6">
        <div className="text-sm font-semibold text-text-primary">Trabajo no disponible</div>
        <div className="mt-2 text-sm text-text-secondary">{error ?? 'No encontrado'}</div>
        <div className="mt-5">
          <Link to="/">
            <Button variant="secondary">Volver a la galería</Button>
          </Link>
        </div>
      </Card>
    )
  }

  const tags = work.tags_json ? parseTags(work.tags_json) : []

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
      <div>
        <ImageCarousel images={images} alt={work.title ?? 'Trabajo'} />
        <div className="mt-2 text-xs text-text-secondary">Tocá la foto o video para verlo en grande.</div>
      </div>

      <div>
        <div className="text-2xl font-semibold text-text-primary">{work.title ?? 'Trabajo'}</div>
        {work.description ? <div className="mt-2 text-sm text-text-secondary">{work.description}</div> : null}

        {tags.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {tags.map((t) => (
              <Badge key={t}>{t}</Badge>
            ))}
          </div>
        ) : null}

        <Card className="mt-6 p-5">
          <div className="text-sm font-semibold text-text-primary">¿Querés uno así?</div>
          <div className="mt-2 text-sm text-text-secondary">Subí una referencia y te cotizamos con tus medidas y estilo.</div>
          <div className="mt-4">
            <Link to="/personalizar">
              <Button>
                Quiero cotizar <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}

function parseTags(tagsJson: string): string[] {
  try {
    const parsed = JSON.parse(tagsJson)
    if (Array.isArray(parsed)) return parsed.filter((t) => typeof t === 'string')
    return []
  } catch {
    return tagsJson
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }
}
