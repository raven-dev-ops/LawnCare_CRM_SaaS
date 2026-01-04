import { createClient } from '@/lib/supabase/server'
import { RouteBuilder } from '@/components/routes/RouteBuilder'
import { getShopLocation } from '@/lib/settings'

export const metadata = {
  title: 'Create Route | Lawn Care CRM',
  description: 'Build and optimize a new service route',
}

export default async function NewRoutePage() {
  const supabase = await createClient()
  const shopLocation = await getShopLocation()

  // Get all customers with coordinates
  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .is('archived_at', null)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .order('name')

  const { data: crewMembers } = await supabase
    .from('crew_members')
    .select('id, name, active')
    .order('name')

  return (
    <RouteBuilder
      customers={customers || []}
      shopLocation={shopLocation}
      crewMembers={crewMembers || []}
    />
  )
}
