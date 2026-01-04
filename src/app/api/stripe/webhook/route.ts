import Stripe from 'stripe'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/types/database.types'

export const runtime = 'nodejs'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || ''
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null

type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'void'

const toNumber = (value: unknown, fallback = 0) => {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : fallback
}

const roundCurrency = (value: number) => Math.round(value * 100) / 100

async function ensureInvoiceStripeIds(params: {
  invoiceId: string
  paymentIntentId?: string | null
  sessionId?: string | null
}) {
  const supabase = createAdminClient()
  if (!supabase) {
    return { error: 'Supabase service role not configured.' }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminClient = supabase as any

  const updates: Database['public']['Tables']['invoices']['Update'] = {}

  if (params.paymentIntentId) {
    updates.stripe_payment_intent_id = params.paymentIntentId
  }

  if (params.sessionId) {
    updates.stripe_checkout_session_id = params.sessionId
  }

  if (Object.keys(updates).length === 0) {
    return { ok: true }
  }

  const { error } = await adminClient
    .from('invoices')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.invoiceId)

  if (error) {
    console.error('Stripe webhook invoice update error:', error)
    return { error: 'Failed to update invoice Stripe fields.' }
  }

  return { ok: true }
}

async function recordStripePayment(params: {
  invoiceId: string
  amount: number
  currency: string
  paymentIntentId?: string | null
  chargeId?: string | null
  paidAt?: string | null
  sessionId?: string | null
}) {
  const supabase = createAdminClient()
  if (!supabase) {
    return { error: 'Supabase service role not configured.' }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminClient = supabase as any

  const { data: invoice, error: invoiceError } = await adminClient
    .from('invoices')
    .select('id, total, amount_paid, status, stripe_payment_intent_id, stripe_checkout_session_id')
    .eq('id', params.invoiceId)
    .maybeSingle()

  if (invoiceError || !invoice) {
    console.error('Stripe webhook invoice fetch error:', invoiceError)
    return { error: 'Invoice not found.' }
  }

  if (params.paymentIntentId) {
    const { data: existingPayment } = await adminClient
      .from('payments')
      .select('id')
      .eq('stripe_payment_intent_id', params.paymentIntentId)
      .maybeSingle()

    if (existingPayment) {
      await ensureInvoiceStripeIds({
        invoiceId: params.invoiceId,
        paymentIntentId: params.paymentIntentId,
        sessionId: params.sessionId,
      })
      return { ok: true, duplicate: true }
    }
  }

  const paidAtIso = params.paidAt || new Date().toISOString()

  const { error: paymentError } = await adminClient
    .from('payments')
    .insert({
      invoice_id: params.invoiceId,
      amount: params.amount,
      currency: params.currency,
      method: 'stripe',
      status: 'succeeded',
      paid_at: paidAtIso,
      stripe_payment_intent_id: params.paymentIntentId || null,
      stripe_charge_id: params.chargeId || null,
    })

  if (paymentError) {
    console.error('Stripe webhook payment insert error:', paymentError)
    return { error: 'Failed to record Stripe payment.' }
  }

  const nextPaid = roundCurrency(
    toNumber(invoice.amount_paid, 0) + toNumber(params.amount, 0)
  )
  let nextStatus: InvoiceStatus = invoice.status as InvoiceStatus

  if (nextPaid >= toNumber(invoice.total, 0)) {
    nextStatus = 'paid'
  } else if (nextPaid > 0) {
    nextStatus = 'partial'
  }

  const { error: updateError } = await adminClient
    .from('invoices')
    .update({
      amount_paid: nextPaid,
      status: nextStatus,
      stripe_payment_intent_id: params.paymentIntentId || invoice.stripe_payment_intent_id,
      stripe_checkout_session_id: params.sessionId || invoice.stripe_checkout_session_id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.invoiceId)

  if (updateError) {
    console.error('Stripe webhook invoice update error:', updateError)
    return { error: 'Failed to update invoice totals.' }
  }

  return { ok: true }
}

function resolveAmount(amountInCents?: number | null) {
  if (typeof amountInCents !== 'number') {
    return null
  }
  return roundCurrency(amountInCents / 100)
}

export async function POST(request: Request) {
  if (!stripe || !stripeWebhookSecret) {
    console.error('Stripe webhook misconfigured: missing secret key or webhook secret.')
    return NextResponse.json(
      { error: 'Stripe webhook not configured.' },
      { status: 500 }
    )
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing Stripe signature.' }, { status: 400 })
  }

  const body = await request.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret)
  } catch (error) {
    console.error('Stripe webhook signature verification failed:', error)
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const invoiceId = session.metadata?.invoice_id || null
        const paymentIntentId =
          typeof session.payment_intent === 'string' ? session.payment_intent : null
        const amount = resolveAmount(session.amount_total)
        const currency = session.currency || 'usd'
        const paidAt = session.created
          ? new Date(session.created * 1000).toISOString()
          : null

        if (!invoiceId) {
          console.warn('Stripe webhook missing invoice metadata on checkout session.')
          break
        }

        if (amount === null) {
          await ensureInvoiceStripeIds({
            invoiceId,
            paymentIntentId,
            sessionId: session.id,
          })
          break
        }

        const result = await recordStripePayment({
          invoiceId,
          amount,
          currency,
          paymentIntentId,
          paidAt,
          sessionId: session.id,
        })

        if (result.error) {
          return NextResponse.json({ error: result.error }, { status: 500 })
        }
        break
      }
      case 'payment_intent.succeeded': {
        const intent = event.data.object as Stripe.PaymentIntent
        const invoiceId = intent.metadata?.invoice_id || null
        const amount = resolveAmount(intent.amount_received)
        const currency = intent.currency || 'usd'
        const paidAt = intent.created
          ? new Date(intent.created * 1000).toISOString()
          : null
        const chargeId =
          typeof intent.latest_charge === 'string' ? intent.latest_charge : null

        if (!invoiceId || amount === null) {
          if (invoiceId) {
            await ensureInvoiceStripeIds({
              invoiceId,
              paymentIntentId: intent.id,
            })
          } else {
            console.warn('Stripe webhook missing invoice metadata on payment intent.')
          }
          break
        }

        const result = await recordStripePayment({
          invoiceId,
          amount,
          currency,
          paymentIntentId: intent.id,
          chargeId,
          paidAt,
        })

        if (result.error) {
          return NextResponse.json({ error: result.error }, { status: 500 })
        }
        break
      }
      default:
        break
    }
  } catch (error) {
    console.error('Stripe webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handling failed.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ received: true })
}
