import { createClient } from '@/lib/supabase/server'
import { InvoiceForm } from '@/components/invoices/InvoiceForm'

export const metadata = {
  title: 'New Invoice | Lawn Care CRM',
  description: 'Create a new invoice',
}

export default async function NewInvoicePage() {
  const supabase = await createClient()

  const { data: customers } = await supabase
    .from('customers')
    .select('id, name, email')
    .is('archived_at', null)
    .order('name')

  const { data: services } = await supabase
    .from('products_services')
    .select('id, name, base_cost')
    .eq('active', true)
    .order('name')

  return <InvoiceForm customers={customers || []} services={services || []} />
}
