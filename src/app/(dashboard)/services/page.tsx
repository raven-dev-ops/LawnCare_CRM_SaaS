import { createClient } from '@/lib/supabase/server'
import { ServiceCatalogView } from '@/components/services/ServiceCatalogView'

export const metadata = {
  title: 'Services | Lawn Care CRM',
  description: 'Manage your services and products catalog',
}

export default async function ServicesPage() {
  const supabase = await createClient()

  const { data: services, error } = await supabase
    .from('products_services')
    .select('*')
    .order('name')

  const { data: planRows } = await supabase
    .from('customer_products')
    .select('product_id')

  const planCounts: Record<string, number> = {}
  ;(planRows || []).forEach((row) => {
    planCounts[row.product_id] = (planCounts[row.product_id] || 0) + 1
  })

  if (error) {
    console.error('Error fetching services:', error)
  }

  return (
    <ServiceCatalogView
      initialServices={services || []}
      planCounts={planCounts}
      errorMessage={error ? 'Failed to load services. Please try again.' : undefined}
    />
  )
}
