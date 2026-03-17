import { describe, expect, it } from 'vitest'
import { getStatusTone } from '@/lib/status'

describe('getStatusTone', () => {
  it('maps canceled statuses to danger', () => {
    expect(getStatusTone('Cancelado')).toBe('danger')
  })

  it('maps production statuses to purple', () => {
    expect(getStatusTone('En producción')).toBe('purple')
  })
})

