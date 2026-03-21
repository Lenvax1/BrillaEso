import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isVideoMediaPath } from '@/lib/storage'

export function ImageCarousel({ images, alt }: { images: string[]; alt: string }) {
  const safe = useMemo(() => images.filter(Boolean), [images])
  const [idx, setIdx] = useState(0)
  const [openPreview, setOpenPreview] = useState(false)

  const current = safe[Math.min(idx, Math.max(safe.length - 1, 0))]
  const currentIsVideo = current ? isVideoMediaPath(current) : false
  const imageIndexes = useMemo(() => safe.map((src, i) => ({ src, i })).filter((x) => !isVideoMediaPath(x.src)).map((x) => x.i), [safe])

  const goPrevImage = useCallback(() => {
    const pos = imageIndexes.indexOf(idx)
    if (pos <= 0) return
    setIdx(imageIndexes[pos - 1])
  }, [idx, imageIndexes])

  const goNextImage = useCallback(() => {
    const pos = imageIndexes.indexOf(idx)
    if (pos === -1 || pos >= imageIndexes.length - 1) return
    setIdx(imageIndexes[pos + 1])
  }, [idx, imageIndexes])

  useEffect(() => {
    if (!openPreview) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenPreview(false)
      if (currentIsVideo) return
      if (event.key === 'ArrowLeft') goPrevImage()
      if (event.key === 'ArrowRight') goNextImage()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [currentIsVideo, goNextImage, goPrevImage, openPreview])

  if (safe.length === 0) {
    return <div className="aspect-[3/4] w-full rounded-xl border border-white/10 bg-white/5" />
  }

  return (
    <div className="w-full">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-white/10 bg-black/30">
        <div
          className="h-full w-full cursor-zoom-in"
          role="button"
          tabIndex={0}
          onClick={() => setOpenPreview(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setOpenPreview(true)
          }}
          aria-label="Abrir vista ampliada"
        >
          {currentIsVideo ? (
            <video
              key={current}
              src={current}
              className="h-full w-full object-cover"
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            <img src={current} alt={alt} className="h-full w-full object-cover" />
          )}
        </div>
        {safe.length > 1 ? (
          <>
            <button
              type="button"
              className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-lg border border-white/10 bg-black/40 p-2 text-text-primary hover:bg-black/60"
              onClick={() => setIdx((v) => (v - 1 + safe.length) % safe.length)}
              aria-label="Anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-lg border border-white/10 bg-black/40 p-2 text-text-primary hover:bg-black/60"
              onClick={() => setIdx((v) => (v + 1) % safe.length)}
              aria-label="Siguiente"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        ) : null}
      </div>
      {safe.length > 1 ? (
        <div className="mt-3 flex gap-2 overflow-auto pb-1">
          {safe.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              className={cn(
                'h-14 w-20 shrink-0 overflow-hidden rounded-lg border bg-black/30',
                i === idx ? 'border-neon-green/60' : 'border-white/10 hover:border-white/20'
              )}
              onClick={() => setIdx(i)}
              aria-label={`Ir a imagen ${i + 1}`}
            >
              {isVideoMediaPath(src) ? (
                <video src={src} className="h-full w-full object-cover" muted playsInline preload="metadata" />
              ) : (
                <img src={src} alt="" className="h-full w-full object-cover" />
              )}
            </button>
          ))}
        </div>
      ) : null}
      {openPreview ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setOpenPreview(false)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-lg border border-white/20 bg-black/40 p-2 text-text-primary hover:bg-black/60"
            onClick={() => setOpenPreview(false)}
            aria-label="Cerrar vista ampliada"
          >
            <X className="h-5 w-5" />
          </button>
          {currentIsVideo ? (
            <video
              key={`${current}-preview`}
              src={current}
              className="max-h-[90vh] w-auto max-w-[95vw] rounded-xl"
              autoPlay
              loop
              muted
              playsInline
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img
              src={current}
              alt={alt}
              className="max-h-[90vh] w-auto max-w-[95vw] rounded-xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          {!currentIsVideo && imageIndexes.length > 1 ? (
            <>
              <button
                type="button"
                className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-lg border border-white/20 bg-black/40 p-2 text-text-primary hover:bg-black/60 disabled:opacity-40"
                onClick={(e) => {
                  e.stopPropagation()
                  goPrevImage()
                }}
                disabled={imageIndexes.indexOf(idx) <= 0}
                aria-label="Imagen anterior"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-lg border border-white/20 bg-black/40 p-2 text-text-primary hover:bg-black/60 disabled:opacity-40"
                onClick={(e) => {
                  e.stopPropagation()
                  goNextImage()
                }}
                disabled={imageIndexes.indexOf(idx) >= imageIndexes.length - 1}
                aria-label="Imagen siguiente"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

