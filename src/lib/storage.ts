import { supabase } from '@/lib/supabase'

export function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value)
}

export function getPublicStorageUrl(bucket: string, pathOrUrl: string) {
  if (!pathOrUrl) return ''
  if (isHttpUrl(pathOrUrl) || pathOrUrl.startsWith('/')) return pathOrUrl
  const { data } = supabase.storage.from(bucket).getPublicUrl(pathOrUrl)
  return data.publicUrl
}

export async function getSignedStorageUrl(bucket: string, pathOrUrl: string, expiresInSeconds = 3600) {
  if (!pathOrUrl) return ''
  if (isHttpUrl(pathOrUrl) || pathOrUrl.startsWith('/')) return pathOrUrl
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(pathOrUrl, expiresInSeconds)
  if (error) throw error
  return data.signedUrl
}

