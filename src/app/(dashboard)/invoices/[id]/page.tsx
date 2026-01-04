import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { InvoiceDetailView } from '@/components/invoices/InvoiceDetailView'

export const metadata = {
  title: 'Invoice | Lawn Care CRM',
  description: 'Invoice details and payment history',
}

interface InvoiceDetailPageProps {
  params: { id: string }
  searchParams?: { stripe?: string }
}

export default async function InvoiceDetailPage({ params, searchParams }: InvoiceDetailPageProps) {
  const supabase = await createClient()

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, customers ( id, name, email )')
    .eq('id', params.id)
    .maybeSingle()

  if (!invoice) {
    notFound()
  }

  const { data: lineItems } = await supabase
    .from('invoice_line_items')
    .select('*')
    .eq('invoice_id', params.id)
    .order('created_at')

  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('invoice_id', params.id)
    .order('paid_at', { ascending: false })

  const stripeStatus = searchParams?.stripe === 'success'
    ? 'success'
    : searchParams?.stripe === 'cancel'
    ? 'cancel'
    : null

  return (
    <InvoiceDetailView
      invoice={invoice}
      lineItems={lineItems || []}
      payments={payments || []}
      stripeStatus={stripeStatus}
    />
  )
}
