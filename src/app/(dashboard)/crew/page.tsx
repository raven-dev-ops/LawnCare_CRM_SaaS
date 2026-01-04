import { createClient } from '@/lib/supabase/server'
import { CrewManagementView } from '@/components/crew/CrewManagementView'

export const metadata = {
  title: 'Crew | Lawn Care CRM',
  description: 'Manage crew members and route assignments',
}

export default async function CrewPage() {
  const supabase = await createClient()

  const { data: crew, error } = await supabase
    .from('crew_members')
    .select('*')
    .order('name')

  if (error) {
    console.error('Failed to load crew:', error)
  }

  return <CrewManagementView initialCrew={crew || []} />
}
