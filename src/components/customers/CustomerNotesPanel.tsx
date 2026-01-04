'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useRole } from '@/components/auth/RoleProvider'
import { createCustomerNote, deleteCustomerNote } from '@/app/(dashboard)/customers/notes/actions'
import type { CustomerNote } from '@/types/database.types'

const CHANNEL_OPTIONS = [
  { value: 'note', label: 'Note' },
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'in_person', label: 'In person' },
  { value: 'other', label: 'Other' },
]

function formatDateTime(value: string) {
  return new Date(value).toLocaleString()
}

function formatUserId(value: string | null) {
  if (!value) return 'Unknown'
  return `${value.slice(0, 6)}...${value.slice(-4)}`
}

interface CustomerNotesPanelProps {
  customerId: string
  notes: CustomerNote[]
}

export function CustomerNotesPanel({ customerId, notes }: CustomerNotesPanelProps) {
  const [items, setItems] = useState<CustomerNote[]>(notes)
  const [channel, setChannel] = useState('note')
  const [message, setMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const { isAdmin } = useRole()

  useEffect(() => {
    setItems(notes)
  }, [notes])

  const handleAdd = async () => {
    const trimmed = message.trim()
    if (!trimmed) {
      toast.error('Message is required.')
      return
    }

    setIsSaving(true)
    const result = await createCustomerNote({
      customerId,
      channel,
      message: trimmed,
    })
    setIsSaving(false)

    if (result.error || !result.note) {
      toast.error(result.error || 'Failed to add note.')
      return
    }

    setItems((prev) => [result.note, ...prev])
    setMessage('')
    setChannel('note')
    toast.success('Note added')
  }

  const handleDelete = async (noteId: string) => {
    if (!isAdmin) {
      toast.error('Admin access required to delete notes.')
      return
    }

    const result = await deleteCustomerNote(noteId, customerId)
    if (result.error) {
      toast.error(result.error)
      return
    }

    setItems((prev) => prev.filter((item) => item.id !== noteId))
    toast.success('Note deleted')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notes</CardTitle>
        <CardDescription>Customer communication log and internal notes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="note-channel">Channel</Label>
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger id="note-channel" className="w-full">
              <SelectValue placeholder="Select channel" />
            </SelectTrigger>
            <SelectContent>
              {CHANNEL_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="note-message">Message</Label>
          <Textarea
            id="note-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Add a note about the customer or communication."
            rows={4}
          />
        </div>
        <div className="flex items-center justify-end">
          <Button
            type="button"
            className="bg-emerald-500 hover:bg-emerald-600"
            onClick={handleAdd}
            disabled={isSaving}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add note
          </Button>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notes yet.</p>
        ) : (
          <div className="space-y-3">
            {items.map((note) => (
              <div key={note.id} className="rounded-lg border p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {CHANNEL_OPTIONS.find((option) => option.value === note.channel)?.label ?? 'Note'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(note.created_at)}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    By {formatUserId(note.created_by)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-700">{note.message}</p>
                <div className="mt-3 flex justify-end">
                  {isAdmin ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-200 text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(note.id)}
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
    </Card>
  )
}
