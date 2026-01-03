'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import type { Product } from '@/types/database.types'
import { getServicePlans, ServicePlan } from '@/app/(dashboard)/services/actions'
import { toast } from 'sonner'

interface ServicePlansDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  service: Product | null
}

const FREQUENCY_LABELS: Record<string, string> = {
  once: 'One-time',
  weekly: 'Weekly',
  'bi-weekly': 'Bi-weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  seasonal: 'Seasonal',
  yearly: 'Yearly',
}

function formatCurrency(value: number | null) {
  if (value == null) return 'Default'
  return `$${value.toFixed(2)}`
}

export function ServicePlansDialog({ open, onOpenChange, service }: ServicePlansDialogProps) {
  const [plans, setPlans] = useState<ServicePlan[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!open || !service) return

    setIsLoading(true)
    getServicePlans(service.id).then((result) => {
      if (result?.error) {
        toast.error(result.error)
        setPlans([])
      } else {
        setPlans(result?.plans || [])
      }
      setIsLoading(false)
    })
  }, [open, service])

  const hasPlans = plans.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{service ? `${service.name} Plans` : 'Linked Plans'}</DialogTitle>
          <DialogDescription>
            Review recurring plans tied to this service.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading plans...
          </div>
        ) : hasPlans ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell>
                    {plan.customer ? (
                      <Link href={`/customers/${plan.customer.id}`} className="font-medium text-emerald-600 hover:underline">
                        {plan.customer.name}
                      </Link>
                    ) : (
                      'Unknown'
                    )}
                    {plan.customer?.address ? (
                      <div className="text-xs text-muted-foreground">{plan.customer.address}</div>
                    ) : null}
                  </TableCell>
                  <TableCell>{FREQUENCY_LABELS[plan.frequency] || plan.frequency}</TableCell>
                  <TableCell>{formatCurrency(plan.custom_cost)}</TableCell>
                  <TableCell>{plan.start_date}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={plan.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}>
                      {plan.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="rounded-lg border bg-slate-50 p-4 text-sm text-muted-foreground">
            No recurring plans yet. Create plans from a customer record.
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="outline" asChild>
            <Link href="/customers">Go to Customers</Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
