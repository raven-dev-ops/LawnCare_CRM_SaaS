'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Check, X, SkipForward, MapPin } from 'lucide-react'
import { updateRouteStop } from '@/app/(dashboard)/routes/actions'
import { ServiceHistoryDialog } from '@/components/customers/ServiceHistoryDialog'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Customer {
  id?: string
  name?: string
  address?: string
  cost?: number
  has_additional_work?: boolean
}

interface RouteStop {
  id: string
  status: string
  service_notes?: string
  skip_reason?: string
  customer: Customer
}

interface RouteStopCardProps {
  stop: RouteStop
  index: number
  isExecuting: boolean
  onStatusChange?: (stopId: string, status: string, updates?: Partial<RouteStop>) => void
}

const SKIP_REASONS = [
  'Gate locked',
  'Customer not home',
  'Weather conditions',
  'Equipment issue',
  'Customer cancelled',
  'Safety concern',
  'Other',
]

export function RouteStopCard({ stop, index, isExecuting, onStatusChange }: RouteStopCardProps) {
  const router = useRouter()
  const [isExpanded, setIsExpanded] = useState(false)
  const [skipReason, setSkipReason] = useState('')
  const [serviceNotes, setServiceNotes] = useState(stop.service_notes || '')
  const [isUpdating, setIsUpdating] = useState(false)
  const [logPromptOpen, setLogPromptOpen] = useState(false)
  const [logDialogOpen, setLogDialogOpen] = useState(false)

  const isCompleted = stop.status === 'completed'
  const isSkipped = stop.status === 'skipped'
  const isPending = stop.status === 'pending'

  const handleComplete = async () => {
    setIsUpdating(true)
    const result = await updateRouteStop({
      stopId: stop.id,
      status: 'completed',
      actualArrivalTime: new Date().toISOString(),
      actualDepartureTime: new Date().toISOString(),
      serviceNotes: serviceNotes || undefined,
    })

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`${stop.customer.name} marked as completed`)
      onStatusChange?.(stop.id, 'completed', { service_notes: serviceNotes })
      router.refresh()
      if (stop.customer.id) {
        setLogPromptOpen(true)
      }
    }
    setIsUpdating(false)
  }

  const handleSkip = async () => {
    if (!skipReason) {
      toast.error('Please select a skip reason')
      return
    }

    setIsUpdating(true)
    const result = await updateRouteStop({
      stopId: stop.id,
      status: 'skipped',
      skipReason,
    })

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.warning(`${stop.customer.name} skipped: ${skipReason}`)
      onStatusChange?.(stop.id, 'skipped', { skip_reason: skipReason })
      router.refresh()
    }
    setIsUpdating(false)
    setIsExpanded(false)
  }

  const handleUndo = async () => {
    setIsUpdating(true)
    const result = await updateRouteStop({
      stopId: stop.id,
      status: 'pending',
      skipReason: undefined,
      serviceNotes: undefined,
    })

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Status reset to pending')
      onStatusChange?.(stop.id, 'pending', { skip_reason: undefined, service_notes: undefined })
      router.refresh()
    }
    setIsUpdating(false)
  }

  const defaultServiceValues = {
    service_date: new Date().toISOString().split('T')[0],
    service_type: 'Lawn Service',
    cost: stop.customer.cost ?? 0,
  }

  return (
    <>
      <Card
        className={`overflow-hidden transition-all ${
          isCompleted
            ? 'border-emerald-500 bg-emerald-50'
            : isSkipped
            ? 'border-amber-500 bg-amber-50'
            : 'border-gray-200'
        }`}
      >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
              isCompleted
                ? 'bg-emerald-500 text-white'
                : isSkipped
                ? 'bg-amber-500 text-white'
                : 'bg-blue-500 text-white'
            }`}
          >
            {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
          </div>

          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{stop.customer.name}</div>
            <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {stop.customer.address}
            </div>

            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                ${Number(stop.customer.cost || 0).toFixed(0)}
              </Badge>
              {stop.customer.has_additional_work && (
                <Badge variant="outline" className="text-xs">
                  + Work
                </Badge>
              )}
              {isCompleted && (
                <Badge className="text-xs bg-emerald-500">
                  <Check className="h-3 w-3 mr-1" />
                  Completed
                </Badge>
              )}
              {isSkipped && (
                <Badge className="text-xs bg-amber-500">
                  <SkipForward className="h-3 w-3 mr-1" />
                  Skipped
                </Badge>
              )}
            </div>

            {(isCompleted && stop.service_notes) && (
              <div className="mt-2 text-xs text-muted-foreground bg-white p-2 rounded border">
                <strong>Notes:</strong> {stop.service_notes}
              </div>
            )}

            {(isSkipped && stop.skip_reason) && (
              <div className="mt-2 text-xs text-amber-700 bg-amber-100 p-2 rounded border border-amber-300">
                <strong>Skipped:</strong> {stop.skip_reason}
              </div>
            )}

            {isExecuting && isPending && (
              <>
                {!isExpanded ? (
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      onClick={handleComplete}
                      disabled={isUpdating}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-xs h-8"
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Complete
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsExpanded(true)}
                      className="flex-1 text-xs h-8"
                    >
                      <SkipForward className="h-3 w-3 mr-1" />
                      Skip
                    </Button>
                  </div>
                ) : (
                  <div className="mt-3 space-y-2 p-3 bg-white rounded border">
                    <div className="text-xs font-medium">Skip this stop?</div>
                    <Select value={skipReason} onValueChange={setSkipReason}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select reason" />
                      </SelectTrigger>
                      <SelectContent>
                        {SKIP_REASONS.map((reason) => (
                          <SelectItem key={reason} value={reason} className="text-xs">
                            {reason}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleSkip}
                        disabled={!skipReason || isUpdating}
                        className="flex-1 text-xs h-7"
                      >
                        Confirm Skip
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIsExpanded(false)
                          setSkipReason('')
                        }}
                        className="flex-1 text-xs h-7"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {!isExpanded && (
                  <div className="mt-2">
                    <Textarea
                      placeholder="Service notes (optional)"
                      value={serviceNotes}
                      onChange={(e) => setServiceNotes(e.target.value)}
                      className="text-xs h-16"
                    />
                  </div>
                )}
              </>
            )}

            {isExecuting && (isCompleted || isSkipped) && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleUndo}
                disabled={isUpdating}
                className="mt-3 text-xs h-7"
              >
                <X className="h-3 w-3 mr-1" />
                Undo
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>

    {stop.customer.id && (
      <>
        <AlertDialog open={logPromptOpen} onOpenChange={setLogPromptOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Log service history?</AlertDialogTitle>
              <AlertDialogDescription>
                Add a service history entry for {stop.customer.name} now or skip it.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Not now</AlertDialogCancel>
              <AlertDialogAction
                onClick={(event) => {
                  event.preventDefault()
                  setLogPromptOpen(false)
                  setLogDialogOpen(true)
                }}
                className="bg-emerald-500 hover:bg-emerald-600"
              >
                Log service
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <ServiceHistoryDialog
          open={logDialogOpen}
          onOpenChange={setLogDialogOpen}
          customerId={stop.customer.id}
          routeStopId={stop.id}
          defaultValues={defaultServiceValues}
        />
      </>
    )}
  </>
  )
}
