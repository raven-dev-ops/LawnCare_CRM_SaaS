'use client'

import { useState, useMemo } from 'react'
import { APIProvider, Map, AdvancedMarker, InfoWindow, Pin } from '@vis.gl/react-google-maps'
import { Customer } from '@/types/database.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { MapPin as MapPinIcon, Navigation, DollarSign, Ruler } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GOOGLE_MAPS_BROWSER_API_KEY } from '@/lib/config'

interface ShopLocation {
  lat: number
  lng: number
  address: string
}

interface CustomersMapProps {
  customers: Customer[]
  focusedCustomerId?: string | null
  onViewInTable?: (customerId: string) => void
  shopLocation: ShopLocation
}

const DEFAULT_ZOOM = 12

export function CustomersMap({
  customers,
  focusedCustomerId,
  onViewInTable,
  shopLocation,
}: CustomersMapProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const apiKey = GOOGLE_MAPS_BROWSER_API_KEY

  // Get customers with valid coordinates
  const customersWithCoords = useMemo(() => {
    return customers.filter((c) => c.latitude && c.longitude)
  }, [customers])

  // Calculate map center based on customer locations
  const mapCenter = useMemo(() => {
    if (focusedCustomerId) {
      const target = customersWithCoords.find((c) => c.id === focusedCustomerId)
      if (target && target.latitude && target.longitude) {
        return { lat: target.latitude, lng: target.longitude }
      }
    }

    if (customersWithCoords.length === 0) return { lat: shopLocation.lat, lng: shopLocation.lng }

    const avgLat =
      customersWithCoords.reduce((sum, c) => sum + (c.latitude || 0), 0) /
      customersWithCoords.length
    const avgLng =
      customersWithCoords.reduce((sum, c) => sum + (c.longitude || 0), 0) /
      customersWithCoords.length

    return { lat: avgLat, lng: avgLng }
  }, [customersWithCoords, focusedCustomerId, shopLocation.lat, shopLocation.lng])

  const getMarkerColor = (type: string) => {
    switch (type) {
      case 'Residential':
        return '#10b981' // emerald-500
      case 'Commercial':
        return '#3b82f6' // blue-500
      case 'Workshop':
        return '#a855f7' // purple-500
      default:
        return '#6b7280' // gray-500
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

  if (!apiKey) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-100">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Google Maps API Key Missing</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Please add your Google Maps API key to the <code className="bg-slate-100 px-1 rounded">.env</code> file:
            </p>
            <pre className="mt-2 bg-slate-900 text-slate-50 p-3 rounded text-xs">
              NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
            </pre>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (customersWithCoords.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-100">
        <div className="text-center max-w-md">
          <MapPinIcon className="mx-auto h-16 w-16 text-muted-foreground/30" />
          <h3 className="mt-4 text-lg font-semibold">No Customer Locations</h3>
          <p className="text-sm text-muted-foreground mt-2">
            {customers.length === 0
              ? 'No customers match your filters.'
              : 'The filtered customers do not have geocoded addresses. Try adding latitude/longitude coordinates.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full">
      <APIProvider apiKey={apiKey}>
        <Map
          mapId="customers-map"
          defaultCenter={mapCenter}
          defaultZoom={DEFAULT_ZOOM}
          gestureHandling="greedy"
          disableDefaultUI={false}
          zoomControl={true}
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl={true}
          className="h-full w-full"
          styles={[
            {
              featureType: 'poi.business',
              stylers: [{ visibility: 'off' }],
            },
          ]}
        >
          {/* Customer Markers */}
          {customersWithCoords.map((customer) => (
            <AdvancedMarker
              key={customer.id}
              position={{ lat: customer.latitude!, lng: customer.longitude! }}
              onClick={() => setSelectedCustomer(customer)}
            >
              <Pin
                background={getMarkerColor(customer.type)}
                borderColor="#ffffff"
                glyphColor="#ffffff"
                scale={selectedCustomer?.id === customer.id ? 1.3 : 1}
              />
            </AdvancedMarker>
          ))}

          {/* Info Window */}
          {selectedCustomer && selectedCustomer.latitude && selectedCustomer.longitude && (
            <InfoWindow
              position={{ lat: selectedCustomer.latitude, lng: selectedCustomer.longitude }}
              onCloseClick={() => setSelectedCustomer(null)}
              headerContent={
                <div className="font-semibold text-base">{selectedCustomer.name}</div>
              }
            >
              <div className="min-w-[280px] py-2 space-y-3">
                <div className="text-sm text-muted-foreground">
                  {selectedCustomer.address}
                </div>

                <div className="flex gap-2">
                  <Badge
                    variant="secondary"
                    className={cn(
                      'font-medium',
                      selectedCustomer.type === 'Residential'
                        ? 'bg-emerald-100 text-emerald-700'
                        : selectedCustomer.type === 'Commercial'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                    )}
                  >
                    {selectedCustomer.type}
                  </Badge>
                  {selectedCustomer.day && (
                    <Badge variant="secondary" className={cn('font-medium', getDayColor(selectedCustomer.day))}>
                      {selectedCustomer.day}
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">${Number(selectedCustomer.cost).toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">Service cost</div>
                    </div>
                  </div>
                  {selectedCustomer.distance_from_shop_miles && (
                    <div className="flex items-center gap-2 text-sm">
                      <Ruler className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{selectedCustomer.distance_from_shop_miles.toFixed(1)} mi</div>
                        <div className="text-xs text-muted-foreground">From shop</div>
                      </div>
                    </div>
                  )}
                </div>

                {selectedCustomer.has_additional_work && (
                  <div className="bg-amber-50 border border-amber-200 rounded p-2 text-sm">
                    <div className="font-medium text-amber-900">Additional Work</div>
                    {selectedCustomer.additional_work_cost && (
                      <div className="text-amber-700">+${Number(selectedCustomer.additional_work_cost).toFixed(2)}</div>
                    )}
                  </div>
                )}

                <div className="grid gap-2 pt-2">
                  <Button
                    size="sm"
                    className="bg-emerald-500 hover:bg-emerald-600 text-white"
                    asChild
                  >
                    <Link href={`/customers/${selectedCustomer.id}`}>
                      View Details
                    </Link>
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        if (!selectedCustomer.latitude || !selectedCustomer.longitude) return
                        const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedCustomer.latitude},${selectedCustomer.longitude}`
                        window.open(url, '_blank')
                      }}
                    >
                      <Navigation className="mr-2 h-4 w-4" />
                      Navigate
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        if (onViewInTable) {
                          onViewInTable(selectedCustomer.id)
                          return
                        }
                        const element = document.querySelector(
                          `[data-customer-row-id="${selectedCustomer.id}"]`
                        ) as HTMLElement | null
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        }
                      }}
                    >
                      View in Table
                    </Button>
                  </div>
                </div>
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>

      {/* Legend */}
      <Card className="absolute bottom-6 left-6 w-64 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Map Legend</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <div className="h-4 w-4 rounded-full bg-emerald-500" />
            <span>Residential ({customers.filter((c) => c.type === 'Residential').length})</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="h-4 w-4 rounded-full bg-blue-500" />
            <span>Commercial ({customers.filter((c) => c.type === 'Commercial').length})</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="h-4 w-4 rounded-full bg-purple-500" />
            <span>Workshop ({customers.filter((c) => c.type === 'Workshop').length})</span>
          </div>
          <div className="pt-2 border-t text-xs text-muted-foreground">
            Showing {customersWithCoords.length} of {customers.length} customers
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
