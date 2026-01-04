'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { createInvoice } from '@/app/(dashboard)/invoices/actions'

interface CustomerOption {
  id: string
  name: string
  email?: string | null
}

interface ServiceOption {
  id: string
  name: string
  base_cost: number
}

interface LineItem {
  id: string
  description: string
  quantity: string
  unitPrice: string
  productId: string | null
}

interface InvoiceFormProps {
  customers: CustomerOption[]
  services: ServiceOption[]
}

const createLineItem = (): LineItem => {
  const fallbackId = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : fallbackId
  return {
    id,
    description: '',
    quantity: '1',
    unitPrice: '',
    productId: null,
  }
}

const formatCurrency = (value: number) => `$${value.toFixed(2)}`

export function InvoiceForm({ customers, services }: InvoiceFormProps) {
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]

  const [customerId, setCustomerId] = useState('')
  const [status, setStatus] = useState<'draft' | 'sent'>('draft')
  const [issueDate, setIssueDate] = useState(today)
  const [dueDate, setDueDate] = useState('')
  const [tax, setTax] = useState('')
  const [notes, setNotes] = useState('')
  const [lineItems, setLineItems] = useState<LineItem[]>([createLineItem()])
  const [isSaving, setIsSaving] = useState(false)

  const totals = useMemo(() => {
    const parsedItems = lineItems.map((item) => {
      const quantity = Math.max(1, Number.parseFloat(item.quantity || '1'))
      const unitPrice = Math.max(0, Number.parseFloat(item.unitPrice || '0'))
      return quantity * unitPrice
    })

    const subtotal = parsedItems.reduce((sum, total) => sum + total, 0)
    const taxAmount = Math.max(0, Number.parseFloat(tax || '0'))
    const total = subtotal + taxAmount

    return {
      subtotal,
      tax: taxAmount,
      total,
    }
  }, [lineItems, tax])

  const updateLineItem = (id: string, updates: Partial<LineItem>) => {
    setLineItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)))
  }

  const addLineItem = () => {
    setLineItems((prev) => [...prev, createLineItem()])
  }

  const removeLineItem = (id: string) => {
    setLineItems((prev) => prev.filter((item) => item.id !== id))
  }

  const handleServiceSelect = (itemId: string, value: string) => {
    if (value === 'custom') {
      updateLineItem(itemId, { productId: null })
      return
    }

    const service = services.find((entry) => entry.id === value)
    if (!service) return

    updateLineItem(itemId, {
      productId: service.id,
      description: service.name,
      unitPrice: service.base_cost.toFixed(2),
    })
  }

  const handleSubmit = async () => {
    if (!customerId) {
      toast.error('Select a customer for this invoice.')
      return
    }

    setIsSaving(true)

    const payload = {
      customerId,
      issueDate,
      dueDate: dueDate || null,
      status,
      tax: tax ? Number.parseFloat(tax) : 0,
      notes: notes.trim() || null,
      lineItems: lineItems.map((item) => ({
        description: item.description || 'Service',
        quantity: Number.parseFloat(item.quantity || '1'),
        unitPrice: Number.parseFloat(item.unitPrice || '0'),
        productId: item.productId,
      })),
    }

    const result = await createInvoice(payload)

    setIsSaving(false)

    if (result.error || !result.invoice) {
      toast.error(result.error || 'Failed to create invoice.')
      return
    }

    toast.success('Invoice created.')
    router.push(`/invoices/${result.invoice.id}`)
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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New invoice</h1>
          <p className="text-muted-foreground">Create a new invoice and assign line items.</p>
        </div>
      </div>

      <div className="flex-1 bg-slate-50 p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Customer</Label>
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}{customer.email ? ` (${customer.email})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={(value) => setStatus(value as 'draft' | 'sent')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Issue date</Label>
                  <Input type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Due date</Label>
                  <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Tax</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={tax}
                    onChange={(event) => setTax(event.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Line items</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                <Plus className="mr-2 h-4 w-4" />
                Add line item
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Unit price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((item) => {
                    const quantity = Math.max(1, Number.parseFloat(item.quantity || '1'))
                    const unitPrice = Math.max(0, Number.parseFloat(item.unitPrice || '0'))
                    const total = quantity * unitPrice

                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Input
                            value={item.description}
                            onChange={(event) => updateLineItem(item.id, { description: event.target.value })}
                            placeholder="Service description"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={item.productId || 'custom'}
                            onValueChange={(value) => handleServiceSelect(item.id, value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="custom">Custom</SelectItem>
                              {services.map((service) => (
                                <SelectItem key={service.id} value={service.id}>
                                  {service.name} ({formatCurrency(service.base_cost)})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantity}
                            onChange={(event) => updateLineItem(item.id, { quantity: event.target.value })}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(event) => updateLineItem(item.id, { unitPrice: event.target.value })}
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(total)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeLineItem(item.id)}
                            disabled={lineItems.length === 1}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              <div className="flex flex-col items-end gap-1 text-sm">
                <div className="flex justify-between w-full max-w-xs">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between w-full max-w-xs">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatCurrency(totals.tax)}</span>
                </div>
                <div className="flex justify-between w-full max-w-xs font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(totals.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="outline" asChild>
              <Link href="/invoices">Cancel</Link>
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving} className="bg-emerald-500 hover:bg-emerald-600">
              {isSaving ? 'Saving...' : 'Create invoice'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
