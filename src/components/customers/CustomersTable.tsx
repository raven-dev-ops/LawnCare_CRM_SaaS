'use client'

import { useEffect, useState } from 'react'
import { Customer } from '@/types/database.types'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Edit, Trash2, MapPin, Phone, Mail, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { updateCustomer } from '@/app/(dashboard)/customers/actions'
import { toast } from 'sonner'

interface CustomersTableProps {
  customers: Customer[]
  onEdit?: (customer: Customer) => void
  onDelete?: (customer: Customer) => void
  onViewOnMap?: (customer: Customer) => void
  inquiryByCustomerId?: Record<string, string>
  onInlineUpdate?: (customer: Customer) => void
  focusedCustomerId?: string | null
}

export function CustomersTable({
  customers,
  onEdit,
  onDelete,
  onViewOnMap,
  inquiryByCustomerId,
  onInlineUpdate,
  focusedCustomerId,
}: CustomersTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    address: '',
    type: 'Residential',
    day: 'unscheduled',
    cost: 0,
    has_additional_work: false,
    additional_work_cost: 0,
  })
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!editingId) {
      setError(null)
    }
  }, [editingId])

  const beginEdit = (customer: Customer) => {
    setEditingId(customer.id)
    setForm({
      name: customer.name,
      address: customer.address,
      type: customer.type,
      day: customer.day || 'unscheduled',
      cost: customer.cost,
      has_additional_work: customer.has_additional_work || false,
      additional_work_cost: customer.additional_work_cost || 0,
    })
  }

  const handleSave = async () => {
    if (!editingId) return
    if (!form.name.trim()) {
      setError('Name is required')
      return
    }
    if (!form.address.trim()) {
      setError('Address is required')
      return
    }
    setSavingId(editingId)
    setError(null)
    const result = await updateCustomer({
      id: editingId,
      name: form.name.trim(),
      address: form.address.trim(),
      type: form.type as 'Residential' | 'Commercial' | 'Workshop',
      cost: Number(form.cost),
      day: form.day === 'unscheduled' ? null : form.day,
      has_additional_work: form.has_additional_work,
      additional_work_cost: form.has_additional_work ? Number(form.additional_work_cost) : null,
    })
    setSavingId(null)
    if (result.error || !result.customer) {
      setError(result.error || 'Failed to save')
      toast.error(result.error || 'Failed to save')
      return
    }
    toast.success(`${form.name} updated`)
    onInlineUpdate?.(result.customer as Customer)
    setEditingId(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setError(null)
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Residential':
        return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
      case 'Commercial':
        return 'bg-blue-100 text-blue-700 hover:bg-blue-100'
      case 'Workshop':
        return 'bg-purple-100 text-purple-700 hover:bg-purple-100'
      default:
        return 'bg-gray-100 text-gray-700 hover:bg-gray-100'
    }
  }

  const getDayColor = (day: string | null) => {
    if (!day) return 'bg-gray-100 text-gray-500'

    const dayColors: Record<string, string> = {
      Monday: 'bg-rose-100 text-rose-700',
      Tuesday: 'bg-orange-100 text-orange-700',
      Wednesday: 'bg-amber-100 text-amber-700',
      Thursday: 'bg-lime-100 text-lime-700',
      Friday: 'bg-cyan-100 text-cyan-700',
      Saturday: 'bg-blue-100 text-blue-700',
      Sunday: 'bg-violet-100 text-violet-700',
    }

    return dayColors[day] || 'bg-gray-100 text-gray-700'
  }

  if (customers.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <MapPin className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No customers found</h3>
          <p className="text-sm text-muted-foreground">
            Try adjusting your filters or add a new customer
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-7xl p-6">
        <div className="rounded-lg border bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="font-semibold">Customer</TableHead>
                <TableHead className="font-semibold">Address</TableHead>
                <TableHead className="font-semibold">Type</TableHead>
                <TableHead className="font-semibold">Day</TableHead>
                <TableHead className="font-semibold text-right">Cost</TableHead>
                <TableHead className="font-semibold text-right">Distance</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <TableRow
                key={customer.id}
                data-customer-row-id={customer.id}
                className={cn(
                  'group hover:bg-slate-50/50 transition-colors cursor-pointer',
                  focusedCustomerId === customer.id && 'bg-emerald-50 ring-2 ring-emerald-400/40'
                )}
              >
                {editingId === customer.id ? (
                  <>
                    <TableCell>
                      <Input
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="h-9"
                      />
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <Switch
                          checked={form.has_additional_work}
                          onCheckedChange={(checked) =>
                            setForm({ ...form, has_additional_work: checked })
                          }
                        />
                        <span>Additional work</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs">
                      <Input
                        value={form.address}
                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                        className="h-9"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={form.type}
                        onValueChange={(v) => setForm({ ...form, type: v })}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Residential">Residential</SelectItem>
                          <SelectItem value="Commercial">Commercial</SelectItem>
                          <SelectItem value="Workshop">Workshop</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={form.day}
                        onValueChange={(v) => setForm({ ...form, day: v })}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unscheduled">Unscheduled</SelectItem>
                          <SelectItem value="Monday">Monday</SelectItem>
                          <SelectItem value="Tuesday">Tuesday</SelectItem>
                          <SelectItem value="Wednesday">Wednesday</SelectItem>
                          <SelectItem value="Thursday">Thursday</SelectItem>
                          <SelectItem value="Friday">Friday</SelectItem>
                          <SelectItem value="Saturday">Saturday</SelectItem>
                          <SelectItem value="Sunday">Sunday</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right font-medium space-y-2">
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground text-left">Base</div>
                        <Input
                          type="number"
                          className="h-9 text-right"
                          value={form.cost}
                          onChange={(e) => setForm({ ...form, cost: Number(e.target.value) || 0 })}
                        />
                      </div>
                      {form.has_additional_work && (
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground text-left">Add-on</div>
                          <Input
                            type="number"
                            className="h-9 text-right text-xs"
                            value={form.additional_work_cost}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                additional_work_cost: Number(e.target.value) || 0,
                              })
                            }
                            placeholder="Add-on cost"
                          />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {customer.distance_from_shop_miles ? (
                        <span>{customer.distance_from_shop_miles.toFixed(1)} mi</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="space-y-2">
                      {error && <div className="text-xs text-red-600">{error}</div>}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-emerald-500 hover:bg-emerald-600 text-white"
                          onClick={handleSave}
                          disabled={savingId === customer.id}
                        >
                          {savingId === customer.id ? 'Saving...' : 'Save'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEdit}>
                          Cancel
                        </Button>
                      </div>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell onClick={() => beginEdit(customer)}>
                      <div className="font-medium underline decoration-dotted">{customer.name}</div>
                      {customer.has_additional_work && (
                        <Badge
                          variant="outline"
                          className="mt-1 text-xs border-amber-500 text-amber-700"
                        >
                          + Additional Work
                        </Badge>
                      )}
                      {inquiryByCustomerId && inquiryByCustomerId[customer.id] && (
                        <Badge
                          variant="outline"
                          className="mt-1 text-xs border-emerald-500 text-emerald-700"
                        >
                          <a href="/inquiries" className="hover:underline">
                            From Inquiry
                          </a>
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate" onClick={() => beginEdit(customer)}>
                      {customer.address}
                    </TableCell>
                    <TableCell onClick={() => beginEdit(customer)}>
                      <Badge variant="secondary" className={cn('font-medium', getTypeColor(customer.type))}>
                        {customer.type}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={() => beginEdit(customer)}>
                      {customer.day ? (
                        <Badge variant="secondary" className={cn('font-medium', getDayColor(customer.day))}>
                          {customer.day}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">Unscheduled</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium" onClick={() => beginEdit(customer)}>
                      ${Number(customer.cost).toFixed(2)}
                      {customer.has_additional_work && customer.additional_work_cost && (
                        <div className="text-xs text-muted-foreground">
                          +${Number(customer.additional_work_cost).toFixed(2)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {customer.distance_from_shop_miles ? (
                        <span>{customer.distance_from_shop_miles.toFixed(1)} mi</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem asChild>
                            <Link href={`/customers/${customer.id}`}>
                              <User className="mr-2 h-4 w-4" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => beginEdit(customer)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Quick Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEdit?.(customer)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Open Dialog
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onViewOnMap?.(customer)}
                          >
                            <MapPin className="mr-2 h-4 w-4" />
                            View on Map
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Phone className="mr-2 h-4 w-4" />
                            Call Customer
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Mail className="mr-2 h-4 w-4" />
                            Send Email
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => onDelete?.(customer)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
            </TableBody>
          </Table>
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground px-2">
          <div>
            Showing <span className="font-medium text-foreground">{customers.length}</span> customer
            {customers.length !== 1 && 's'}
          </div>
          <div>
            Total monthly revenue:{' '}
            <span className="font-medium text-foreground">
              $
              {customers
                .reduce((sum, c) => {
                  const base = Number(c.cost) || 0
                  const extra =
                    c.has_additional_work && c.additional_work_cost
                      ? Number(c.additional_work_cost)
                      : 0
                  return sum + base + extra
                }, 0)
                .toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
