export function getErrorMessage(error: unknown, fallback = 'Ocurrió un error'): string {
  if (!error) return fallback
  if (typeof error === 'string') return error

  if (error instanceof Error) {
    const msg = error.message
    return msg ? msg : fallback
  }

  const maybe = error as { message?: unknown; error?: unknown }
  if (typeof maybe.message === 'string' && maybe.message.trim()) return maybe.message
  if (typeof maybe.error === 'string' && maybe.error.trim()) return maybe.error

  try {
    const json = JSON.stringify(error)
    return json === '{}' ? fallback : json
  } catch {
    return String(error)
  }
}
