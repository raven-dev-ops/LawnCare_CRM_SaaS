import { createClient } from '@/lib/supabase/server'
import { CustomersView } from '@/components/customers/CustomersView'
import { getShopLocation } from '@/lib/settings'

export const metadata = {
  title: 'Customers | Lawn Care CRM',
  description: 'Manage your lawn care customers',
}

type CustomersPageProps = {
  searchParams?: Promise<{ archive?: string | string[] }>
}

function resolveArchiveFilter(value?: string | string[]) {
  const raw = Array.isArray(value) ? value[0] : value
  if (raw === 'archived' || raw === 'all') return raw
  return 'active'
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const supabase = await createClient()
  const shopLocation = await getShopLocation()
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const archiveFilter = resolveArchiveFilter(resolvedSearchParams?.archive)

  let customersQuery = supabase.from('customers').select('*').order('name')
  if (archiveFilter === 'active') {
    customersQuery = customersQuery.is('archived_at', null)
  } else if (archiveFilter === 'archived') {
    customersQuery = customersQuery.not('archived_at', 'is', null)
  }

  const { data: customers, error } = await customersQuery

  const { data: convertedInquiries } = await supabase
    .from('inquiries')
    .select('id, converted_customer_id')
    .not('converted_customer_id', 'is', null)

  let googleSheetsConnected = false
  const { data: sheetsConnection, error: sheetsError } = await supabase
    .from('google_sheets_connections')
    .select('id')
    .eq('singleton', true)
    .maybeSingle()

  if (sheetsError) {
    console.error('Error fetching Google Sheets connection:', sheetsError)
  } else {
    googleSheetsConnected = Boolean(sheetsConnection?.id)
  }

  const inquiryByCustomerId: Record<string, string> = {}
  convertedInquiries?.forEach((inq) => {
    if (inq.converted_customer_id) {
      inquiryByCustomerId[inq.converted_customer_id] = inq.id
    }
  })

  if (error) {
    console.error('Error fetching customers:', error)
  }

  return (
    <CustomersView
      initialCustomers={customers || []}
      errorMessage={error ? 'Failed to load customers. Please try again.' : undefined}
      inquiryByCustomerId={inquiryByCustomerId}
      shopLocation={shopLocation}
      initialArchiveFilter={archiveFilter}
      googleSheetsConnected={googleSheetsConnected}
    />
  )
}
