import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
    },
  },
}))

import { sendEmailNotification } from '@/lib/emailNotification'

describe('sendEmailNotification', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key')
    mocks.getSession.mockReset()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  it('skips invalid payloads', async () => {
    const result = await sendEmailNotification({
      title: '',
      body: 'Estado actualizado',
    })
    expect(result).toEqual({ ok: false, detail: 'invalid_payload' })
  })

  it('sends email successfully', async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: 'tok' } },
      error: null,
    })
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const result = await sendEmailNotification({
      recipientEmail: 'cliente@example.com',
      title: 'Pedido actualizado',
      body: 'Tu pedido está en producción.',
    })

    expect(result).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.supabase.co/functions/v1/send-notification-email',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          apikey: 'anon-key',
          Authorization: 'Bearer tok',
          'Content-Type': 'application/json',
        }),
      })
    )
  })

  it('returns error on HTTP failure', async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: 'tok' } },
      error: null,
    })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Internal error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const result = await sendEmailNotification({
      recipientEmail: 'cliente@example.com',
      title: 'Pedido actualizado',
      body: 'Algo salió mal.',
    })

    expect(result.ok).toBe(false)
    expect(result.detail).toBe('Internal error')
  })

  it('returns error on fetch failure', async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: 'tok' } },
      error: null,
    })
    const abortError = new Error('Aborted')
    abortError.name = 'AbortError'
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(abortError)

    const result = await sendEmailNotification({
      recipientEmail: 'cliente@example.com',
      title: 'Pedido actualizado',
      body: 'Test timeout.',
    })

    expect(result.ok).toBe(false)
    expect(result.detail).toBe('email_timeout')
  })

  it('uses anon key when no session', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null })
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    await sendEmailNotification({
      recipientEmail: 'cliente@example.com',
      title: 'Pedido actualizado',
      body: 'Sin sesión.',
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, opts] = fetchMock.mock.calls[0]
    const headers = (opts as { headers: Record<string, string> }).headers
    expect(headers.apikey).toBe('anon-key')
    expect(headers.Authorization).toBeUndefined()
  })
})
