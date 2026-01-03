'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import type { Product } from '@/types/database.types'
import { createService, updateService } from '@/app/(dashboard)/services/actions'

const SERVICE_TYPES = [
  { value: 'mowing', label: 'Mowing' },
  { value: 'trimming', label: 'Trimming' },
  { value: 'edging', label: 'Edging' },
  { value: 'fertilizing', label: 'Fertilizing' },
  { value: 'aeration', label: 'Aeration' },
  { value: 'seeding', label: 'Seeding' },
  { value: 'mulching', label: 'Mulching' },
  { value: 'leaf_removal', label: 'Leaf Removal' },
  { value: 'snow_removal', label: 'Snow Removal' },
  { value: 'other', label: 'Other' },
] as const

const SERVICE_UNITS = [
  { value: 'flat', label: 'Flat Rate' },
  { value: 'per_sqft', label: 'Per Sq Ft' },
  { value: 'per_hour', label: 'Per Hour' },
  { value: 'per_acre', label: 'Per Acre' },
] as const

interface ServiceFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  service?: Product | null
  onSaved: (service: Product) => void
}

export function ServiceFormDialog({
  open,
  onOpenChange,
  service,
  onSaved,
}: ServiceFormDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<Product['type']>('mowing')
  const [unit, setUnit] = useState<Product['unit']>('flat')
  const [baseCost, setBaseCost] = useState('')
  const [active, setActive] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) return

    if (service) {
      setName(service.name)
      setDescription(service.description || '')
      setType(service.type)
      setUnit(service.unit)
      setBaseCost(service.base_cost.toString())
      setActive(service.active)
    } else {
      setName('')
      setDescription('')
      setType('mowing')
      setUnit('flat')
      setBaseCost('')
      setActive(true)
    }
  }, [open, service])

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Service name is required.')
      return
    }

    const costValue = Number(baseCost)
    if (Number.isNaN(costValue) || costValue < 0) {
      toast.error('Base cost must be a valid number.')
      return
    }

    setIsSaving(true)
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      type,
      unit,
      base_cost: costValue,
      active,
    }

    const result = service
      ? await updateService(service.id, payload)
      : await createService(payload)

    setIsSaving(false)

    if (result?.error || !result.service) {
      toast.error(result?.error || 'Failed to save service.')
      return
    }

    toast.success(service ? 'Service updated.' : 'Service created.')
    onSaved(result.service as Product)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{service ? 'Edit Service' : 'Add Service'}</DialogTitle>
          <DialogDescription>
            Keep your catalog accurate so crews can estimate and price consistently.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="service-name">Service name</Label>
            <Input
              id="service-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Seasonal mowing"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="service-description">Description</Label>
            <Textarea
              id="service-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Notes for your team or customers"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(value) => setType(value as Product['type'])}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Unit</Label>
              <Select value={unit} onValueChange={(value) => setUnit(value as Product['unit'])}>
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_UNITS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="service-cost">Base cost</Label>
              <Input
                id="service-cost"
                type="number"
                min="0"
                step="0.01"
                value={baseCost}
                onChange={(event) => setBaseCost(event.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch checked={active} onCheckedChange={setActive} />
              <span className="text-sm">Active</span>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-emerald-500 hover:bg-emerald-600">
              {isSaving ? 'Saving...' : service ? 'Save Changes' : 'Add Service'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
