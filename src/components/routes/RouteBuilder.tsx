'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  MapPin,
  Search,
  Plus,
  GripVertical,
  X,
  Sparkles,
  Save,
  ChevronUp,
  ChevronDown,
  Lock,
  Unlock,
  Home
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { createRoute } from '@/app/(dashboard)/routes/actions'
import { GOOGLE_MAPS_BROWSER_API_KEY } from '@/lib/config'
import { haversineMiles } from '@/lib/geo'
import { optimizeRouteNearestNeighbor } from '@/lib/routes'
import { toast } from 'sonner'

interface ShopLocation {
  lat: number
  lng: number
  address: string
}

interface Customer {
  id: string
  name: string
  address: string
  latitude: number | null
  longitude: number | null
  day: string | null
  type: string
  cost: number
  has_additional_work: boolean
  additional_work_cost: number | null
}

interface RouteBuilderProps {
  customers: Customer[]
  shopLocation: ShopLocation
}

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

export function RouteBuilder({ customers, shopLocation }: RouteBuilderProps) {
  const apiKey = GOOGLE_MAPS_BROWSER_API_KEY
  const router = useRouter()

  const [selectedDay, setSelectedDay] = useState<string>('Tuesday')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCustomers, setSelectedCustomers] = useState<Customer[]>([])
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [routeName, setRouteName] = useState('')
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [orderLocked, setOrderLocked] = useState(false)

  // Filter available customers
  const availableCustomers = useMemo(() => {
    const selectedIds = new Set(selectedCustomers.map(c => c.id))
    return customers
      .filter(c => !selectedIds.has(c.id))
      .filter(c => {
        if (searchQuery) {
          const query = searchQuery.toLowerCase()
          return (
            c.name.toLowerCase().includes(query) ||
            c.address.toLowerCase().includes(query)
          )
        }
        return true
      })
  }, [customers, selectedCustomers, searchQuery])

  // Calculate route stats
  const totalDistance = useMemo(() => {
    if (selectedCustomers.length === 0) return 0
    // Simple calculation - in real implementation, use Google Directions API
    let distance = 0
    let prev = { lat: shopLocation.lat, lng: shopLocation.lng }
    selectedCustomers.forEach(customer => {
      if (customer.latitude && customer.longitude) {
        distance += haversineMiles(
          prev.lat,
          prev.lng,
          customer.latitude,
          customer.longitude
        )
        prev = { lat: customer.latitude, lng: customer.longitude }
      }
    })
    // Add return to shop
    if (selectedCustomers.length > 0) {
      const last = selectedCustomers[selectedCustomers.length - 1]
      if (last.latitude && last.longitude) {
        distance += haversineMiles(
          last.latitude,
          last.longitude,
          shopLocation.lat,
          shopLocation.lng
        )
      }
    }
    return distance
  }, [selectedCustomers, shopLocation.lat, shopLocation.lng])

  const totalRevenue = useMemo(() => {
    return selectedCustomers.reduce(
      (sum, c) => sum + Number(c.cost) + Number(c.additional_work_cost || 0),
      0
    )
  }, [selectedCustomers])

  const estimatedTime = useMemo(() => {
    // 20mph average speed + 30min per stop
    return Math.round(totalDistance * 3) + selectedCustomers.length * 30
  }, [totalDistance, selectedCustomers])

  const handleAddCustomer = (customer: Customer) => {
    setSelectedCustomers([...selectedCustomers, customer])
  }

  const handleRemoveCustomer = (customerId: string) => {
    setSelectedCustomers(selectedCustomers.filter(c => c.id !== customerId))
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newCustomers = [...selectedCustomers]
    const draggedCustomer = newCustomers[draggedIndex]
    newCustomers.splice(draggedIndex, 1)
    newCustomers.splice(index, 0, draggedCustomer)

    setSelectedCustomers(newCustomers)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const newCustomers = [...selectedCustomers]
    const temp = newCustomers[index]
    newCustomers[index] = newCustomers[index - 1]
    newCustomers[index - 1] = temp
    setSelectedCustomers(newCustomers)
  }

  const handleMoveDown = (index: number) => {
    if (index === selectedCustomers.length - 1) return
    const newCustomers = [...selectedCustomers]
    const temp = newCustomers[index]
    newCustomers[index] = newCustomers[index + 1]
    newCustomers[index + 1] = temp
    setSelectedCustomers(newCustomers)
  }


  const handleOptimize = async () => {
    if (selectedCustomers.length === 0 || orderLocked) return
    setIsOptimizing(true)

    const optimized = optimizeRouteNearestNeighbor(selectedCustomers, shopLocation)
    setSelectedCustomers(optimized)

    setIsOptimizing(false)
  }

  const handleSaveRoute = async () => {
    if (selectedCustomers.length === 0) {
      toast.error('Add at least one customer to create a route')
      return
    }

    setIsSaving(true)

    try {
      const trimmedName = routeName.trim()
      const resolvedName = trimmedName || `${selectedDay} Route`

      // Get next date for the selected day
      const today = new Date()
      const currentDay = today.getDay() // 0 = Sunday, 1 = Monday, etc.
      const targetDay = DAYS_OF_WEEK.indexOf(selectedDay)
      let daysUntilTarget = (targetDay + 1 - currentDay + 7) % 7
      if (daysUntilTarget === 0) daysUntilTarget = 7 // Next week if today

      const targetDate = new Date(today)
      targetDate.setDate(today.getDate() + daysUntilTarget)

      const result = await createRoute({
        name: resolvedName,
        day_of_week: selectedDay,
        date: targetDate.toISOString().split('T')[0],
        customers: selectedCustomers.map((c) => ({ id: c.id })),
      })

      if (result.error) {
        toast.error(result.error)
      } else if (result.routeId) {
        toast.success('Route created successfully')
        router.push(`/routes/${result.routeId}`)
      }
    } catch (error) {
      console.error('Error saving route:', error)
      toast.error('Failed to save route')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex h-full">
      {/* Left Sidebar - Available Customers */}
      <div className="w-80 border-r bg-white overflow-y-auto">
        <div className="p-6 border-b">
          <Button variant="ghost" size="sm" className="mb-4" asChild>
            <Link href="/routes">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Routes
            </Link>
          </Button>

          <h1 className="text-2xl font-bold mb-4">Create Route</h1>

          <div className="space-y-4">
            <div>
              <Label>Route Name</Label>
              <Input
                placeholder="e.g., Tuesday Route"
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
              />
            </div>

            <div>
              <Label>Day of Week</Label>
              <Select value={selectedDay} onValueChange={setSelectedDay}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((day) => (
                    <SelectItem key={day} value={day}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Search Customers</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <h3 className="font-semibold mb-3">
            Available Customers ({availableCustomers.length})
          </h3>
          <div className="space-y-2">
            {availableCustomers.map((customer) => (
              <Card
                key={customer.id}
                className="overflow-hidden cursor-pointer hover:border-emerald-500 transition-colors"
                onClick={() => handleAddCustomer(customer)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {customer.name}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {customer.address}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          ${Number(customer.cost).toFixed(0)}
                        </Badge>
                        {customer.has_additional_work && (
                          <Badge variant="outline" className="text-xs">
                            + Work
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {availableCustomers.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                {searchQuery ? 'No customers found' : 'All customers added'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Middle - Selected Route */}
      <div className="w-96 border-r bg-slate-50 overflow-y-auto">
        <div className="p-6 border-b bg-white">
          <h2 className="text-xl font-bold mb-4">
            Route Stops ({selectedCustomers.length})
          </h2>

          {/* Workshop Start/End Card */}
          <div className="mb-4 rounded-lg border-2 border-emerald-500 bg-emerald-50 p-3">
            <div className="flex items-start gap-2">
              <div className="h-8 w-8 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0">
                <Home className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-emerald-900">Workshop (Start & End)</div>
                <div className="text-xs text-emerald-700">{shopLocation.address}</div>
                <div className="text-xs text-emerald-600 mt-1">
                  All routes begin and return here
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Distance</span>
              <span className="font-medium">{totalDistance.toFixed(1)} mi</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Est. Time</span>
              <span className="font-medium">
                {Math.floor(estimatedTime / 60)}h {estimatedTime % 60}min
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Revenue</span>
              <span className="font-medium text-emerald-600">${totalRevenue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Fuel Cost</span>
              <span className="font-medium text-red-600">
                -${(totalDistance * 0.15).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2">
              <span className="font-medium">Net Profit</span>
              <span className="font-bold text-emerald-600">
                ${(totalRevenue - totalDistance * 0.15).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex gap-2 mb-2">
            <Button
              onClick={handleOptimize}
              disabled={selectedCustomers.length < 2 || isOptimizing || orderLocked}
              className="flex-1"
              variant="outline"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {isOptimizing ? 'Optimizing...' : 'Optimize'}
            </Button>
            <Button
              onClick={() => setOrderLocked(!orderLocked)}
              disabled={selectedCustomers.length === 0}
              variant={orderLocked ? 'default' : 'outline'}
              size="icon"
            >
              {orderLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
            </Button>
          </div>

          <Button
            onClick={handleSaveRoute}
            disabled={selectedCustomers.length === 0 || isSaving}
            className="w-full bg-emerald-500 hover:bg-emerald-600"
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Route'}
          </Button>
        </div>

        <div className="p-6 space-y-2">
          {selectedCustomers.map((customer, index) => (
            <Card
              key={customer.id}
              draggable={!orderLocked}
              onDragStart={() => !orderLocked && handleDragStart(index)}
              onDragOver={(e) => !orderLocked && handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={cn(
                'overflow-hidden transition-all',
                !orderLocked && 'cursor-move',
                draggedIndex === index && 'opacity-50 scale-95',
                orderLocked && 'border-blue-200 bg-blue-50/30'
              )}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  {!orderLocked && (
                    <GripVertical className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  )}
                  <div className="h-8 w-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {customer.name}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {customer.address}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        ${Number(customer.cost).toFixed(0)}
                      </Badge>
                      {customer.has_additional_work && (
                        <Badge variant="outline" className="text-xs">
                          + Work
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Reorder buttons */}
                  {!orderLocked && (
                    <div className="flex flex-col gap-0.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 w-5 p-0"
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 w-5 p-0"
                        onClick={() => handleMoveDown(index)}
                        disabled={index === selectedCustomers.length - 1}
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </div>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleRemoveCustomer(customer.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {selectedCustomers.length === 0 && (
            <div className="text-center py-12 text-sm text-muted-foreground">
              <MapPin className="mx-auto h-12 w-12 mb-3 opacity-20" />
              <p>No customers added yet</p>
              <p className="text-xs mt-1">
                Click customers from the left to add them
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right - Map */}
      <div className="flex-1 relative">
        {apiKey ? (
          <APIProvider apiKey={apiKey}>
            <Map
              mapId="route-builder-map"
              defaultCenter={shopLocation}
              defaultZoom={11}
              gestureHandling="greedy"
              disableDefaultUI={false}
              className="h-full w-full"
            >
              {/* Shop marker */}
              <AdvancedMarker position={shopLocation}>
                <Pin
                  background="#10b981"
                  borderColor="#ffffff"
                  glyphColor="#ffffff"
                  scale={1.2}
                >
                  <div className="text-xs font-bold">SHOP</div>
                </Pin>
              </AdvancedMarker>

              {/* Selected customer markers */}
              {selectedCustomers.map((customer, index) => {
                if (!customer.latitude || !customer.longitude) return null

                return (
                  <AdvancedMarker
                    key={customer.id}
                    position={{ lat: customer.latitude, lng: customer.longitude }}
                  >
                    <div className="relative">
                      <Pin
                        background="#10b981"
                        borderColor="#ffffff"
                        glyphColor="#ffffff"
                        scale={1.1}
                      />
                      <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-white border-2 border-emerald-500 flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </div>
                    </div>
                  </AdvancedMarker>
                )
              })}

              {/* Available customer markers (faded) */}
              {availableCustomers.slice(0, 50).map((customer) => {
                if (!customer.latitude || !customer.longitude) return null

                return (
                  <AdvancedMarker
                    key={customer.id}
                    position={{ lat: customer.latitude, lng: customer.longitude }}
                    onClick={() => handleAddCustomer(customer)}
                  >
                    <Pin
                      background="#94a3b8"
                      borderColor="#ffffff"
                      glyphColor="#ffffff"
                      scale={0.8}
                    />
                  </AdvancedMarker>
                )
              })}
            </Map>
          </APIProvider>
        ) : (
          <div className="flex items-center justify-center h-full bg-slate-100">
            <Card className="max-w-md">
              <CardHeader>
                <CardTitle className="text-destructive">
                  Google Maps API Key Missing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Add your API key to view the map.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Legend */}
        <Card className="absolute top-4 right-4 w-52">
          <CardContent className="p-4">
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-emerald-500" />
                <span>Shop & Selected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-slate-400" />
                <span>Available Customers</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
