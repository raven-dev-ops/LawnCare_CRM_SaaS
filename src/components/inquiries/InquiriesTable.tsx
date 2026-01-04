'use client'

import { useState, useMemo, useTransition } from 'react'
import type { Inquiry } from '@/types/database.types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { updateInquiryStatus } from '@/app/(dashboard)/inquiries/actions'
import { Loader2, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { ConvertInquiryDialog } from './ConvertInquiryDialog'
import { toast } from 'sonner'

const STATUS_LABELS: Record<Inquiry['status'], string> = {
  pending: 'Pending',
  contacted: 'Contacted',
  quoted: 'Quoted',
  converted: 'Converted',
  declined: 'Declined',
  spam: 'Spam',
}

const STATUS_VARIANTS: Record<Inquiry['status'], 'default' | 'secondary' | 'outline'> = {
  pending: 'secondary',
  contacted: 'default',
  quoted: 'default',
  converted: 'default',
  declined: 'outline',
  spam: 'outline',
}

interface InquiriesTableProps {
  inquiries: Inquiry[]
}

export function InquiriesTable({ inquiries }: InquiriesTableProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | Inquiry['status'] | 'quoted_not_converted'>('all')
  const [isPending, startTransition] = useTransition()
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [convertOpen, setConvertOpen] = useState(false)
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null)

  const filteredInquiries = useMemo(() => {
    if (statusFilter === 'all') return inquiries
    if (statusFilter === 'quoted_not_converted') {
      return inquiries.filter(
        (inq) => inq.quote_amount != null && inq.status !== 'converted'
      )
    }
    return inquiries.filter((inq) => inq.status === statusFilter)
  }, [inquiries, statusFilter])

  const handleStatusChange = (id: string, status: Inquiry['status']) => {
    setUpdatingId(id)
    startTransition(async () => {
      const result = await updateInquiryStatus(id, status)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Inquiry updated')
      }
      setUpdatingId(null)
    })
  }

  const handleOpenConvert = (inq: Inquiry) => {
    setSelectedInquiry(inq)
    setConvertOpen(true)
  }

  if (inquiries.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No inquiries yet. Share your inquiry form link to start capturing leads.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Filter by status:</span>
          <Select
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter(value as 'all' | Inquiry['status'] | 'quoted_not_converted')
            }
          >
            <SelectTrigger className="h-8 w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="quoted">Quoted</SelectItem>
              <SelectItem value="quoted_not_converted">Quoted (not converted)</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
              <SelectItem value="spam">Spam</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-xs text-muted-foreground">
          Showing{' '}
          <span className="font-medium text-foreground">
            {filteredInquiries.length}
          </span>{' '}
          of{' '}
          <span className="font-medium text-foreground">
            {inquiries.length}
          </span>{' '}
          inquiries
        </div>
      </div>

      <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="font-semibold">Contact</TableHead>
              <TableHead className="font-semibold">Details</TableHead>
              <TableHead className="font-semibold">Services</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold text-right">Received</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInquiries.map((inq) => (
              <TableRow key={inq.id}>
                <TableCell className="align-top">
                  <div className="font-medium">
                    <Link
                      href={`/inquiries/${inq.id}`}
                      className="hover:underline underline-offset-2"
                    >
                      {inq.name}
                    </Link>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {inq.email}
                  </div>
                  {inq.phone && (
                    <div className="text-xs text-muted-foreground">
                      {inq.phone}
                    </div>
                  )}
                </TableCell>
                <TableCell className="align-top text-sm text-muted-foreground">
                  <div>{inq.address}</div>
                  <div className="text-xs mt-1">
                    {inq.property_type || 'Property type not specified'}
                    {inq.lot_size ? ` - ${inq.lot_size}` : ''}
                  </div>
                  {inq.notes && (
                    <div className="mt-1 text-xs line-clamp-2">
                      {inq.notes}
                    </div>
                  )}
                  {inq.quote_amount != null && (
                    <div className="mt-1 text-xs text-emerald-700">
                      Quote: ${Number(inq.quote_amount).toFixed(2)}
                    </div>
                  )}
                  {inq.internal_notes && (
                    <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      Internal: {inq.internal_notes}
                    </div>
                  )}
                </TableCell>
                <TableCell className="align-top text-sm">
                  {inq.services_interested && inq.services_interested.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {inq.services_interested.map((service) => (
                        <Badge key={service} variant="outline" className="text-xs">
                          {service}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Not specified
                    </span>
                  )}
                </TableCell>
                <TableCell className="align-top">
                  <div className="flex flex-col gap-2">
                    <Badge variant={STATUS_VARIANTS[inq.status]}>
                      {STATUS_LABELS[inq.status]}
                    </Badge>
                    <Select
                      value={inq.status}
                      onValueChange={(value) =>
                        handleStatusChange(inq.id, value as Inquiry['status'])
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="quoted">Quoted</SelectItem>
                        <SelectItem value="converted">Converted</SelectItem>
                        <SelectItem value="declined">Declined</SelectItem>
                        <SelectItem value="spam">Spam</SelectItem>
                      </SelectContent>
                    </Select>
                    {!inq.converted_customer_id && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs mt-1"
                        onClick={() => handleOpenConvert(inq)}
                        disabled={isPending && updatingId === inq.id}
                      >
                        <UserPlus className="h-3 w-3 mr-1" />
                        Convert to customer
                      </Button>
                    )}
                    {inq.converted_customer_id && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        Linked to customer -{' '}
                        <Link href="/customers" className="underline-offset-2 hover:underline">
                          View in Customers
                        </Link>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="align-top text-right text-xs text-muted-foreground">
                  {inq.created_at
                    ? new Date(inq.created_at).toLocaleDateString()
                    : '--'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {isPending && (
          <div className="flex items-center justify-center py-2 text-xs text-muted-foreground gap-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            Updating...
          </div>
        )}
      </div>
      <ConvertInquiryDialog
        open={convertOpen}
        onOpenChange={setConvertOpen}
        inquiry={selectedInquiry}
      />
    </div>
  )
}
