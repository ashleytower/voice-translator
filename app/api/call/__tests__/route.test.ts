import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

function makeCallRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/call', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/call', () => {
  beforeEach(() => {
    vi.stubEnv('VAPI_API_KEY', 'test-key')
    vi.stubEnv('VAPI_PHONE_NUMBER_ID', 'test-phone-id')
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('includes userPhone and userCity in system prompt when provided', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 'call-123', status: 'queued' }))
    )

    const { POST } = await import('../route')
    await POST(makeCallRequest({
      phoneNumber: '+81312345678',
      taskDescription: 'Make a reservation for 2',
      targetLanguage: 'ja',
      userName: 'Ashley',
      userPhone: '+15141234567',
      userCity: 'Montreal, QC, Canada',
    }))

    const fetchCall = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    const body = JSON.parse(fetchCall[1].body)
    const systemPrompt = body.assistant.model.messages[0].content

    expect(systemPrompt).toContain('+15141234567')
    expect(systemPrompt).toContain('Montreal')
  })

  it('omits phone/city context when not provided', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 'call-123', status: 'queued' }))
    )

    const { POST } = await import('../route')
    await POST(makeCallRequest({
      phoneNumber: '+81312345678',
      taskDescription: 'Ask about hours',
      targetLanguage: 'ja',
    }))

    const fetchCall = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    const body = JSON.parse(fetchCall[1].body)
    const systemPrompt = body.assistant.model.messages[0].content

    expect(systemPrompt).not.toContain('callback')
    expect(systemPrompt).not.toContain('based in')
  })
})
