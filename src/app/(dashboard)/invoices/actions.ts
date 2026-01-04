'use server'

import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || ''
const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey)
  : null

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')

type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'void'

type PaymentMethod = 'cash' | 'check' | 'card' | 'bank_transfer' | 'stripe' | 'manual' | 'other'
type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded'

interface LineItemInput {
  description: string
  quantity?: number | null
  unitPrice?: number | null
  productId?: string | null
}

interface CreateInvoiceInput {
  customerId: string
  issueDate?: string
  dueDate?: string | null
  status?: InvoiceStatus
  tax?: number | null
  notes?: string | null
  lineItems: LineItemInput[]
}

interface UpdateInvoiceStatusInput {
  invoiceId: string
  status: InvoiceStatus
}

interface RecordPaymentInput {
  invoiceId: string
  amount: number
  method?: PaymentMethod
  status?: PaymentStatus
  paidAt?: string | null
  reference?: string | null
  stripePaymentIntentId?: string | null
  stripeChargeId?: string | null
}

interface CreateStripeCheckoutInput {
  invoiceId: string
}

const toNumber = (value: unknown, fallback = 0) => {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : fallback
}

const roundCurrency = (value: number) => Math.round(value * 100) / 100

export async function createInvoice(input: CreateInvoiceInput) {
  const supabase = await createClient()

  const lineItems = (input.lineItems || [])
    .map((item) => {
      const description = item.description?.trim()
      if (!description) return null
      const quantity = Math.max(1, toNumber(item.quantity, 1))
      const unitPrice = Math.max(0, toNumber(item.unitPrice, 0))
      const total = roundCurrency(quantity * unitPrice)
      return {
        description,
        quantity,
        unit_price: unitPrice,
        total,
        product_id: item.productId || null,
      }
    })
    .filter(Boolean) as Array<{
      description: string
      quantity: number
      unit_price: number
      total: number
      product_id: string | null
    }>

  if (lineItems.length === 0) {
    return { error: 'Add at least one line item.' }
  }

  const subtotal = roundCurrency(lineItems.reduce((sum, item) => sum + item.total, 0))
  const tax = Math.max(0, toNumber(input.tax, 0))
  const total = roundCurrency(subtotal + tax)

  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      customer_id: input.customerId,
      issue_date: input.issueDate || undefined,
      due_date: input.dueDate || null,
      status: input.status || 'draft',
      notes: input.notes || null,
      subtotal,
      tax,
      total,
      amount_paid: 0,
    })
    .select()
    .single()

  if (invoiceError || !invoice) {
    console.error('Create invoice error:', invoiceError)
    return { error: 'Failed to create invoice.' }
  }

  const { error: itemError } = await supabase
    .from('invoice_line_items')
    .insert(
      lineItems.map((item) => ({
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
        product_id: item.product_id,
      }))
    )

  if (itemError) {
    console.error('Create invoice items error:', itemError)
    await supabase.from('invoices').delete().eq('id', invoice.id)
    return { error: 'Failed to save invoice items.' }
  }

  revalidatePath('/invoices')
  revalidatePath(`/invoices/${invoice.id}`)
  return { invoice }
}

export async function updateInvoiceStatus(input: UpdateInvoiceStatusInput) {
  const supabase = await createClient()

  const { data: invoice, error } = await supabase
    .from('invoices')
    .update({ status: input.status, updated_at: new Date().toISOString() })
    .eq('id', input.invoiceId)
    .select()
    .maybeSingle()

  if (error) {
    console.error('Update invoice status error:', error)
    return { error: 'Failed to update invoice status.' }
  }

  revalidatePath('/invoices')
  revalidatePath(`/invoices/${input.invoiceId}`)
  return { invoice }
}

export async function recordPayment(input: RecordPaymentInput) {
  const supabase = await createClient()

  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('id, total, amount_paid, status')
    .eq('id', input.invoiceId)
    .maybeSingle()

  if (invoiceError || !invoice) {
    console.error('Fetch invoice for payment error:', invoiceError)
    return { error: 'Invoice not found.' }
  }

  const amount = Math.max(0, toNumber(input.amount, 0))
  if (amount <= 0) {
    return { error: 'Payment amount must be greater than zero.' }
  }

  const paidAt = input.paidAt ? new Date(input.paidAt).toISOString() : new Date().toISOString()

  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .insert({
      invoice_id: invoice.id,
      amount,
      method: input.method || 'manual',
      status: input.status || 'succeeded',
      paid_at: paidAt,
      reference: input.reference || null,
      stripe_payment_intent_id: input.stripePaymentIntentId || null,
      stripe_charge_id: input.stripeChargeId || null,
    })
    .select()
    .single()

  if (paymentError || !payment) {
    console.error('Record payment error:', paymentError)
    return { error: 'Failed to record payment.' }
  }

  let updatedInvoice = invoice

  if ((input.status || 'succeeded') === 'succeeded') {
    const nextPaid = roundCurrency(toNumber(invoice.amount_paid, 0) + amount)
    let nextStatus: InvoiceStatus = invoice.status as InvoiceStatus

    if (nextPaid >= toNumber(invoice.total, 0)) {
      nextStatus = 'paid'
    } else if (nextPaid > 0) {
      nextStatus = 'partial'
    }

    const { data: updated, error: updateError } = await supabase
      .from('invoices')
      .update({
        amount_paid: nextPaid,
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoice.id)
      .select()
      .maybeSingle()

    if (updateError) {
      console.error('Update invoice after payment error:', updateError)
    } else if (updated) {
      updatedInvoice = updated
    }
  }

  revalidatePath('/invoices')
  revalidatePath(`/invoices/${invoice.id}`)

  return { payment, invoice: updatedInvoice }
}

export async function createStripeCheckoutSession(input: CreateStripeCheckoutInput) {
  if (!stripe) {
    return { error: 'Stripe is not configured. Add STRIPE_SECRET_KEY to enable checkout.' }
  }

  const supabase = await createClient()

  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select(`
      id,
      invoice_number,
      total,
      subtotal,
      tax,
      currency,
      status,
      customers ( name, email ),
      invoice_line_items ( id, description, quantity, unit_price )
    `)
    .eq('id', input.invoiceId)
    .maybeSingle()

  if (invoiceError || !invoice) {
    console.error('Stripe checkout invoice fetch error:', invoiceError)
    return { error: 'Invoice not found.' }
  }

  const currency = (invoice.currency || 'USD').toLowerCase()
  const rawLineItems = Array.isArray(invoice.invoice_line_items)
    ? invoice.invoice_line_items
    : []

  const lineItems = rawLineItems
    .map((item) => {
      const quantity = Math.max(1, Math.round(toNumber(item.quantity, 1)))
      const unitAmount = Math.round(toNumber(item.unit_price, 0) * 100)
      if (unitAmount <= 0) return null

      return {
        price_data: {
          currency,
          product_data: {
            name: item.description || 'Service',
          },
          unit_amount: unitAmount,
        },
        quantity,
      }
    })
    .filter(Boolean) as Stripe.Checkout.SessionCreateParams.LineItem[]

  const taxInCents = Math.round(toNumber(invoice.tax, 0) * 100)

  if (taxInCents > 0) {
    lineItems.push({
      price_data: {
        currency,
        product_data: { name: 'Tax' },
        unit_amount: taxInCents,
      },
      quantity: 1,
    })
  }

  const totalInCents = Math.round(toNumber(invoice.total, 0) * 100)

  if (lineItems.length === 0) {
    if (totalInCents <= 0) {
      return { error: 'Invoice total must be greater than zero for Stripe checkout.' }
    }

    lineItems.push({
      price_data: {
        currency,
        product_data: { name: `Invoice #${invoice.invoice_number}` },
        unit_amount: totalInCents,
      },
      quantity: 1,
    })
  }

  const customerData = Array.isArray(invoice.customers)
    ? invoice.customers[0]
    : invoice.customers

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: lineItems,
    customer_email: customerData?.email || undefined,
    metadata: {
      invoice_id: invoice.id,
      invoice_number: String(invoice.invoice_number),
    },
    payment_intent_data: {
      metadata: {
        invoice_id: invoice.id,
        invoice_number: String(invoice.invoice_number),
      },
    },
    success_url: `${APP_URL}/invoices/${invoice.id}?stripe=success`,
    cancel_url: `${APP_URL}/invoices/${invoice.id}?stripe=cancel`,
  })

  if (!session.url) {
    return { error: 'Stripe checkout session failed to return a URL.' }
  }

  const updates: Record<string, string | null> = {
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
  }

  if (invoice.status === 'draft') {
    updates.status = 'sent'
  }

  const { error: updateError } = await supabase
    .from('invoices')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', invoice.id)

  if (updateError) {
    console.error('Stripe checkout invoice update error:', updateError)
  }

  revalidatePath('/invoices')
  revalidatePath(`/invoices/${invoice.id}`)

  return { url: session.url }
}
