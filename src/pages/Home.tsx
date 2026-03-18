import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { GalleryCard } from '@/components/gallery/GalleryCard'
import { supabase } from '@/lib/supabase'
import type { GalleryWork } from '@/types'
import { withTimeout } from '@/lib/timeout'
import { getErrorMessage } from '@/lib/error'

export default function Home() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [works, setWorks] = useState<GalleryWork[]>([])

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const { data, error } = await withTimeout(
          supabase
            .from('gallery_works')
            .select('*')
            .eq('is_published', true)
            .order('is_featured', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(60),
          20_000,
          'La galería está tardando demasiado en cargar. Reintentá.'
        )
        if (!alive) return
        if (error) {
          setError(getErrorMessage(error, 'No se pudo cargar la galería'))
          setWorks([])
        } else {
          setWorks((data as GalleryWork[]) ?? [])
        }
      } catch (e) {
        if (!alive) return
        setError(getErrorMessage(e, 'No se pudo cargar la galería'))
        setWorks([])
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  return (
    <div className="flex flex-col gap-10">
      <section className="grid gap-6 rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-6 md:grid-cols-2 md:items-center md:p-10">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-text-secondary">
            <Sparkles className="h-4 w-4 text-neon-purple" />
            Cuadros neón 100% personalizados
          </div>
          <h1 className="mt-4 text-3xl font-semibold leading-tight text-text-primary md:text-4xl">
            Mirá trabajos reales y pedí tu cotización subiendo una referencia
          </h1>
          <p className="mt-3 max-w-xl text-sm text-text-secondary">
            Subí una imagen, definí medidas y estilo, y seguí el estado desde tu cuenta. Notificaciones in-app y por email.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link to="/personalizar">
              <Button>
                Personalizar y cotizar <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="#galeria">
              <Button variant="secondary">Ver galería</Button>
            </Link>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
          <img
            src={
              'https://coreva-normal.trae.ai/api/ide/v1/text_to_image?prompt=neon%20sign%20wall%20art%2C%20dark%20studio%20background%2C%20glowing%20green%20and%20purple%20neon%2C%20minimal%20premium%20product%20photography%2C%20soft%20fog%2C%20high%20contrast%2C%20sharp%20details%2C%20center%20composition&image_size=landscape_16_9'
            }
            alt="Mockup"
            className="aspect-video w-full rounded-xl object-cover"
            loading="lazy"
          />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <div className="text-sm font-semibold text-text-primary">1) Subí referencia</div>
          <div className="mt-2 text-sm text-text-secondary">JPG/PNG con preview y validación.</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm font-semibold text-text-primary">2) Recibí presupuesto</div>
          <div className="mt-2 text-sm text-text-secondary">Notificación cuando el admin cotiza tu pedido.</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm font-semibold text-text-primary">3) Producción y entrega</div>
          <div className="mt-2 text-sm text-text-secondary">Seguimiento por estados desde “Mis pedidos”.</div>
        </Card>
      </section>

      <section id="galeria">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-text-primary">Galería de trabajos</div>
            <div className="mt-1 text-sm text-text-secondary">Inspirate con trabajos reales.</div>
          </div>
          <Link to="/personalizar" className="hidden sm:block">
            <Button variant="secondary" size="sm">
              Cotizá el tuyo
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-60 animate-pulse rounded-xl border border-white/10 bg-white/5" />
            ))}
          </div>
        ) : error ? (
          <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-text-secondary">
            No se pudo cargar la galería: {error}
          </div>
        ) : works.length === 0 ? (
          <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-text-secondary">
            Todavía no hay trabajos publicados. Entrá al panel admin para cargar la galería.
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {works.map((w) => (
              <GalleryCard key={w.id} work={w} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
