/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest'
import type { NextRequest } from 'next/server'
import { POST } from '@/app/api/inquiries/route'

describe('POST /api/inquiries', () => {
  it('returns 400 for invalid JSON', async () => {
    const request = new Request('http://localhost/api/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{invalid-json',
    })

    const response = await POST(request as NextRequest)

    expect(response.status).toBe(400)
  })

  it('returns 400 for invalid payload', async () => {
    const request = new Request('http://localhost/api/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    const response = await POST(request as NextRequest)

    expect(response.status).toBe(400)
  })
})
