'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useRole } from '@/components/auth/RoleProvider'
import { Pencil, Trash2, Plus } from 'lucide-react'
import type { ServiceHistory } from '@/types/database.types'
import { ServiceHistoryDialog } from '@/components/customers/ServiceHistoryDialog'
import { deleteServiceHistory } from '@/app/(dashboard)/service-history/actions'
import { toast } from 'sonner'

interface ServiceHistoryPanelProps {
  customerId: string
  entries: ServiceHistory[]
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Unknown'
  return new Date(value).toLocaleDateString()
}

function formatCurrency(value: number | null | undefined) {
  const amount = Number(value || 0)
  return `$${amount.toFixed(2)}`
}

export function ServiceHistoryPanel({ customerId, entries }: ServiceHistoryPanelProps) {
  const [items, setItems] = useState<ServiceHistory[]>(entries)
  const { isAdmin } = useRole()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<ServiceHistory | null>(null)

  useEffect(() => {
    setItems(entries)
  }, [entries])

  const handleSaved = (entry: ServiceHistory) => {
    setItems((prev) => {
      const exists = prev.find((item) => item.id === entry.id)
      if (exists) {
        return prev.map((item) => (item.id === entry.id ? entry : item))
      }
      return [entry, ...prev]
    })
  }

  const handleDelete = async (entryId: string) => {
    if (!isAdmin) {
      toast.error('Admin access required to delete service history.')
      return
    }
    const result = await deleteServiceHistory(entryId, customerId)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Service history deleted')
    setItems((prev) => prev.filter((item) => item.id !== entryId))
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Service History</CardTitle>
          <CardDescription>Most recent completed services</CardDescription>
        </div>
        <Button
          size="sm"
          className="bg-emerald-500 hover:bg-emerald-600"
          onClick={() => {
            setEditingEntry(null)
            setDialogOpen(true)
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Entry
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No service history yet.</p>
        ) : (
          <div className="space-y-3">
            {items.map((entry) => (
              <div key={entry.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="font-medium">{entry.service_type}</div>
                  <div className="text-muted-foreground">{formatDate(entry.service_date)}</div>
                </div>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>Cost: {formatCurrency(entry.cost)}</span>
                  <span>Duration: {entry.duration_minutes ?? 'N/A'} min</span>
                  {entry.customer_rating && (
                    <Badge variant="secondary">Rating: {entry.customer_rating}</Badge>
                  )}
                  {entry.photos && entry.photos.length > 0 && (
                    <Badge variant="secondary">Photos: {entry.photos.length}</Badge>
                  )}
                </div>
                {entry.notes && (
                  <p className="mt-2 text-xs text-muted-foreground">{entry.notes}</p>
                )}
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingEntry(entry)
                      setDialogOpen(true)
                    }}
                  >
                    <Pencil className="mr-2 h-3 w-3" />
                    Edit
                  </Button>
                  {isAdmin ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-200 text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(entry.id)}
                    >
                      <Trash2 className="mr-2 h-3 w-3" />
                      Delete
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="border-slate-200 text-slate-400" disabled>
                      Delete (admin only)
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <ServiceHistoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        customerId={customerId}
        entry={editingEntry}
        onSaved={handleSaved}
      />
    </Card>
  )
}
