/**
 * @vitest-environment node
 */
import { describe, it, expect, vi } from 'vitest'
import { GET } from '@/app/api/analytics/export/route'
import { requireAdmin } from '@/lib/roles'
import { createClient } from '@/lib/supabase/server'

vi.mock('@/lib/roles', () => ({
  requireAdmin: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

const buildQuery = (data: Array<Record<string, unknown>>) => {
  const query = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    then: (resolve: (value: { data: Array<Record<string, unknown>> }) => void) =>
      Promise.resolve(resolve({ data })),
  }
  return query
}

describe('GET /api/analytics/export', () => {
  it('returns 403 when not admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ ok: false, error: 'Admin access required.' })

    const request = new Request('http://localhost/api/analytics/export?type=kpis')
    const response = await GET(request)

    expect(response.status).toBe(403)
  })

  it('returns KPI CSV for admins', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ ok: true })

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'customer_metrics') {
          return buildQuery([
            {
              id: '1',
              avg_rating: 4.5,
              lifetime_revenue: 1200,
              avg_service_cost: 50,
              services_last_90_days: 2,
            },
          ])
        }
        if (table === 'route_statistics') {
          return buildQuery([
            { total_stops: 10, completed_stops: 8, total_revenue: 500, date: '2026-01-01' },
          ])
        }
        if (table === 'service_history') {
          return buildQuery([{ cost: 300, service_date: '2026-01-01' }])
        }
        return buildQuery([])
      }),
    }

    vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>)

    const request = new Request('http://localhost/api/analytics/export')
    const response = await GET(request)
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(body).toContain('total_customers')
    expect(body).toContain('planned_revenue')
  })
})
