import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { GalleryWork } from '@/types'
import { getPublicStorageUrl, isVideoMediaPath } from '@/lib/storage'

export function GalleryCard({ work }: { work: GalleryWork }) {
  const tags = work.tags_json ? safeParseTags(work.tags_json) : []
  const mediaUrl = getPublicStorageUrl('gallery', work.cover_image_url)
  const isVideo = isVideoMediaPath(work.cover_image_url)

  return (
    <Link to={`/trabajos/${work.id}`} className="block">
      <Card className="group overflow-hidden transition hover:border-white/20 hover:bg-white/5">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-black/30">
          {isVideo ? (
            <video
              src={mediaUrl}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            <img
              src={mediaUrl}
              alt={work.title ?? 'Trabajo'}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
              loading="lazy"
            />
          )}
          {work.is_featured ? (
            <div className="absolute left-3 top-3">
              <Badge tone="purple">Destacado</Badge>
            </div>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 p-4">
          <div className="text-sm font-semibold text-text-primary line-clamp-1">{work.title ?? 'Trabajo sin título'}</div>
          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {tags.slice(0, 3).map((t) => (
                <Badge key={t} className="bg-white/5" tone="neutral">
                  {t}
                </Badge>
              ))}
            </div>
          ) : (
            <div className="text-xs text-text-secondary">Ver contenido</div>
          )}
        </div>
      </Card>
    </Link>
  )
}

function safeParseTags(tagsJson: string): string[] {
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

