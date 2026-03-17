import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ImageCarousel({ images, alt }: { images: string[]; alt: string }) {
  const safe = useMemo(() => images.filter(Boolean), [images])
  const [idx, setIdx] = useState(0)

  if (safe.length === 0) {
    return <div className="aspect-[4/3] w-full rounded-xl border border-white/10 bg-white/5" />
  }

  const current = safe[Math.min(idx, safe.length - 1)]

  return (
    <div className="w-full">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-white/10 bg-black/30">
        <img src={current} alt={alt} className="h-full w-full object-cover" />
        {safe.length > 1 ? (
          <>
            <button
              type="button"
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-lg border border-white/10 bg-black/40 p-2 text-text-primary hover:bg-black/60"
              onClick={() => setIdx((v) => (v - 1 + safe.length) % safe.length)}
              aria-label="Anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg border border-white/10 bg-black/40 p-2 text-text-primary hover:bg-black/60"
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
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

