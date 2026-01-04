import { createClient } from '@/lib/supabase/server'
import { ScheduleBoard } from '@/components/schedule/ScheduleBoard'

export const metadata = {
  title: 'Schedule | Lawn Care CRM',
  description: 'View and manage service schedule',
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

function formatDateInput(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(date: Date, days: number) {
  const next = new Date(date.getTime() + days * MS_PER_DAY)
  return next
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
      driver_id,
      driver_name,
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

  const normalizedRoutes = (routes || []).map((route) => ({
    ...route,
    route_stops: (route.route_stops || []).map((stop) => ({
      ...stop,
      customer: Array.isArray(stop.customer) ? stop.customer[0] : stop.customer,
    })),
  }))

  const today = new Date()
  const startDate = formatDateInput(today)
  const endDate = formatDateInput(addDays(today, 6))

  const { data: recurringPlans } = await supabase
    .from('customer_products')
    .select(`
      id,
      frequency,
      custom_cost,
      start_date,
      next_service_date,
      active,
      customer:customers (
        id,
        name,
        address
      ),
      service:products_services (
        id,
        name,
        base_cost
      )
    `)
    .eq('active', true)
    .gte('next_service_date', startDate)
    .lte('next_service_date', endDate)
    .order('next_service_date', { ascending: true })

  const normalizedRecurringPlans = (recurringPlans || []).map((plan) => ({
    ...plan,
    customer: Array.isArray(plan.customer) ? plan.customer[0] : plan.customer,
    service: Array.isArray(plan.service) ? plan.service[0] : plan.service,
  }))

  const { data: crewMembers } = await supabase
    .from('crew_members')
    .select('id, name, active')
    .eq('active', true)
    .order('name')

  return (
    <ScheduleBoard
      routes={normalizedRoutes}
      recurringPlans={normalizedRecurringPlans}
      crewMembers={crewMembers || []}
    />
  )
}
