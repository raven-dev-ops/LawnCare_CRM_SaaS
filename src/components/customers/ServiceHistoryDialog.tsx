'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { ServiceHistory } from '@/types/database.types'
import {
  createServiceHistory,
  updateServiceHistory,
} from '@/app/(dashboard)/service-history/actions'
import { toast } from 'sonner'

interface ServiceHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerId: string
  entry?: ServiceHistory | null
  routeStopId?: string | null
  defaultValues?: Partial<ServiceHistory>
  onSaved?: (entry: ServiceHistory) => void
}

export function ServiceHistoryDialog({
  open,
  onOpenChange,
  customerId,
  entry,
  routeStopId,
  defaultValues,
  onSaved,
}: ServiceHistoryDialogProps) {
  const [serviceDate, setServiceDate] = useState('')
  const [serviceType, setServiceType] = useState('')
  const [cost, setCost] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('')
  const [notes, setNotes] = useState('')
  const [rating, setRating] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    const seed = entry || defaultValues || {}
    setServiceDate((seed.service_date as string) || '')
    setServiceType((seed.service_type as string) || '')
    setCost(
      seed.cost != null && !Number.isNaN(Number(seed.cost))
        ? String(Number(seed.cost))
        : ''
    )
    setDurationMinutes(
      seed.duration_minutes != null && !Number.isNaN(Number(seed.duration_minutes))
        ? String(Number(seed.duration_minutes))
        : ''
    )
    setNotes((seed.notes as string) || '')
    setRating(
      seed.customer_rating != null && !Number.isNaN(Number(seed.customer_rating))
        ? String(Number(seed.customer_rating))
        : ''
    )
  }, [open, entry, defaultValues])

  const handleSave = async () => {
    if (!serviceDate) {
      toast.error('Service date is required')
      return
    }
    if (!serviceType.trim()) {
      toast.error('Service type is required')
      return
    }

    const parsedCost = cost.trim() === '' ? null : Number(cost)
    if (parsedCost != null && Number.isNaN(parsedCost)) {
      toast.error('Enter a valid cost')
      return
    }

    const parsedDuration = durationMinutes.trim() === '' ? null : Number(durationMinutes)
    if (parsedDuration != null && Number.isNaN(parsedDuration)) {
      toast.error('Enter a valid duration')
      return
    }

    const parsedRating = rating.trim() === '' ? null : Number(rating)
    if (parsedRating != null && (Number.isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5)) {
      toast.error('Rating must be between 1 and 5')
      return
    }

    setIsSaving(true)

    const payload = {
      customerId,
      serviceDate,
      serviceType: serviceType.trim(),
      cost: parsedCost,
      durationMinutes: parsedDuration,
      notes: notes.trim() ? notes.trim() : null,
      customerRating: parsedRating,
    }

    const result = entry
      ? await updateServiceHistory({
          id: entry.id,
          ...payload,
        })
      : await createServiceHistory({
          ...payload,
          routeStopId: routeStopId || null,
        })

    setIsSaving(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    if (result.entry) {
      onSaved?.(result.entry)
    }

    toast.success(entry ? 'Service history updated' : 'Service history added')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{entry ? 'Edit Service History' : 'Add Service History'}</DialogTitle>
          <DialogDescription>
            Capture completed service details for this customer.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Service date</label>
            <Input
              type="date"
              value={serviceDate}
              onChange={(event) => setServiceDate(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Service type</label>
            <Input
              value={serviceType}
              onChange={(event) => setServiceType(event.target.value)}
              placeholder="Weekly mow"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Cost</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={cost}
                onChange={(event) => setCost(event.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Duration (min)</label>
              <Input
                type="number"
                min="0"
                value={durationMinutes}
                onChange={(event) => setDurationMinutes(event.target.value)}
                placeholder="30"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Customer rating (1-5)</label>
            <Input
              type="number"
              min="1"
              max="5"
              value={rating}
              onChange={(event) => setRating(event.target.value)}
              placeholder="5"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Notes</label>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Service notes"
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-emerald-500 hover:bg-emerald-600"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : entry ? 'Save changes' : 'Add entry'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
