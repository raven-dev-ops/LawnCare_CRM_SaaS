import { createClient } from '@/lib/supabase/server'
import { RoutesOverview } from '@/components/routes/RoutesOverview'

export const metadata = {
  title: 'Routes | Lawn Care CRM',
  description: 'Plan and manage service routes',
}

export default async function RoutesPage() {
  const supabase = await createClient()

  // Get all routes with their stops
  const { data: routes, error: routesError } = await supabase
    .from('routes')
    .select(`
      id,
      name,
      date,
      day_of_week,
      status,
      driver_id,
      driver_name,
      total_distance_miles,
      total_duration_minutes,
      estimated_fuel_cost,
      route_stops (
        id,
        customer:customers (
          name,
          cost,
          additional_work_cost
        )
      )
    `)
    .order('day_of_week')

  // Get customers not in any route
  const { data: unscheduledCustomers, error: unscheduledError } = await supabase
    .from('customers')
    .select('id')
    .is('archived_at', null)
    .is('day', null)

  const { data: crewMembers } = await supabase
    .from('crew_members')
    .select('id, name, active')
    .eq('active', true)
    .order('name')

  return (
    <RoutesOverview
      routes={routes || []}
      unscheduledCustomers={unscheduledCustomers || []}
      crewMembers={crewMembers || []}
      routesError={!!routesError}
      unscheduledError={!!unscheduledError}
    />
  )
}
