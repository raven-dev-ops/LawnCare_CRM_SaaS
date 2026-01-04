'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useRole } from '@/components/auth/RoleProvider'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { ArrowLeft, Navigation, MapPin, Clock, DollarSign, Fuel, Play, CheckCircle, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { RoutePolyline } from './RoutePolyline'
import { GOOGLE_DIRECTIONS_MAX_WAYPOINTS } from '@/lib/routes'
import { RouteStopCard, type Customer, type RouteStop } from './RouteStopCard'
import { startRoute, completeRoute, deleteRoute, addStopToRoute, assignRouteDriver } from '@/app/(dashboard)/routes/actions'
import { toast } from 'sonner'
import { GOOGLE_MAPS_BROWSER_API_KEY } from '@/lib/config'

interface ShopLocation {
  lat: number
  lng: number
  address: string
}


interface Route {
  id: string
  name?: string | null
  day_of_week: string
  date: string
  status: string
  driver_id?: string | null
  driver_name?: string | null
  start_time?: string | null
  end_time?: string | null
  total_distance_miles?: number
  total_duration_minutes?: number
  estimated_fuel_cost?: number
  average_duration_minutes?: number | null
  route_stops?: RouteStop[]
}

interface RouteDetailViewProps {
  route: Route
  customers: Customer[]
  avgCompletedMinutes?: number
  shopLocation: ShopLocation
  crewMembers: Array<{ id: string; name: string; active?: boolean }>
}

export function RouteDetailView({ route, customers, avgCompletedMinutes = 0, shopLocation, crewMembers }: RouteDetailViewProps) {
  const apiKey = GOOGLE_MAPS_BROWSER_API_KEY
  const router = useRouter()
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { isAdmin } = useRole()
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addSearch, setAddSearch] = useState('')
  const [addingCustomerId, setAddingCustomerId] = useState<string | null>(null)
  const [localStatus, setLocalStatus] = useState(route.status)
  const [localStartTime, setLocalStartTime] = useState<string | null>(route.start_time || null)
  const [isAutoCompleting, setIsAutoCompleting] = useState(false)
  const [isUpdatingDriver, setIsUpdatingDriver] = useState(false)
  const [selectedDriverId, setSelectedDriverId] = useState(route.driver_id ?? 'unassigned')

  const shopLocationPoint = useMemo(
    () => ({ lat: shopLocation.lat, lng: shopLocation.lng }),
    [shopLocation.lat, shopLocation.lng]
  )

  useEffect(() => {
    setSelectedDriverId(route.driver_id ?? 'unassigned')
  }, [route.driver_id])

  const [localStops, setLocalStops] = useState<RouteStop[]>(route.route_stops || [])

  const stops = useMemo(
    () => localStops,
    [localStops]
  )
  const stopCount = stops.length
  const completedCount = stops.filter((s) => s.status === 'completed').length
  const skippedCount = stops.filter((s) => s.status === 'skipped').length
  const totalRevenue = stops.reduce((sum: number, stop) =>
    sum + Number(stop.customer.cost || 0) + Number(stop.customer.additional_work_cost || 0), 0
  )

  const isPlanned = localStatus === 'planned'
  const isInProgress = localStatus === 'in_progress'
  const isCompleted = localStatus === 'completed'
  const [elapsed, setElapsed] = useState<number | null>(null)

  useEffect(() => {
    if (!isInProgress) {
      setElapsed(null)
      return
    }

    const start = localStartTime ? new Date(localStartTime).getTime() : Date.now()
    const tick = () => {
      setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [isInProgress, localStartTime])
  const availableCustomers = useMemo(() => {
    const inRouteIds = new Set(stops.map((s) => s.customer?.id).filter(Boolean) as string[])
    const filtered = customers.filter((c) => !c.id || !inRouteIds.has(c.id))
    if (!addSearch) return filtered
    const query = addSearch.toLowerCase()
    return filtered.filter(
      (c) =>
        (c.name || '').toLowerCase().includes(query) ||
        (c.address || '').toLowerCase().includes(query)
    )
  }, [customers, stops, addSearch])

  const handleDriverChange = async (value: string) => {
    setSelectedDriverId(value)
    setIsUpdatingDriver(true)

    const driverId = value === 'unassigned' ? null : value
    const result = await assignRouteDriver({ routeId: route.id, driverId })

    setIsUpdatingDriver(false)

    if ('error' in result) {
      toast.error(result.error)
      setSelectedDriverId(route.driver_id ?? 'unassigned')
      return
    }

    toast.success(driverId ? 'Driver assigned' : 'Driver cleared')
    router.refresh()
  }

  const handleStopStatusChange = (stopId: string, status: string, updates?: Partial<RouteStop>) => {
    setLocalStops((prev) =>
      prev.map((s) => (s.id === stopId ? { ...s, status, ...updates } : s))
    )

    const nextStatus = status
    if (nextStatus === 'completed' || nextStatus === 'skipped') {
      const nextStops = localStops.map((s) => (s.id === stopId ? { ...s, status: nextStatus } : s))
      const remaining = nextStops.filter(
        (s) => s.status !== 'completed' && s.status !== 'skipped'
      ).length
      if (remaining === 0) {
        // Auto-complete the route when all stops are done
        if (!isAutoCompleting && localStatus !== 'completed') {
          setIsAutoCompleting(true)
          completeRoute(route.id)
            .then((result) => {
              if ('error' in result) {
                toast.error(result.error)
                return
              }
              if ('alreadyCompleted' in result && result.alreadyCompleted) {
                setLocalStatus('completed')
                setElapsed(null)
                router.refresh()
                return
              }
              setLocalStatus('completed')
              setElapsed(null)
              router.refresh()
            })
            .catch((err) => {
              console.error('Auto complete route failed:', err)
              toast.error('Failed to complete route')
            })
            .finally(() => setIsAutoCompleting(false))
        }
      }
    }
  }

  const handleStartRoute = async () => {
    try {
      setIsStarting(true)
      const result = await startRoute(route.id)
      if ('error' in result) {
        toast.error(result.error)
      } else {
        toast.success('Route started! Timer running.')
        setLocalStatus('in_progress')
        const nowIso = new Date().toISOString()
        setLocalStartTime(result.route?.start_time || nowIso)
        setElapsed(0)
        router.refresh()
      }
    } catch (err) {
      console.error('Start route failed:', err)
      toast.error('Failed to start route')
    } finally {
      setIsStarting(false)
    }
  }

  const handleCompleteRoute = async () => {
    const pendingCount = stops.filter((s) => s.status === 'pending').length
    if (pendingCount > 0) {
      const message = `There are ${pendingCount} pending stops. Complete route anyway?`
      const confirmed = window.confirm(message)
      if (!confirmed) {
        return
      }
    }

    setIsCompleting(true)
    const result = await completeRoute(route.id)
    if ('error' in result) {
      toast.error(result.error)
    } else if ('alreadyCompleted' in result && result.alreadyCompleted) {
      toast.message('Route already completed.')
      setLocalStatus('completed')
      setElapsed(null)
      router.refresh()
    } else {
      toast.success('Route completed! Great work!')
      setLocalStatus('completed')
      setElapsed(null)
      router.refresh()
    }
    setIsCompleting(false)
  }

  const handleDeleteRoute = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this route? This action cannot be undone.'
    )
    if (!confirmed) return

    setIsDeleting(true)
    const result = await deleteRoute(route.id)
    if ('error' in result) {
      toast.error(result.error)
      setIsDeleting(false)
    } else {
      toast.success('Route deleted successfully')
      router.push('/routes')
    }
  }

  const handleAddStop = async (customerId: string) => {
    setAddingCustomerId(customerId)
    const result = await addStopToRoute({ routeId: route.id, customerId })
    if ('error' in result) {
      toast.error(result.error)
    } else {
      toast.success('Stop added and route re-optimized')
      if (result.warning) {
        toast.warning(result.warning)
      }
      setAddDialogOpen(false)
      router.refresh()
    }
    setAddingCustomerId(null)
  }

  // Fetch directions when component mounts
  useEffect(() => {
    if (!apiKey || stops.length === 0) return

    if (stops.length > GOOGLE_DIRECTIONS_MAX_WAYPOINTS) {
      setDirections(null)
      return
    }

    const fetchDirections = async () => {
      // Build waypoints array
      const waypoints: google.maps.DirectionsWaypoint[] = stops
        .filter((stop) => stop.customer.latitude && stop.customer.longitude)
        .map((stop) => ({
          location: { lat: stop.customer.latitude!, lng: stop.customer.longitude! },
          stopover: true
        }))

      if (waypoints.length === 0) return

      const directionsService = new google.maps.DirectionsService()

      try {
        const result = await directionsService.route({
          origin: shopLocationPoint,
          destination: shopLocationPoint,
          waypoints: waypoints,
          optimizeWaypoints: false, // Already optimized in database
          travelMode: google.maps.TravelMode.DRIVING
        })

        setDirections(result)
      } catch (error) {
        console.error('Error fetching directions:', error)
      }
    }

    fetchDirections()
  }, [apiKey, stops, shopLocationPoint])


  return (
    <div className="flex min-h-full flex-col lg:flex-row">
      {/* Sidebar */}
      <div className="w-full border-b bg-white lg:w-96 lg:border-b-0 lg:border-r lg:overflow-y-auto">
        <div className="p-6 border-b">
          <Button variant="ghost" size="sm" className="mb-4" asChild>
            <Link href="/routes">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Routes
            </Link>
          </Button>

          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold">
              {route.name || `${route.day_of_week} Route`}
            </h1>
            <Badge
              className={cn('capitalize', {
                'bg-blue-100 text-blue-700': isPlanned,
                'bg-amber-100 text-amber-700': isInProgress,
                'bg-emerald-100 text-emerald-700': isCompleted,
              })}
            >
              {route.status}
            </Badge>
          </div>

          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{new Date(route.date).toLocaleDateString()}</span>
            {isInProgress && elapsed != null && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700 font-semibold text-xs">
                Time {Math.floor(elapsed / 60)
                  .toString()
                  .padStart(2, '0')}
                :{(elapsed % 60).toString().padStart(2, '0')}
              </span>
            )}
          </div>

          <div className="mt-4 space-y-2">
            <div className="text-xs font-semibold uppercase text-muted-foreground">
              Assigned driver
            </div>
            {crewMembers.length > 0 ? (
              <Select
                value={selectedDriverId}
                onValueChange={handleDriverChange}
                disabled={isUpdatingDriver}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {crewMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-sm text-muted-foreground">No crew members yet.</div>
            )}
          </div>

          {/* Route Controls */}
          <div className="flex flex-col gap-2 mt-4 sm:flex-row">
            {!isCompleted && (
              <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1">
                    + Add Stop
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add stop to route</DialogTitle>
                    <DialogDescription>
                      Select a customer to add. The entire route will be re-optimized automatically.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <Input
                      placeholder="Search by name or address"
                      value={addSearch}
                      onChange={(e) => setAddSearch(e.target.value)}
                    />
                    <div className="max-h-[360px] overflow-y-auto space-y-2">
                      {availableCustomers.map((customer) => (
                        <Card key={customer.id} className="shadow-none border">
                          <CardContent className="p-3 flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{customer.name}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {customer.address}
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                <span>${Number(customer.cost || 0).toFixed(0)}</span>
                                {customer.has_additional_work && (
                                  <Badge variant="outline" className="text-[10px]">
                                    + Work ${Number(customer.additional_work_cost || 0).toFixed(0)}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => {
                                if (!customer.id) return
                                handleAddStop(customer.id)
                              }}
                              disabled={!customer.id || addingCustomerId === customer.id}
                            >
                              {addingCustomerId === customer.id ? 'Adding...' : 'Add'}
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                      {availableCustomers.length === 0 && (
                        <div className="text-center text-sm text-muted-foreground py-8">
                          No available customers to add.
                        </div>
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                      Close
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            {isPlanned && (
              <>
                <Button
                  onClick={handleStartRoute}
                  disabled={isStarting}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                  size="sm"
                >
                  <Play className="mr-2 h-4 w-4" />
                  {isStarting ? 'Starting...' : 'Start Route'}
                </Button>
                {isAdmin ? (
                  <Button
                    onClick={handleDeleteRoute}
                    disabled={isDeleting}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </>
            )}
            {isInProgress && (
              <>
                <Button
                  onClick={handleCompleteRoute}
                  disabled={isCompleting}
                  className="flex-1 bg-red-500 hover:bg-red-600"
                  size="sm"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {isCompleting ? 'Stopping...' : 'Stop Route'}
                </Button>
              </>
            )}
            {isCompleted && (
              <div className="w-full flex flex-col gap-2">
                <div className="text-center py-2 px-4 bg-emerald-50 border border-emerald-200 rounded text-emerald-700 text-sm font-medium">
                  Route Completed
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href="/routes">Back to routes</Link>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="p-6 border-b space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <MapPin className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stopCount}</div>
              <div className="text-xs text-muted-foreground">Total Stops</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Navigation className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{Number(route.total_distance_miles || 0).toFixed(1)} mi</div>
              <div className="text-xs text-muted-foreground">Total Distance</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {elapsed != null
                  ? `${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, '0')}`
                  : `${route.total_duration_minutes || 0} min`}
              </div>
              <div className="text-xs text-muted-foreground">
                {isInProgress && elapsed != null ? 'Elapsed Time' : 'Estimated Time'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {localStatus === 'in_progress' && elapsed != null
                  ? `${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, '0')}`
                  : localStatus === 'completed' && route.start_time && route.end_time
                  ? `${Math.max(0, Math.round((new Date(route.end_time).getTime() - new Date(route.start_time).getTime()) / 60000))} min`
                  : 'Not started'}
              </div>
              <div className="text-xs text-muted-foreground">
                Route Timer - Avg: {avgCompletedMinutes != null ? `${avgCompletedMinutes.toFixed(0)} min` : 'n/a'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">Total Revenue</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
              <Fuel className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">${Number(route.estimated_fuel_cost || 0).toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">Fuel Cost</div>
            </div>
          </div>
        </div>

        {/* Stops List */}
        <div className="p-6">
          <h3 className="font-semibold mb-4">
            Route Stops ({completedCount}/{stopCount} Completed)
            {skippedCount > 0 && (
              <span className="text-amber-600 ml-2">({skippedCount} Skipped)</span>
            )}
          </h3>
          <div className="space-y-2">
            {stops.filter((s) => s.status !== 'completed' && s.status !== 'skipped').map((stop, index: number) => (
              <RouteStopCard
                key={stop.id}
                stop={stop}
                index={index}
                isExecuting={isInProgress}
                onStatusChange={handleStopStatusChange}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="relative h-[45vh] w-full lg:h-auto lg:flex-1">
        {apiKey ? (
          <APIProvider apiKey={apiKey}>
            <Map
              mapId="route-detail-map"
              defaultCenter={shopLocationPoint}
              defaultZoom={11}
              gestureHandling="greedy"
              disableDefaultUI={false}
              className="h-full w-full"
            >
              {/* Shop marker */}
              <AdvancedMarker position={shopLocationPoint}>
                <Pin background="#10b981" borderColor="#ffffff" glyphColor="#ffffff" scale={1.2}>
                  <div className="text-xs font-bold">SHOP</div>
                </Pin>
              </AdvancedMarker>

              {/* Route polyline */}
              {directions && <RoutePolyline directions={directions} />}

              {/* Stop markers */}
              {stops.map((stop, index: number) => {
                if (!stop.customer.latitude || !stop.customer.longitude) return null

                return (
                  <AdvancedMarker
                    key={stop.id}
                    position={{ lat: stop.customer.latitude, lng: stop.customer.longitude }}
                  >
                    <div className="relative">
                      <Pin background="#3b82f6" borderColor="#ffffff" glyphColor="#ffffff" scale={1.1} />
                      <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-white border-2 border-blue-500 flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </div>
                    </div>
                  </AdvancedMarker>
                )
              })}
            </Map>
          </APIProvider>
        ) : (
          <div className="flex items-center justify-center h-full bg-slate-100">
            <Card className="max-w-md">
              <CardHeader>
                <CardTitle className="text-destructive">Google Maps API Key Missing</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Add your API key to view the route map.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Legend */}
        <Card className="absolute top-4 right-4 w-48">
          <CardContent className="p-4">
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-emerald-500" />
                <span>Shop</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-blue-500" />
                <span>Route Stops</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1 w-8 bg-blue-500 rounded" />
                <span>Driving Route</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
