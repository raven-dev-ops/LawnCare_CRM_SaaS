import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { InvoiceDetailView } from '@/components/invoices/InvoiceDetailView'

export const metadata = {
  title: 'Invoice | Lawn Care CRM',
  description: 'Invoice details and payment history',
}

interface InvoiceDetailPageProps {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ stripe?: string }>
}

export default async function InvoiceDetailPage({ params, searchParams }: InvoiceDetailPageProps) {
  const supabase = await createClient()
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const { id } = await params

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, customers ( id, name, email )')
    .eq('id', id)
    .maybeSingle()

  if (!invoice) {
    notFound()
  }

  const { data: lineItems } = await supabase
    .from('invoice_line_items')
    .select('*')
    .eq('invoice_id', id)
    .order('created_at')

  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('invoice_id', id)
    .order('paid_at', { ascending: false })

  const stripeStatus = resolvedSearchParams?.stripe === 'success'
    ? 'success'
    : resolvedSearchParams?.stripe === 'cancel'
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
