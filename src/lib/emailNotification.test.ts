﻿﻿﻿﻿﻿import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { sendEmailNotification } from '@/lib/emailNotification'

describe('sendEmailNotification', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key')
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('skips invalid payloads', async () => {
    const result = await sendEmailNotification({
      title: '',
      body: 'Estado actualizado',
    })

    expect(result).toEqual({ ok: false, detail: 'invalid_payload' })
  })

  it('sends email successfully with anon key only', async () => {
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
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.supabase.co/functions/v1/send-notification-email',
      expect.objectContaining({
        method: 'POST',
        keepalive: true,
        headers: expect.objectContaining({
          apikey: 'anon-key',
          'Content-Type': 'application/json',
        }),
      })
    )

    const [, options] = fetchMock.mock.calls[0]
    const headers = (options as { headers: Record<string, string> }).headers
    expect(headers.Authorization).toBeUndefined()
  })

  it('returns parsed HTTP errors', async () => {
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

    expect(result).toEqual({ ok: false, detail: 'Internal error' })
  })

  it('returns provider validation errors from successful HTTP responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        ok: false,
        detail: '{"statusCode":403,"message":"domain not verified"}',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const result = await sendEmailNotification({
      recipientEmail: 'cliente@example.com',
      title: 'Pedido actualizado',
      body: 'Algo salió mal.',
    })

    expect(result).toEqual({
      ok: false,
      detail: '{"statusCode":403,"message":"domain not verified"}',
    })
  })

  it('returns timeout on aborted fetches', async () => {
    const abortError = new Error('Aborted')
    abortError.name = 'AbortError'
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(abortError)

    const result = await sendEmailNotification({
      recipientEmail: 'cliente@example.com',
      title: 'Pedido actualizado',
      body: 'Test timeout.',
    })

    expect(result).toEqual({ ok: false, detail: 'email_timeout' })
  })
})
