import { describe, expect, it } from 'vitest'
import { formatDateShort, formatMoneyARS } from '@/lib/format'

describe('formatMoneyARS', () => {
  it('returns null for nullish', () => {
    expect(formatMoneyARS(null)).toBeNull()
    expect(formatMoneyARS(undefined)).toBeNull()
  })

  it('formats a number as ARS', () => {
    const v = formatMoneyARS(12000)
    expect(v).toContain('$')
  })
})

describe('formatDateShort', () => {
  it('keeps invalid date as-is', () => {
    expect(formatDateShort('nope')).toBe('nope')
  })
})

