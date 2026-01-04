'use client'

import { useEffect, useState, useRef } from 'react'
import type { Customer } from '@/types/database.types'
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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function getPhoneHref(value: string | null | undefined) {
  if (!value) return null
  const cleaned = value.replace(/[^\d+]/g, '')
  const digits = cleaned.replace(/\D/g, '')
  if (digits.length < 7) return null
  return `tel:${cleaned}`
}

function getEmailHref(value: string | null | undefined) {
  if (!value) return null
  const trimmed = value.trim()
  if (!EMAIL_PATTERN.test(trimmed)) return null
  return `mailto:${trimmed}`
}

interface CustomersTableProps {
  customers: Customer[]
  onEdit?: (customer: Customer) => void
  onDelete?: (customer: Customer) => void
  onViewOnMap?: (customer: Customer) => void
  inquiryByCustomerId?: Record<string, string>
  onInlineUpdate?: (customer: Customer) => void
  focusedCustomerId?: string | null
  selectedCustomerIds?: Set<string>
  onToggleSelect?: (customerId: string, selected: boolean) => void
  onToggleSelectAll?: (selected: boolean, ids: string[]) => void
}

export function CustomersTable({
  customers,
  onEdit,
  onDelete,
  onViewOnMap,
  inquiryByCustomerId,
  onInlineUpdate,
  focusedCustomerId,
  selectedCustomerIds,
  onToggleSelect,
  onToggleSelectAll,
}: CustomersTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    type: 'Residential',
    day: 'unscheduled',
    cost: 0,
    has_additional_work: false,
    additional_work_cost: 0,
  })
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const selectAllRef = useRef<HTMLInputElement | null>(null)

  const selectedCount = selectedCustomerIds?.size ?? 0
  const allSelected = customers.length > 0 && selectedCount === customers.length
  const isIndeterminate = selectedCount > 0 && selectedCount < customers.length

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = isIndeterminate
    }
  }, [isIndeterminate])

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
      phone: customer.phone || '',
      email: customer.email || '',
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
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
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
    if (result.geocodeFailed) {
      toast.warning('Address could not be verified. Please double-check it for mapping accuracy.')
    }
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
                <TableHead className="w-10">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    checked={allSelected}
                    onChange={(event) =>
                      onToggleSelectAll?.(
                        event.target.checked,
                        customers.map((customer) => customer.id)
                      )
                    }
                    aria-label="Select all customers"
                  />
                </TableHead>
                <TableHead className="font-semibold">Customer</TableHead>
                <TableHead className="font-semibold">Address</TableHead>
                <TableHead className="font-semibold">Contact</TableHead>
                <TableHead className="font-semibold">Type</TableHead>
                <TableHead className="font-semibold">Day</TableHead>
                <TableHead className="font-semibold text-right">Cost</TableHead>
                <TableHead className="font-semibold text-right">Distance</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => {
                const isSelected = selectedCustomerIds?.has(customer.id) ?? false

                return (
                  <TableRow
                    key={customer.id}
                    data-customer-row-id={customer.id}
                    className={cn(
                      'group hover:bg-slate-50/50 transition-colors cursor-pointer',
                      isSelected && 'bg-slate-50',
                      focusedCustomerId === customer.id && 'bg-emerald-50 ring-2 ring-emerald-400/40'
                    )}
                  >
                    <TableCell
                      className="w-10"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        checked={isSelected}
                        onChange={(event) =>
                          onToggleSelect?.(customer.id, event.target.checked)
                        }
                        onClick={(event) => event.stopPropagation()}
                        aria-label={`Select ${customer.name}`}
                      />
                    </TableCell>
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
                        <TableCell className="min-w-[200px]">
                          <div className="space-y-2">
                            <Input
                              value={form.phone}
                              onChange={(e) => setForm({ ...form, phone: e.target.value })}
                              className="h-9"
                              placeholder="Phone"
                            />
                            <Input
                              type="email"
                              value={form.email}
                              onChange={(e) => setForm({ ...form, email: e.target.value })}
                              className="h-9"
                              placeholder="Email"
                            />
                          </div>
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
                            <span className="text-muted-foreground">N/A</span>
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
                          {customer.archived_at && (
                            <Badge
                              variant="outline"
                              className="mt-1 text-xs border-slate-400 text-slate-600"
                            >
                              Archived
                            </Badge>
                          )}
                          {inquiryByCustomerId && inquiryByCustomerId[customer.id] && (
                            <Badge
                              variant="outline"
                              className="mt-1 text-xs border-emerald-500 text-emerald-700"
                            >
                              <Link href="/inquiries" className="hover:underline">
                                From Inquiry
                              </Link>
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate" onClick={() => beginEdit(customer)}>
                          {customer.address}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground" onClick={() => beginEdit(customer)}>
                          <div>{customer.phone || 'N/A'}</div>
                          {customer.email ? (
                            <div className="text-xs text-muted-foreground">{customer.email}</div>
                          ) : null}
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
                            <span className="text-muted-foreground">N/A</span>
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
                              {getPhoneHref(customer.phone) ? (
                                <DropdownMenuItem asChild>
                                  <a href={getPhoneHref(customer.phone) as string}>
                                    <Phone className="mr-2 h-4 w-4" />
                                    Call Customer
                                  </a>
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem disabled>
                                  <Phone className="mr-2 h-4 w-4" />
                                  Call Customer
                                </DropdownMenuItem>
                              )}
                              {getEmailHref(customer.email) ? (
                                <DropdownMenuItem asChild>
                                  <a href={getEmailHref(customer.email) as string}>
                                    <Mail className="mr-2 h-4 w-4" />
                                    Send Email
                                  </a>
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem disabled>
                                  <Mail className="mr-2 h-4 w-4" />
                                  Send Email
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => onDelete?.(customer)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {customer.archived_at ? 'Restore / Delete' : 'Archive / Delete'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                )
              })}
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
