import { supabase } from '@/lib/supabase'

export function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value)
}

function extractBucketObjectPath(bucket: string, pathOrUrl: string) {
  if (!pathOrUrl) return ''
  const normalizedBucketPrefix = `${bucket}/`
  if (!isHttpUrl(pathOrUrl)) {
    const trimmed = pathOrUrl.trim().replace(/^\/+/, '')
    if (trimmed.startsWith(normalizedBucketPrefix)) {
      return trimmed.slice(normalizedBucketPrefix.length)
    }
    return trimmed
  }
  try {
    const url = new URL(pathOrUrl)
    const parts = url.pathname
      .split('/')
      .map((p) => p.trim())
      .filter(Boolean)

    const bucketIdx = parts.findIndex((p) => p === bucket)
    if (bucketIdx === -1) return ''
    const objectPath = parts.slice(bucketIdx + 1).join('/')
    return decodeURIComponent(objectPath)
  } catch {
    return ''
  }
}

export function getPublicStorageUrl(bucket: string, pathOrUrl: string) {
  if (!pathOrUrl) return ''
  if (pathOrUrl.startsWith('/')) return pathOrUrl
  if (isHttpUrl(pathOrUrl)) {
    const objectPath = extractBucketObjectPath(bucket, pathOrUrl)
    if (!objectPath) return pathOrUrl
    const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath)
    return data.publicUrl
  }
  const objectPath = extractBucketObjectPath(bucket, pathOrUrl)
  const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath)
  return data.publicUrl
}

export async function getSignedStorageUrl(bucket: string, pathOrUrl: string, expiresInSeconds = 3600) {
  if (!pathOrUrl) return ''
  if (pathOrUrl.startsWith('/')) return pathOrUrl
  const objectPath = extractBucketObjectPath(bucket, pathOrUrl)
  if (!objectPath) {
    if (isHttpUrl(pathOrUrl)) return pathOrUrl
    throw new Error('Ruta de archivo inválida')
  }
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(objectPath, expiresInSeconds)
  if (error) {
    if (isHttpUrl(pathOrUrl)) return pathOrUrl
    throw error
  }
  return data.signedUrl
}
