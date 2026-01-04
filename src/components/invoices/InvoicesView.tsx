'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Filter } from 'lucide-react'

interface InvoiceRow {
  id: string
  invoice_number: number
  status: string
  issue_date: string
  due_date: string | null
  total: number
  amount_paid: number
  customers?: { id: string; name: string | null } | { id: string; name: string | null }[] | null
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

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'partial', label: 'Partial' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'void', label: 'Void' },
]

const formatCurrency = (value: number) => `$${value.toFixed(2)}`

const formatDate = (value?: string | null) => {
  if (!value) return 'n/a'
  return new Date(value).toLocaleDateString()
}

const getCustomer = (invoice: InvoiceRow) => {
  const customer = invoice.customers
  if (Array.isArray(customer)) return customer[0] || null
  return customer || null
}

const getDisplayStatus = (invoice: InvoiceRow) => {
  const status = invoice.status || 'draft'
  if (!invoice.due_date) return status

  const due = new Date(invoice.due_date)
  const today = new Date()
  const isOverdue =
    due < new Date(today.getFullYear(), today.getMonth(), today.getDate()) &&
    !['paid', 'void'].includes(status)

  return isOverdue ? 'overdue' : status
}

const formatInvoiceNumber = (value: number) => `INV-${String(value).padStart(5, '0')}`

interface InvoicesViewProps {
  initialInvoices: InvoiceRow[]
}

export function InvoicesView({ initialInvoices }: InvoicesViewProps) {
  const [statusFilter, setStatusFilter] = useState('all')
  const invoices = initialInvoices

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const status = getDisplayStatus(invoice)
      return statusFilter === 'all' || status === statusFilter
    })
  }, [invoices, statusFilter])

  const totals = useMemo(() => {
    return invoices.reduce(
      (acc, invoice) => {
        const balance = Math.max(0, invoice.total - invoice.amount_paid)
        acc.totalBilled += invoice.total
        acc.totalPaid += invoice.amount_paid
        acc.outstanding += balance
        if (getDisplayStatus(invoice) === 'overdue') {
          acc.overdueCount += 1
        }
        return acc
      },
      { totalBilled: 0, totalPaid: 0, outstanding: 0, overdueCount: 0 }
    )
  }, [invoices])

  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-white px-8 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
            <p className="text-muted-foreground">Track billed work and incoming payments.</p>
          </div>
          <Button className="bg-emerald-500 hover:bg-emerald-600" asChild>
            <Link href="/invoices/new">
              <Plus className="mr-2 h-4 w-4" />
              New invoice
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex-1 bg-slate-50 p-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-xs uppercase text-muted-foreground">Total billed</div>
                <div className="text-2xl font-bold">{formatCurrency(totals.totalBilled)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs uppercase text-muted-foreground">Total paid</div>
                <div className="text-2xl font-bold text-emerald-600">{formatCurrency(totals.totalPaid)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs uppercase text-muted-foreground">Outstanding</div>
                <div className="text-2xl font-bold text-amber-600">{formatCurrency(totals.outstanding)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs uppercase text-muted-foreground">Overdue</div>
                <div className="text-2xl font-bold text-red-600">{totals.overdueCount}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">All invoices</h2>
                  <p className="text-sm text-muted-foreground">{filteredInvoices.length} invoice(s)</p>
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_FILTER_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Issue date</TableHead>
                    <TableHead>Due date</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => {
                    const customer = getCustomer(invoice)
                    const balance = Math.max(0, invoice.total - invoice.amount_paid)
                    const status = getDisplayStatus(invoice)

                    return (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">
                          {formatInvoiceNumber(invoice.invoice_number)}
                        </TableCell>
                        <TableCell>{customer?.name || 'Unknown'}</TableCell>
                        <TableCell>
                          <Badge className={STATUS_STYLES[status] || STATUS_STYLES.draft}>
                            {STATUS_LABELS[status] || status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(invoice.issue_date)}</TableCell>
                        <TableCell>{formatDate(invoice.due_date)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(invoice.total)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(balance)}</TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/invoices/${invoice.id}`}>View</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {filteredInvoices.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-10">
                  No invoices match this filter.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
