import { createClient } from '@/lib/supabase/server'
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard'

export const metadata = {
  title: 'Analytics | Lawn Care CRM',
  description: 'Business analytics and insights',
}

export default async function AnalyticsPage() {
  const supabase = await createClient()

  const { data: customers } = await supabase
    .from('customers')
    .select(
      'id, name, address, day, type, cost, has_additional_work, additional_work_cost, latitude, longitude'
    )

  const { data: serviceHistory } = await supabase
    .from('service_history')
    .select('cost')

  return (
    <AnalyticsDashboard
      customers={customers || []}
      serviceHistory={serviceHistory || []}
    />
  )
}
