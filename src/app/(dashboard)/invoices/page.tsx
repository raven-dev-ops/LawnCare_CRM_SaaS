import { createClient } from '@/lib/supabase/server'
import { InvoicesView } from '@/components/invoices/InvoicesView'

export const metadata = {
  title: 'Invoices | Lawn Care CRM',
  description: 'Manage invoices and payments',
}

export default async function InvoicesPage() {
  const supabase = await createClient()

  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, status, issue_date, due_date, total, amount_paid, customers ( id, name )')
    .order('issue_date', { ascending: false })

  if (error) {
    console.error('Error fetching invoices:', error)
  }

  return <InvoicesView initialInvoices={invoices || []} />
}
