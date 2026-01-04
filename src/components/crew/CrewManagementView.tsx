'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CrewMember } from '@/types/database.types'
import { createCrewMember, updateCrewMember, deleteCrewMember } from '@/app/(dashboard)/crew/actions'
import { toast } from 'sonner'

interface CrewManagementViewProps {
  initialCrew: CrewMember[]
}

const ROLE_OPTIONS = [
  { value: 'crew', label: 'Crew' },
  { value: 'lead', label: 'Lead' },
  { value: 'manager', label: 'Manager' },
] as const

type RoleOption = typeof ROLE_OPTIONS[number]['value']

export function CrewManagementView({ initialCrew }: CrewManagementViewProps) {
  const [crew, setCrew] = useState<CrewMember[]>(initialCrew)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<CrewMember | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<RoleOption>('crew')
  const [active, setActive] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setCrew(initialCrew)
  }, [initialCrew])

  useEffect(() => {
    if (!dialogOpen) return

    if (editingMember) {
      setName(editingMember.name)
      setEmail(editingMember.email || '')
      setPhone(editingMember.phone || '')
      setRole((editingMember.role as RoleOption) || 'crew')
      setActive(editingMember.active)
      return
    }

    setName('')
    setEmail('')
    setPhone('')
    setRole('crew')
    setActive(true)
  }, [dialogOpen, editingMember])

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Name is required.')
      return
    }

    setIsSaving(true)

    const payload = {
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      role,
      active,
    }

    const result = editingMember
      ? await updateCrewMember({ id: editingMember.id, ...payload })
      : await createCrewMember(payload)

    setIsSaving(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    if (result.member) {
      setCrew((prev) => {
        const existing = prev.find((member) => member.id === result.member.id)
        if (existing) {
          return prev.map((member) => (member.id === result.member.id ? result.member : member))
        }
        return [result.member, ...prev]
      })
    }

    toast.success(editingMember ? 'Crew member updated.' : 'Crew member added.')
    setDialogOpen(false)
    setEditingMember(null)
  }

  const handleDelete = async (member: CrewMember) => {
    const confirmed = window.confirm(`Remove ${member.name} from crew?`)
    if (!confirmed) return

    const result = await deleteCrewMember(member.id)
    if (result.error) {
      toast.error(result.error)
      return
    }

    setCrew((prev) => prev.filter((item) => item.id !== member.id))
    toast.success('Crew member removed.')
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-white px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Crew</h1>
            <p className="text-muted-foreground">Manage your drivers and crew roster.</p>
          </div>
          <Button
            className="bg-emerald-500 hover:bg-emerald-600"
            onClick={() => {
              setEditingMember(null)
              setDialogOpen(true)
            }}
          >
            Add crew member
          </Button>
        </div>
      </div>

      <div className="flex-1 bg-slate-50 p-8">
        <div className="mx-auto max-w-4xl space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Roster</CardTitle>
              <CardDescription>Assign routes to available crew members.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {crew.length === 0 ? (
                <p className="text-sm text-muted-foreground">No crew members yet.</p>
              ) : (
                crew.map((member) => (
                  <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-3">
                    <div>
                      <div className="font-medium">{member.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {member.role || 'crew'}
                        {member.email ? ` ? ${member.email}` : ''}
                        {member.phone ? ` ? ${member.phone}` : ''}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className={member.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}>
                        {member.active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingMember(member)
                          setDialogOpen(true)
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-200 text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(member)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMember ? 'Edit crew member' : 'Add crew member'}</DialogTitle>
            <DialogDescription>Set role and contact details for routing.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select value={role} onValueChange={(value) => setRole(value as RoleOption)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone</label>
              <Input value={phone} onChange={(event) => setPhone(event.target.value)} />
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <div>
                <div className="text-sm font-medium">Active</div>
                <div className="text-xs text-muted-foreground">Available for assignment</div>
              </div>
              <Switch checked={active} onCheckedChange={setActive} />
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
              {isSaving ? 'Saving...' : editingMember ? 'Save changes' : 'Add crew member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
