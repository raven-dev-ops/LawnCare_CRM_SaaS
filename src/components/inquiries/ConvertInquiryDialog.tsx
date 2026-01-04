'use client'

import { useState, useEffect, useTransition } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import type { Inquiry, Customer } from '@/types/database.types'
import { convertInquiryToCustomer } from '@/app/(dashboard)/inquiries/actions'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ConvertInquiryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  inquiry: Inquiry | null
}

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const

export function ConvertInquiryDialog({
  open,
  onOpenChange,
  inquiry,
}: ConvertInquiryDialogProps) {
  const [type, setType] = useState<Customer['type']>('Residential')
  const [day, setDay] = useState<'unscheduled' | (typeof DAYS_OF_WEEK)[number]>('unscheduled')
  const [cost, setCost] = useState<string>('0')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (open && inquiry) {
      const inferredType =
        inquiry.property_type === 'Commercial' ? 'Commercial' : 'Residential'
      setType(inferredType)
      setDay('unscheduled')
      setCost('0')
    }
  }, [open, inquiry])

  if (!inquiry) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const parsedCost = Number(cost)
    if (Number.isNaN(parsedCost) || parsedCost < 0) {
      toast.error('Please enter a valid non-negative cost.')
      return
    }

    startTransition(async () => {
      const result = await convertInquiryToCustomer({
        inquiryId: inquiry.id,
        type,
        cost: parsedCost,
        day: day === 'unscheduled' ? null : (day as Customer['day']),
      })

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Customer created from inquiry')
        onOpenChange(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convert Inquiry to Customer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1 text-sm">
            <div className="font-medium">{inquiry.name}</div>
            <div className="text-muted-foreground">{inquiry.address}</div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Customer Type</label>
              <Select
                value={type}
                onValueChange={(value) => setType(value as Customer['type'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Residential">Residential</SelectItem>
                  <SelectItem value="Commercial">Commercial</SelectItem>
                  <SelectItem value="Workshop">Workshop</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Service Day</label>
              <Select
                value={day}
                onValueChange={(value) => setDay(value as 'unscheduled' | (typeof DAYS_OF_WEEK)[number])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unscheduled">Unscheduled</SelectItem>
                  {DAYS_OF_WEEK.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Base Monthly Cost</label>
              <Input
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                type="number"
                min={0}
                step={1}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-emerald-500 hover:bg-emerald-600"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Converting...
                </>
              ) : (
                'Create Customer'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

