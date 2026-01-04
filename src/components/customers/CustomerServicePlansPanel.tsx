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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  createCustomerServicePlan,
  updateCustomerServicePlan,
  deleteCustomerServicePlan,
} from '@/app/(dashboard)/customers/service-plans/actions'
import { toast } from 'sonner'

type ServiceOption = {
  id: string
  name: string
  base_cost: number | null
}

type ServicePlan = {
  id: string
  frequency: string
  custom_cost: number | null
  start_date: string
  end_date: string | null
  auto_renew: boolean
  active: boolean
  next_service_date: string | null
  service: ServiceOption | null
}

interface CustomerServicePlansPanelProps {
  customerId: string
  plans: ServicePlan[]
  services: ServiceOption[]
}

const FREQUENCY_OPTIONS = [
  { value: 'once', label: 'One-time' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi-weekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'seasonal', label: 'Seasonal' },
  { value: 'yearly', label: 'Yearly' },
] as const

type Frequency = typeof FREQUENCY_OPTIONS[number]['value']

function formatDate(value?: string | null) {
  if (!value) return 'TBD'
  return new Date(value).toLocaleDateString()
}

export function CustomerServicePlansPanel({
  customerId,
  plans,
  services,
}: CustomerServicePlansPanelProps) {
  const [items, setItems] = useState<ServicePlan[]>(plans)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<ServicePlan | null>(null)
  const [serviceId, setServiceId] = useState('')
  const [frequency, setFrequency] = useState<Frequency>('monthly')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [customCost, setCustomCost] = useState('')
  const [autoRenew, setAutoRenew] = useState(true)
  const [active, setActive] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setItems(plans)
  }, [plans])

  useEffect(() => {
    if (!dialogOpen) return

    if (editingPlan) {
      setServiceId(editingPlan.service?.id || '')
      setFrequency(editingPlan.frequency as Frequency)
      setStartDate(editingPlan.start_date)
      setEndDate(editingPlan.end_date || '')
      setCustomCost(editingPlan.custom_cost != null ? String(editingPlan.custom_cost) : '')
      setAutoRenew(editingPlan.auto_renew)
      setActive(editingPlan.active)
      return
    }

    setServiceId(services[0]?.id || '')
    setFrequency('monthly')
    setStartDate(new Date().toISOString().slice(0, 10))
    setEndDate('')
    setCustomCost('')
    setAutoRenew(true)
    setActive(true)
  }, [dialogOpen, editingPlan, services])

  const handleSave = async () => {
    if (!serviceId) {
      toast.error('Select a service to continue.')
      return
    }

    if (!startDate) {
      toast.error('Start date is required.')
      return
    }

    const parsedCost = customCost.trim() === '' ? null : Number(customCost)
    if (parsedCost != null && Number.isNaN(parsedCost)) {
      toast.error('Enter a valid custom cost.')
      return
    }

    setIsSaving(true)

    const payload = {
      customerId,
      productId: serviceId,
      frequency,
      startDate,
      endDate: endDate || null,
      customCost: parsedCost,
      autoRenew,
      active,
    }

    const result = editingPlan
      ? await updateCustomerServicePlan({
          id: editingPlan.id,
          ...payload,
          lastServiceDate: null,
        })
      : await createCustomerServicePlan(payload)

    setIsSaving(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    if (result.plan) {
      const normalizedPlan: ServicePlan = {
        ...result.plan,
        service: Array.isArray(result.plan.service)
          ? result.plan.service[0]
          : result.plan.service,
      }

      setItems((prev) => {
        const existing = prev.find((plan) => plan.id === normalizedPlan.id)
        if (existing) {
          return prev.map((plan) => (plan.id === normalizedPlan.id ? normalizedPlan : plan))
        }
        return [normalizedPlan, ...prev]
      })
    }

    toast.success(editingPlan ? 'Service plan updated.' : 'Recurring plan added.')
    setDialogOpen(false)
    setEditingPlan(null)
  }

  const handleDelete = async (plan: ServicePlan) => {
    const confirmed = window.confirm('Remove this recurring plan?')
    if (!confirmed) return

    const result = await deleteCustomerServicePlan(plan.id, customerId)
    if (result.error) {
      toast.error(result.error)
      return
    }

    setItems((prev) => prev.filter((item) => item.id !== plan.id))
    toast.success('Recurring plan removed.')
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recurring Services</CardTitle>
            <CardDescription>Assign services that repeat on a schedule.</CardDescription>
          </div>
          <Button
            size="sm"
            className="bg-emerald-500 hover:bg-emerald-600"
            onClick={() => {
              setEditingPlan(null)
              setDialogOpen(true)
            }}
          >
            Add plan
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recurring plans yet.</p>
        ) : (
          <div className="space-y-3">
            {items.map((plan) => {
              const statusClass = plan.active
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-slate-100 text-slate-600'
              const planFrequencyLabel =
                FREQUENCY_OPTIONS.find((option) => option.value === plan.frequency)?.label ||
                plan.frequency

              return (
                <div key={plan.id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{plan.service?.name || 'Service'}</div>
                      <div className="text-xs text-muted-foreground">
                        {planFrequencyLabel}
                        {plan.custom_cost != null
                          ? ` ? $${Number(plan.custom_cost).toFixed(2)}`
                          : plan.service?.base_cost != null
                          ? ` ? $${Number(plan.service.base_cost).toFixed(2)}`
                          : ''}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Next: {formatDate(plan.next_service_date)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className={statusClass}>
                        {plan.active ? 'Active' : 'Inactive'}
                      </Badge>
                      {plan.auto_renew && (
                        <Badge variant="outline">Auto-renew</Badge>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingPlan(plan)
                        setDialogOpen(true)
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-200 text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(plan)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Edit recurring plan' : 'Add recurring plan'}</DialogTitle>
            <DialogDescription>
              Select a service and cadence for this customer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Service</label>
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Frequency</label>
              <Select value={frequency} onValueChange={(value) => setFrequency(value as Frequency)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End date (optional)</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Custom cost (optional)</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={customCost}
                onChange={(event) => setCustomCost(event.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <div className="text-sm font-medium">Auto-renew</div>
                  <div className="text-xs text-muted-foreground">Keep plan active</div>
                </div>
                <Switch checked={autoRenew} onCheckedChange={setAutoRenew} />
              </div>
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <div className="text-sm font-medium">Active</div>
                  <div className="text-xs text-muted-foreground">Include in schedule</div>
                </div>
                <Switch checked={active} onCheckedChange={setActive} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-emerald-500 hover:bg-emerald-600"
            >
              {isSaving ? 'Saving...' : editingPlan ? 'Save changes' : 'Add plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
