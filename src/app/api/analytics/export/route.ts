import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/roles'

type RouteStat = {
  total_stops: number | null
  completed_stops: number | null
  total_revenue: number | null
}

type ServiceEntry = {
  cost: number | null
}

function escapeCsvValue(value: unknown) {
  if (value === null || value === undefined) return ''
  const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value)
  const needsQuotes = /[",\n\r]/.test(stringValue)
  const escaped = stringValue.replace(/"/g, '""')
  return needsQuotes ? `"${escaped}"` : escaped
}

function toCsv(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const lines = [headers.join(',')]
  for (const row of rows) {
    const line = headers.map((header) => escapeCsvValue(row[header])).join(',')
    lines.push(line)
  }
  return lines.join('\n')
}

function applyDateFilter(
  query: any,
  start: string | null,
  end: string | null,
  field: 'date' | 'service_date'
) {
  let next = query
  if (start) next = next.gte(field, start)
  if (end) next = next.lte(field, end)
  return next
}

export async function GET(request: Request) {
  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) {
    return new Response('Admin access required.', { status: 403 })
  }

  const url = new URL(request.url)
  const type = url.searchParams.get('type') || 'kpis'
  const start = url.searchParams.get('start')
  const end = url.searchParams.get('end')

  const supabase = await createClient()

  if (type === 'route-stats') {
    let query = supabase
      .from('route_statistics')
      .select('*')
      .order('date', { ascending: true })
    query = applyDateFilter(query, start, end, 'date')
    const { data } = await query
    const csv = toCsv((data || []) as Array<Record<string, unknown>>)
    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename=\"route-stats.csv\"',
      },
    })
  }

  if (type === 'service-history') {
    let query = supabase
      .from('service_history')
      .select('id, customer_id, service_date, service_type, cost, duration_minutes, notes')
      .order('service_date', { ascending: true })
    query = applyDateFilter(query, start, end, 'service_date')
    const { data } = await query
    const csv = toCsv((data || []) as Array<Record<string, unknown>>)
    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename=\"service-history.csv\"',
      },
    })
  }

  const { data: customerMetrics } = await supabase
    .from('customer_metrics')
    .select('*')

  let routeStatsQuery = supabase
    .from('route_statistics')
    .select('total_stops, completed_stops, total_revenue, date')
    .order('date', { ascending: true })
  routeStatsQuery = applyDateFilter(routeStatsQuery, start, end, 'date')
  const { data: routeStats } = await routeStatsQuery

  let serviceHistoryQuery = supabase
    .from('service_history')
    .select('cost, service_date')
    .order('service_date', { ascending: true })
  serviceHistoryQuery = applyDateFilter(serviceHistoryQuery, start, end, 'service_date')
  const { data: serviceHistory } = await serviceHistoryQuery

  const customerCount = (customerMetrics || []).length
  const activeCustomers = (customerMetrics || []).filter(
    (metric) => (metric.services_last_90_days || 0) > 0
  ).length

  const avgRating =
    customerCount === 0
      ? 0
      : (customerMetrics || []).reduce((sum, metric) => sum + Number(metric.avg_rating || 0), 0) /
        customerCount

  const avgLtv =
    customerCount === 0
      ? 0
      : (customerMetrics || []).reduce((sum, metric) => sum + Number(metric.lifetime_revenue || 0), 0) /
        customerCount

  const avgServiceCost =
    customerCount === 0
      ? 0
      : (customerMetrics || []).reduce((sum, metric) => sum + Number(metric.avg_service_cost || 0), 0) /
        customerCount

  const routeTotals = (routeStats || []).reduce(
    (acc, row: RouteStat) => {
      acc.totalStops += Number(row.total_stops || 0)
      acc.completedStops += Number(row.completed_stops || 0)
      acc.plannedRevenue += Number(row.total_revenue || 0)
      acc.routes += 1
      return acc
    },
    { routes: 0, totalStops: 0, completedStops: 0, plannedRevenue: 0 }
  )

  const actualRevenue = (serviceHistory || []).reduce(
    (sum, entry: ServiceEntry) => sum + Number(entry.cost || 0),
    0
  )

  const completionRate = routeTotals.totalStops
    ? Math.round((routeTotals.completedStops / routeTotals.totalStops) * 1000) / 10
    : 0

  const kpiRow = {
    start_date: start || '',
    end_date: end || '',
    total_customers: customerCount,
    active_customers: activeCustomers,
    avg_rating: Number(avgRating.toFixed(2)),
    avg_ltv: Number(avgLtv.toFixed(2)),
    avg_service_cost: Number(avgServiceCost.toFixed(2)),
    total_routes: routeTotals.routes,
    total_stops: routeTotals.totalStops,
    completion_rate: completionRate,
    planned_revenue: Number(routeTotals.plannedRevenue.toFixed(2)),
    actual_revenue: Number(actualRevenue.toFixed(2)),
  }

  const csv = toCsv([kpiRow])
  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename=\"kpi-summary.csv\"',
    },
  })
}
