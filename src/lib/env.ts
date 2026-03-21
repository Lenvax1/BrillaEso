export function getEnv(name: string) {
  const value = import.meta.env[name] as string | undefined
  if (!value || !value.trim()) throw new Error(`Missing env var: ${name}`)
  return value.trim()
}

export function getEnvUrl(name: string) {
  const value = getEnv(name)
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error()
    }
  } catch {
    throw new Error(`Invalid env var ${name}: must be a valid HTTP or HTTPS URL`)
  }
  return value
}

