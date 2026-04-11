import { Helmet } from 'react-helmet-async'
import { useLocation } from 'react-router-dom'

type SeoProps = {
  title: string
  description?: string
  image?: string
  canonicalPath?: string
  noIndex?: boolean
  type?: 'website' | 'article'
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>
}

function normalizeTitle(title: string) {
  const t = title.trim()
  if (!t) return 'Brilla Eso'
  if (t.toLowerCase().includes('brilla eso')) return t
  return `${t} | Brilla Eso`
}

function getSiteUrl() {
  const fromEnv = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin
  return 'https://brillaeso.com.ar'
}

function toAbsoluteUrl(siteUrl: string, url: string) {
  try {
    return new URL(url).toString()
  } catch {
    return new URL(url, siteUrl).toString()
  }
}

export function Seo({ title, description, image, canonicalPath, noIndex, type = 'website', structuredData }: SeoProps) {
  const loc = useLocation()
  const siteUrl = getSiteUrl()
  const path = canonicalPath ?? loc.pathname
  const canonicalUrl = toAbsoluteUrl(siteUrl, path)
  const absoluteImage = image ? toAbsoluteUrl(siteUrl, image) : undefined
  const robots = noIndex ? 'noindex,nofollow' : 'index,follow'

  return (
    <Helmet>
      <title>{normalizeTitle(title)}</title>
      {description ? <meta name="description" content={description} /> : null}
      <link rel="canonical" href={canonicalUrl} />

      <meta name="robots" content={robots} />
      <meta name="googlebot" content={robots} />

      <meta property="og:site_name" content="Brilla Eso" />
      <meta property="og:locale" content="es_AR" />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={normalizeTitle(title)} />
      {description ? <meta property="og:description" content={description} /> : null}
      {absoluteImage ? <meta property="og:image" content={absoluteImage} /> : null}

      <meta name="twitter:card" content={absoluteImage ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={normalizeTitle(title)} />
      {description ? <meta name="twitter:description" content={description} /> : null}
      {absoluteImage ? <meta name="twitter:image" content={absoluteImage} /> : null}

      {structuredData
        ? Array.isArray(structuredData)
          ? structuredData.map((data, i) => (
              <script key={i} type="application/ld+json">
                {JSON.stringify(data)}
              </script>
            ))
          : (
              <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
            )
        : null}
    </Helmet>
  )
}

