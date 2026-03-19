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

  // Helper to make a call and return the parsed VAPI request body
  async function makeCallAndGetBody() {
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
    return JSON.parse(fetchCall[1].body)
  }

  it('uses gpt-4.1-mini model', async () => {
    const body = await makeCallAndGetBody()
    expect(body.assistant.model.model).toBe('gpt-4.1-mini')
  })

  it('configures startSpeakingPlan with conservative wait times', async () => {
    const body = await makeCallAndGetBody()
    const plan = body.assistant.startSpeakingPlan
    expect(plan).toBeDefined()
    expect(plan.waitSeconds).toBe(1.2)
    expect(plan.smartEndpointingEnabled).toBe(true)
    expect(plan.transcriptionEndpointingPlan.onPunctuationSeconds).toBe(1.5)
    expect(plan.transcriptionEndpointingPlan.onNoPunctuationSeconds).toBe(3.0)
    expect(plan.transcriptionEndpointingPlan.onNumberSeconds).toBe(2.0)
  })

  it('configures stopSpeakingPlan with numWords 2', async () => {
    const body = await makeCallAndGetBody()
    const plan = body.assistant.stopSpeakingPlan
    expect(plan).toBeDefined()
    expect(plan.numWords).toBe(2)
  })

  it('includes tool messages for request-start and request-response-delayed', async () => {
    const body = await makeCallAndGetBody()
    const tool = body.assistant.tools[0]
    expect(tool.messages).toBeDefined()
    const types = tool.messages.map((m: { type: string }) => m.type)
    expect(types).toContain('request-start')
    expect(types).toContain('request-response-delayed')
    expect(types).toContain('request-failed')
  })

  it('tool description requires business to have spoken first', async () => {
    const body = await makeCallAndGetBody()
    const desc = body.assistant.tools[0].function.description
    expect(desc).toContain('AFTER the business has spoken')
  })

  it('disables backchannel', async () => {
    const body = await makeCallAndGetBody()
    expect(body.assistant.backchannelingEnabled).toBe(false)
  })

  it('sets transcriber endpointing to 800', async () => {
    const body = await makeCallAndGetBody()
    expect(body.assistant.transcriber.endpointing).toBe(800)
  })

  it('does not include responseDelaySeconds', async () => {
    const body = await makeCallAndGetBody()
    expect(body.assistant.responseDelaySeconds).toBeUndefined()
  })

  it('sets tool timeoutSeconds to 25', async () => {
    const body = await makeCallAndGetBody()
    expect(body.assistant.tools[0].server.timeoutSeconds).toBe(25)
  })

  it('system prompt includes FLOW steps', async () => {
    const body = await makeCallAndGetBody()
    const systemPrompt = body.assistant.model.messages[0].content
    expect(systemPrompt).toContain('FLOW:')
    expect(systemPrompt).toContain('check_with_user')
  })
})
