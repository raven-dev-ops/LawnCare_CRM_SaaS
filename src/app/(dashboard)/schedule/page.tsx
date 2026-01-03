import { createClient } from '@/lib/supabase/server'
import { ScheduleBoard } from '@/components/schedule/ScheduleBoard'

export const metadata = {
  title: 'Schedule | Lawn Care CRM',
  description: 'View and manage service schedule',
}

export default async function SchedulePage() {
  const supabase = await createClient()

  const { data: routes } = await supabase
    .from('routes')
    .select(`
      id,
      name,
      date,
      day_of_week,
      status,
      total_distance_miles,
      total_duration_minutes,
      estimated_fuel_cost,
      route_stops (
        id,
        stop_order,
        status,
        customer:customers (
          id,
          name,
          address,
          day,
          type,
          cost,
          additional_work_cost
        )
      )
    `)
    .order('day_of_week')
    .order('date')
    .order('stop_order', { foreignTable: 'route_stops' })

  return <ScheduleBoard routes={routes || []} />
}
