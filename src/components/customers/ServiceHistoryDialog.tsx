'use client'

import { useEffect, useMemo, useState } from 'react'
import NextImage from 'next/image'
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
import { createClient } from '@/lib/supabase/client'

interface ServiceHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerId: string
  entry?: ServiceHistory | null
  routeStopId?: string | null
  defaultValues?: Partial<ServiceHistory>
  onSaved?: (entry: ServiceHistory) => void
}

const PHOTO_BUCKET = 'service-history-photos'
const MAX_PHOTO_BYTES = 5 * 1024 * 1024
const MAX_PHOTO_DIMENSION = 1600
const SIGNED_URL_TTL = 60 * 60

type PhotoKind = 'before' | 'after'

type PhotoItem = {
  path: string
  url: string
}

type PendingPhoto = {
  id: string
  file: File
  previewUrl: string
}

function splitPhotoPaths(paths: string[]) {
  const before: string[] = []
  const after: string[] = []

  paths.forEach((path) => {
    if (path.includes('/before/')) {
      before.push(path)
      return
    }
    if (path.includes('/after/')) {
      after.push(path)
      return
    }
    after.push(path)
  })

  return { before, after }
}

function createPhotoId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    img.src = url
  })
}

async function compressPhoto(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) {
    return file
  }

  const image = await loadImage(file)
  const maxSide = Math.max(image.width, image.height)
  const scale = Math.min(1, MAX_PHOTO_DIMENSION / maxSide)

  if (scale === 1 && file.size <= MAX_PHOTO_BYTES) {
    return file
  }

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.width * scale))
  canvas.height = Math.max(1, Math.round(image.height * scale))

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return file
  }

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height)

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.82)
  )

  if (!blob) {
    return file
  }

  return new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.jpg', {
    type: 'image/jpeg',
  })
}

type SupabaseClient = ReturnType<typeof createClient>

async function createSignedPhotoItems(
  supabase: SupabaseClient,
  paths: string[]
): Promise<PhotoItem[]> {
  if (paths.length === 0) {
    return []
  }

  const results = await Promise.all(
    paths.map(async (path) => {
      const { data, error } = await supabase.storage
        .from(PHOTO_BUCKET)
        .createSignedUrl(path, SIGNED_URL_TTL)

      if (error || !data?.signedUrl) {
        return null
      }

      return { path, url: data.signedUrl }
    })
  )

  return results.filter((item): item is PhotoItem => Boolean(item))
}

function buildPhotoPath(customerId: string, kind: PhotoKind, filename: string) {
  const safeName = sanitizeFileName(filename)
  return `${customerId}/${kind}/${Date.now()}-${createPhotoId()}-${safeName}`
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
  const supabase = useMemo(() => createClient(), [])
  const [beforePhotos, setBeforePhotos] = useState<PhotoItem[]>([])
  const [afterPhotos, setAfterPhotos] = useState<PhotoItem[]>([])
  const [beforeUploads, setBeforeUploads] = useState<PendingPhoto[]>([])
  const [afterUploads, setAfterUploads] = useState<PendingPhoto[]>([])
  const [removedPaths, setRemovedPaths] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)

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

    setBeforeUploads([])
    setAfterUploads([])
    setRemovedPaths([])

    const seedPhotos = Array.isArray(seed.photos) ? seed.photos : []
    if (seedPhotos.length === 0) {
      setBeforePhotos([])
      setAfterPhotos([])
      return
    }

    const { before, after } = splitPhotoPaths(seedPhotos)
    let cancelled = false

    const loadPhotos = async () => {
      const [beforeItems, afterItems] = await Promise.all([
        createSignedPhotoItems(supabase, before),
        createSignedPhotoItems(supabase, after),
      ])

      if (cancelled) return

      setBeforePhotos(beforeItems)
      setAfterPhotos(afterItems)
    }

    loadPhotos().catch((error) => {
      if (cancelled) return
      console.error('Photo load failed:', error)
      toast.error('Failed to load photos.')
    })

    return () => {
      cancelled = true
    }
  }, [open, entry, defaultValues, supabase])

  const preparePhoto = async (file: File): Promise<PendingPhoto | null> => {
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are supported.')
      return null
    }

    let processed = file

    try {
      processed = await compressPhoto(file)
    } catch (error) {
      console.error('Image compression failed:', error)
    }

    if (processed.size > MAX_PHOTO_BYTES) {
      toast.error('Photo must be 5MB or less after compression.')
      return null
    }

    return {
      id: createPhotoId(),
      file: processed,
      previewUrl: URL.createObjectURL(processed),
    }
  }

  const handleAddPhotos = async (
    event: React.ChangeEvent<HTMLInputElement>,
    kind: PhotoKind
  ) => {
    const files = event.target.files
    event.target.value = ''

    if (!files || files.length === 0) return

    const prepared = await Promise.all(
      Array.from(files).map((file) => preparePhoto(file))
    )
    const nextUploads = prepared.filter(Boolean) as PendingPhoto[]

    if (nextUploads.length === 0) return

    if (kind === 'before') {
      setBeforeUploads((prev) => [...prev, ...nextUploads])
    } else {
      setAfterUploads((prev) => [...prev, ...nextUploads])
    }
  }

  const handleRemoveExisting = (path: string, kind: PhotoKind) => {
    if (kind === 'before') {
      setBeforePhotos((prev) => prev.filter((photo) => photo.path !== path))
    } else {
      setAfterPhotos((prev) => prev.filter((photo) => photo.path !== path))
    }

    setRemovedPaths((prev) => [...prev, path])
  }

  const handleRemoveUpload = (id: string, kind: PhotoKind) => {
    const removeFrom = kind === 'before' ? beforeUploads : afterUploads
    const target = removeFrom.find((item) => item.id === id)
    if (target) {
      URL.revokeObjectURL(target.previewUrl)
    }

    if (kind === 'before') {
      setBeforeUploads((prev) => prev.filter((item) => item.id !== id))
    } else {
      setAfterUploads((prev) => prev.filter((item) => item.id !== id))
    }
  }

  const uploadPendingPhotos = async (items: PendingPhoto[], kind: PhotoKind) => {
    if (items.length === 0) return []

    const paths: string[] = []

    for (const item of items) {
      const path = buildPhotoPath(customerId, kind, item.file.name)
      const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, item.file, {
        contentType: item.file.type,
        upsert: false,
      })

      if (error) {
        throw error
      }

      paths.push(path)
    }

    return paths
  }

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
    setIsUploading(true)

    let uploadedPaths: string[] = []

    try {
      const beforePaths = await uploadPendingPhotos(beforeUploads, 'before')
      const afterPaths = await uploadPendingPhotos(afterUploads, 'after')
      uploadedPaths = [...beforePaths, ...afterPaths]
    } catch (error) {
      console.error('Photo upload failed:', error)
      toast.error('Failed to upload photos.')
      setIsSaving(false)
      setIsUploading(false)
      return
    }

    setIsUploading(false)

    const retainedPaths = [...beforePhotos, ...afterPhotos]
      .map((photo) => photo.path)
      .filter((path) => !removedPaths.includes(path))
    const photoPaths = [...retainedPaths, ...uploadedPaths]

    const payload = {
      customerId,
      serviceDate,
      serviceType: serviceType.trim(),
      cost: parsedCost,
      durationMinutes: parsedDuration,
      notes: notes.trim() ? notes.trim() : null,
      customerRating: parsedRating,
      photos: photoPaths.length > 0 ? photoPaths : null,
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
      if (uploadedPaths.length > 0) {
        await supabase.storage.from(PHOTO_BUCKET).remove(uploadedPaths)
      }
      toast.error(result.error)
      return
    }

    if (removedPaths.length > 0) {
      const { error } = await supabase.storage.from(PHOTO_BUCKET).remove(removedPaths)
      if (error) {
        console.error('Failed to remove photos:', error)
      }
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
          <div className="grid gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Before photos</label>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => handleAddPhotos(event, 'before')}
                disabled={isSaving || isUploading}
              />
              <PhotoGrid
                photos={beforePhotos}
                uploads={beforeUploads}
                onRemovePhoto={(path) => handleRemoveExisting(path, 'before')}
                onRemoveUpload={(id) => handleRemoveUpload(id, 'before')}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">After photos</label>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => handleAddPhotos(event, 'after')}
                disabled={isSaving || isUploading}
              />
              <PhotoGrid
                photos={afterPhotos}
                uploads={afterUploads}
                onRemovePhoto={(path) => handleRemoveExisting(path, 'after')}
                onRemoveUpload={(id) => handleRemoveUpload(id, 'after')}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Photos are resized to {MAX_PHOTO_DIMENSION}px max and must be under 5MB.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-emerald-500 hover:bg-emerald-600"
            onClick={handleSave}
            disabled={isSaving || isUploading}
          >
            {isSaving || isUploading ? 'Saving...' : entry ? 'Save changes' : 'Add entry'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PhotoGrid({
  photos,
  uploads,
  onRemovePhoto,
  onRemoveUpload,
}: {
  photos: PhotoItem[]
  uploads: PendingPhoto[]
  onRemovePhoto: (path: string) => void
  onRemoveUpload: (id: string) => void
}) {
  if (photos.length === 0 && uploads.length === 0) {
    return null
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {photos.map((photo) => (
        <div key={photo.path} className="group relative h-24 overflow-hidden rounded border">
          <NextImage
            src={photo.url}
            alt="Service photo"
            fill
            sizes="96px"
            className="object-cover"
            unoptimized
          />
          <button
            type="button"
            onClick={() => onRemovePhoto(photo.path)}
            className="absolute right-1 top-1 rounded bg-white/90 px-1.5 py-0.5 text-[10px] text-slate-700 opacity-0 transition group-hover:opacity-100"
          >
            Remove
          </button>
        </div>
      ))}
      {uploads.map((photo) => (
        <div key={photo.id} className="group relative h-24 overflow-hidden rounded border">
          <NextImage
            src={photo.previewUrl}
            alt="New photo"
            fill
            sizes="96px"
            className="object-cover"
            unoptimized
          />
          <button
            type="button"
            onClick={() => onRemoveUpload(photo.id)}
            className="absolute right-1 top-1 rounded bg-white/90 px-1.5 py-0.5 text-[10px] text-slate-700 opacity-0 transition group-hover:opacity-100"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  )
}
