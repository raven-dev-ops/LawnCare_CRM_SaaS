'use client'

import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useRole } from '@/components/auth/RoleProvider'
import type { Product } from '@/types/database.types'
import { ServiceFormDialog } from '@/components/services/ServiceFormDialog'
import { ServicePlansDialog } from '@/components/services/ServicePlansDialog'
import { deleteService, toggleServiceActive } from '@/app/(dashboard)/services/actions'
import { Plus, Search, Filter, MoreHorizontal, Link2 } from 'lucide-react'
import { toast } from 'sonner'

const TYPE_LABELS: Record<Product['type'], string> = {
  mowing: 'Mowing',
  trimming: 'Trimming',
  edging: 'Edging',
  fertilizing: 'Fertilizing',
  aeration: 'Aeration',
  seeding: 'Seeding',
  mulching: 'Mulching',
  leaf_removal: 'Leaf Removal',
  snow_removal: 'Snow Removal',
  other: 'Other',
}

const UNIT_LABELS: Record<Product['unit'], string> = {
  flat: 'Flat Rate',
  per_sqft: 'Per Sq Ft',
  per_hour: 'Per Hour',
  per_acre: 'Per Acre',
}

const SERVICE_TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
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
]

interface ServiceCatalogViewProps {
  initialServices: Product[]
  planCounts: Record<string, number>
  errorMessage?: string
}

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`
}

export function ServiceCatalogView({
  initialServices,
  planCounts: initialPlanCounts,
  errorMessage,
}: ServiceCatalogViewProps) {
  const { isAdmin } = useRole()
  const [services, setServices] = useState<Product[]>(initialServices)
  const [planCounts, setPlanCounts] = useState<Record<string, number>>(initialPlanCounts)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editingService, setEditingService] = useState<Product | null>(null)
  const [plansOpen, setPlansOpen] = useState(false)
  const [selectedService, setSelectedService] = useState<Product | null>(null)

  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      const matchesSearch =
        service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (service.description || '').toLowerCase().includes(searchQuery.toLowerCase())

      const matchesType = typeFilter === 'all' || service.type === typeFilter

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' ? service.active : !service.active)

      return matchesSearch && matchesType && matchesStatus
    })
  }, [services, searchQuery, typeFilter, statusFilter])

  const totals = useMemo(() => {
    const activeCount = services.filter((service) => service.active).length
    const avgCost =
      services.length > 0
        ? services.reduce((sum, service) => sum + Number(service.base_cost || 0), 0) / services.length
        : 0
    return {
      total: services.length,
      active: activeCount,
      inactive: services.length - activeCount,
      avgCost,
    }
  }, [services])

  const handleAdd = () => {
    setEditingService(null)
    setFormOpen(true)
  }

  const handleEdit = (service: Product) => {
    setEditingService(service)
    setFormOpen(true)
  }

  const handleFormSaved = (service: Product) => {
    setServices((prev) => {
      const exists = prev.find((item) => item.id === service.id)
      if (exists) {
        return prev.map((item) => (item.id === service.id ? service : item))
      }
      return [service, ...prev]
    })

    setPlanCounts((prev) => ({
      ...prev,
      [service.id]: prev[service.id] || 0,
    }))
  }

  const handleToggleActive = async (service: Product, nextActive: boolean) => {
    if (!isAdmin) {
      toast.error('Admin access required to update services.')
      return
    }

    const result = await toggleServiceActive(service.id, nextActive)
    if (result?.error || !result.service) {
      toast.error(result?.error || 'Failed to update service.')
      return
    }

    setServices((prev) =>
      prev.map((item) => (item.id === service.id ? (result.service as Product) : item))
    )
  }

  const handleDelete = async (service: Product) => {
    if (!isAdmin) {
      toast.error('Admin access required to delete services.')
      return
    }

    if (!window.confirm(`Delete ${service.name}? This cannot be undone.`)) return

    const result = await deleteService(service.id)
    if (result?.error) {
      toast.error(result.error)
      return
    }

    setServices((prev) => prev.filter((item) => item.id !== service.id))
    setPlanCounts((prev) => {
      const next = { ...prev }
      delete next[service.id]
      return next
    })
    toast.success('Service deleted.')
  }

  const openPlans = (service: Product) => {
    setSelectedService(service)
    setPlansOpen(true)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-white px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Services Catalog</h1>
            <p className="text-muted-foreground">
              Manage your recurring services and price templates.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              className="bg-emerald-500 hover:bg-emerald-600"
              onClick={handleAdd}
              disabled={!isAdmin}
              title={isAdmin ? undefined : 'Admin access required'}
            >
              <Plus className="mr-2 h-4 w-4" />
              {isAdmin ? 'Add Service' : 'Admin only'}
            </Button>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <div className="rounded-lg border bg-gradient-to-br from-emerald-50 to-white p-4">
            <div className="text-sm font-medium text-muted-foreground">Total Services</div>
            <div className="text-2xl font-bold">{totals.total}</div>
          </div>
          <div className="rounded-lg border bg-gradient-to-br from-blue-50 to-white p-4">
            <div className="text-sm font-medium text-muted-foreground">Active</div>
            <div className="text-2xl font-bold">{totals.active}</div>
          </div>
          <div className="rounded-lg border bg-gradient-to-br from-slate-50 to-white p-4">
            <div className="text-sm font-medium text-muted-foreground">Inactive</div>
            <div className="text-2xl font-bold">{totals.inactive}</div>
          </div>
          <div className="rounded-lg border bg-gradient-to-br from-amber-50 to-white p-4">
            <div className="text-sm font-medium text-muted-foreground">Avg Base Cost</div>
            <div className="text-2xl font-bold">{formatCurrency(totals.avgCost)}</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search services by name or description..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              {SERVICE_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | 'active' | 'inactive')}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-slate-50">
        <div className="h-full overflow-auto">
          <div className="mx-auto max-w-7xl p-6">
            <div className="rounded-lg border bg-white shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="font-semibold">Service</TableHead>
                    <TableHead className="font-semibold">Type</TableHead>
                    <TableHead className="font-semibold">Unit</TableHead>
                    <TableHead className="font-semibold text-right">Base Cost</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Plans</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredServices.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell>
                        <div className="font-medium">{service.name}</div>
                        {service.description ? (
                          <div className="text-xs text-muted-foreground">{service.description}</div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{TYPE_LABELS[service.type]}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {UNIT_LABELS[service.unit]}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(Number(service.base_cost) || 0)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={service.active}
                            onCheckedChange={(value) => handleToggleActive(service, value)}
                            disabled={!isAdmin}
                          />
                          <span className="text-sm text-muted-foreground">
                            {service.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 text-sm text-emerald-600 hover:underline"
                          onClick={() => openPlans(service)}
                        >
                          <Link2 className="h-4 w-4" />
                          {planCounts[service.id] || 0} plans
                        </button>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => openPlans(service)}>
                              View Plans
                            </DropdownMenuItem>
                            {isAdmin ? (
                              <>
                                <DropdownMenuItem onClick={() => handleEdit(service)}>
                                  Edit Service
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDelete(service)}
                                >
                                  Delete
                                </DropdownMenuItem>
                              </>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredServices.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No services match your filters.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <ServiceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        service={editingService}
        onSaved={handleFormSaved}
      />

      <ServicePlansDialog
        open={plansOpen}
        onOpenChange={setPlansOpen}
        service={selectedService}
      />
    </div>
  )
}
