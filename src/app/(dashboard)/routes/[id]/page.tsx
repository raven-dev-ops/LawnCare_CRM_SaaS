import { createClient } from '@/lib/supabase/server'
import { RouteDetailView } from '@/components/routes/RouteDetailView'
import { getShopLocation } from '@/lib/settings'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function RouteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const shopLocation = await getShopLocation()

  const { data: route, error } = await supabase
    .from('routes')
    .select(`
      *,
      route_stops (
        *,
        customer:customers (*)
      )
    `)
    .eq('id', id)
    .order('stop_order', { foreignTable: 'route_stops' })
    .single()

  if (error || !route) {
    notFound()
  }

  const { data: customers } = await supabase
    .from('customers')
    .select(
      'id, name, address, latitude, longitude, cost, has_additional_work, additional_work_cost'
    )
    .is('archived_at', null)

  const { data: crewMembers } = await supabase
    .from('crew_members')
    .select('id, name, active')
    .eq('active', true)
    .order('name')

  const { data: completedRoutes } = await supabase
    .from('route_times')
    .select('duration_minutes')
    .eq('route_id', id)

  let avgCompletedMinutes: number | null = null
  const durations = (completedRoutes || [])
    .map((r) => (r.duration_minutes != null ? Number(r.duration_minutes) : null))
    .filter((v): v is number => v !== null)

  if (route?.average_duration_minutes != null) {
    avgCompletedMinutes = Number(route.average_duration_minutes)
  } else if (durations.length > 0) {
    avgCompletedMinutes = durations.reduce((a, b) => a + b, 0) / durations.length
  }

  return (
    <RouteDetailView
      route={route}
      customers={customers || []}
      avgCompletedMinutes={avgCompletedMinutes ?? undefined}
      shopLocation={shopLocation}
      crewMembers={crewMembers || []}
    />
  )
}
