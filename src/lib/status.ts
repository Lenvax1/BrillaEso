export function getStatusTone(status: string): 'neutral' | 'green' | 'purple' | 'danger' {
  const s = status.toLowerCase()
  if (s.includes('cancel')) return 'danger'
  if (s.includes('rechaz')) return 'danger'
  if (s.includes('listo')) return 'green'
  if (s.includes('enviado')) return 'green'
  if (s.includes('producci')) return 'purple'
  if (s.includes('cotiz')) return 'purple'
  return 'neutral'
}

