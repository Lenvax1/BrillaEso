export function isAbortLikeError(error: unknown): boolean {
  if (!error) return false

  if (error instanceof DOMException && error.name === 'AbortError') return true
  if (error instanceof Error && error.name === 'AbortError') return true

  const maybe = error as { name?: unknown; message?: unknown }
  if (typeof maybe.name === 'string' && maybe.name === 'AbortError') return true

  const message = typeof maybe.message === 'string' ? maybe.message : ''
  const lower = message.toLowerCase()
  if (lower.includes('aborterror')) return true
  if (lower.includes('aborted')) return true

  const asString = String(error).toLowerCase()
  if (asString.includes('aborterror')) return true
  if (asString.includes('aborted')) return true

  return false
}
