'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArrowLeft, CreditCard, DollarSign, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { createStripeCheckoutSession, recordPayment, updateInvoiceStatus } from '@/app/(dashboard)/invoices/actions'
import type { Invoice, InvoiceLineItem, Payment } from '@/types/database.types'

interface InvoiceWithCustomer extends Invoice {
  customers?: { id: string; name: string | null; email?: string | null } | { id: string; name: string | null; email?: string | null }[] | null
}

interface InvoiceDetailViewProps {
  invoice: InvoiceWithCustomer
  lineItems: InvoiceLineItem[]
  payments: Payment[]
  stripeStatus?: 'success' | 'cancel' | null
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  partial: 'Partial',
  paid: 'Paid',
  overdue: 'Overdue',
  void: 'Void',
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  sent: 'bg-blue-100 text-blue-700',
  partial: 'bg-amber-100 text-amber-700',
  paid: 'bg-emerald-100 text-emerald-700',
  overdue: 'bg-red-100 text-red-700',
  void: 'bg-slate-200 text-slate-600',
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'manual', label: 'Manual' },
  { value: 'other', label: 'Other' },
] as const

const PAYMENT_STATUS_OPTIONS = [
  { value: 'succeeded', label: 'Succeeded' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
] as const

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'partial', label: 'Partial' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'void', label: 'Void' },
] as const

type InvoiceStatus = typeof STATUS_OPTIONS[number]['value']

type PaymentMethod = typeof PAYMENT_METHODS[number]['value']
type PaymentStatus = typeof PAYMENT_STATUS_OPTIONS[number]['value']

const formatCurrency = (value: number) => `$${value.toFixed(2)}`

const formatDate = (value?: string | null) => {
  if (!value) return 'n/a'
  return new Date(value).toLocaleDateString()
}

const getCustomer = (invoice: InvoiceWithCustomer) => {
  const customer = invoice.customers
  if (Array.isArray(customer)) return customer[0] || null
  return customer || null
}

const getDisplayStatus = (invoice: InvoiceWithCustomer) => {
  if (!invoice.due_date) return invoice.status
  const due = new Date(invoice.due_date)
  const today = new Date()
  const isOverdue =
    due < new Date(today.getFullYear(), today.getMonth(), today.getDate()) &&
    !['paid', 'void'].includes(invoice.status)
  return isOverdue ? 'overdue' : invoice.status
}

const formatInvoiceNumber = (value: number) => `INV-${String(value).padStart(5, '0')}`

export function InvoiceDetailView({ invoice, lineItems, payments, stripeStatus }: InvoiceDetailViewProps) {
  const router = useRouter()
  const customer = getCustomer(invoice)
  const displayStatus = getDisplayStatus(invoice)

  const balanceDue = useMemo(() => Math.max(0, invoice.total - invoice.amount_paid), [invoice])

  const [status, setStatus] = useState<InvoiceStatus>(invoice.status)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isStripeLoading, setIsStripeLoading] = useState(false)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState(balanceDue.toFixed(2))
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('manual')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('succeeded')
  const [paymentDate, setPaymentDate] = useState('')
  const [paymentReference, setPaymentReference] = useState('')
  const [isSavingPayment, setIsSavingPayment] = useState(false)

  useEffect(() => {
    if (paymentDialogOpen) {
      setPaymentAmount(balanceDue.toFixed(2))
      setPaymentMethod('manual')
      setPaymentStatus('succeeded')
      setPaymentDate('')
      setPaymentReference('')
    }
  }, [paymentDialogOpen, balanceDue])

  const handleStatusUpdate = async () => {
    setIsUpdatingStatus(true)
    const result = await updateInvoiceStatus({ invoiceId: invoice.id, status })
    setIsUpdatingStatus(false)

    if (result?.error) {
      toast.error(result.error)
      return
    }

    toast.success('Invoice status updated.')
    router.refresh()
  }

  const handleRecordPayment = async () => {
    const amount = Number.parseFloat(paymentAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter a valid payment amount.')
      return
    }

    setIsSavingPayment(true)
    const result = await recordPayment({
      invoiceId: invoice.id,
      amount,
      method: paymentMethod,
      status: paymentStatus,
      paidAt: paymentDate || null,
      reference: paymentReference || null,
    })
    setIsSavingPayment(false)

    if (result?.error) {
      toast.error(result.error)
      return
    }

    toast.success('Payment recorded.')
    setPaymentDialogOpen(false)
    router.refresh()
  }

  const handleStripeCheckout = async () => {
    setIsStripeLoading(true)
    const result = await createStripeCheckoutSession({ invoiceId: invoice.id })
    setIsStripeLoading(false)

    if (result?.error || !result?.url) {
      toast.error(result?.error || 'Failed to start Stripe checkout.')
      return
    }

    window.location.assign(result.url)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-white px-8 py-6">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/invoices">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to invoices
          </Link>
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{formatInvoiceNumber(invoice.invoice_number)}</h1>
            <p className="text-muted-foreground">
              {customer?.name || 'Unknown customer'} {customer?.email ? ` - ${customer.email}` : ''}
            </p>
          </div>
          <Badge className={STATUS_STYLES[displayStatus] || STATUS_STYLES.draft}>
            {STATUS_LABELS[displayStatus] || displayStatus}
          </Badge>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setPaymentDialogOpen(true)}>
            <DollarSign className="mr-2 h-4 w-4" />
            Record payment
          </Button>
          <Button
            variant="outline"
            onClick={handleStripeCheckout}
            disabled={isStripeLoading || balanceDue <= 0 || ['paid', 'void'].includes(invoice.status)}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            {isStripeLoading ? 'Starting checkout...' : 'Stripe checkout'}
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <div className="text-xs uppercase text-muted-foreground">Status</div>
            <Select value={status} onValueChange={(value) => setStatus(value as InvoiceStatus)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleStatusUpdate} disabled={isUpdatingStatus} className="bg-emerald-500 hover:bg-emerald-600">
            {isUpdatingStatus ? 'Updating...' : 'Update status'}
          </Button>
          {stripeStatus === 'success' && (
            <span className="text-sm text-emerald-600">Stripe checkout completed. Confirm payment before closing.</span>
          )}
          {stripeStatus === 'cancel' && (
            <span className="text-sm text-amber-600">Stripe checkout was canceled.</span>
          )}
        </div>
      </div>

      <div className="flex-1 bg-slate-50 p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <div className="text-xs uppercase text-muted-foreground">Invoice total</div>
                <div className="text-2xl font-bold">{formatCurrency(invoice.total)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs uppercase text-muted-foreground">Amount paid</div>
                <div className="text-2xl font-bold text-emerald-600">{formatCurrency(invoice.amount_paid)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs uppercase text-muted-foreground">Balance due</div>
                <div className="text-2xl font-bold text-amber-600">{formatCurrency(balanceDue)}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Invoice details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3 text-sm">
              <div>
                <div className="text-xs uppercase text-muted-foreground">Issue date</div>
                <div>{formatDate(invoice.issue_date)}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Due date</div>
                <div>{formatDate(invoice.due_date)}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Notes</div>
                <div>{invoice.notes || 'No notes'}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Line items</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {lineItems.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-6">No line items found.</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{formatDate(payment.paid_at)}</TableCell>
                      <TableCell className="capitalize">{payment.method.replace('_', ' ')}</TableCell>
                      <TableCell className="capitalize">{payment.status}</TableCell>
                      <TableCell>{payment.reference || 'n/a'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(payment.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {payments.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-6">No payments recorded.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
            <DialogDescription>Add a payment to this invoice.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={paymentAmount}
                onChange={(event) => setPaymentAmount(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Method</label>
              <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={paymentStatus} onValueChange={(value) => setPaymentStatus(value as PaymentStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Paid date</label>
              <Input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reference</label>
              <Input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRecordPayment} disabled={isSavingPayment} className="bg-emerald-500 hover:bg-emerald-600">
              {isSavingPayment ? 'Saving...' : 'Record payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
