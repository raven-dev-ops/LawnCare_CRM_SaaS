'use client'

import { useEffect, useMemo, useState } from 'react'
import { APIProvider, Map, AdvancedMarker, Pin, useMap } from '@vis.gl/react-google-maps'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { GOOGLE_MAPS_BROWSER_API_KEY } from '@/lib/config'
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Cell,
} from 'recharts'

type ServiceHistoryEntry = {
  cost: number | null
}

type CustomerPoint = {
  id: string
  name: string
  address: string
  day: string | null
  type: string | null
  cost: number
  has_additional_work: boolean
  additional_work_cost: number | null
  latitude: number | null
  longitude: number | null
}

const DAY_COLORS: Record<string, string> = {
  Sunday: '#a855f7',
  Monday: '#14b8a6',
  Tuesday: '#f97316',
  Wednesday: '#3b82f6',
  Thursday: '#ef4444',
  Friday: '#10b981',
  Saturday: '#6366f1',
  Workshop: '#22c55e',
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Workshop']
const TYPES = ['Residential', 'Commercial', 'Workshop']

function formatCurrency(value: number) {
  return value.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

interface ShopLocation {
  lat: number
  lng: number
  address: string
}

interface AnalyticsDashboardProps {
  customers: CustomerPoint[]
  serviceHistory: ServiceHistoryEntry[]
  shopLocation: ShopLocation
}

export function AnalyticsDashboard({ customers, serviceHistory, shopLocation }: AnalyticsDashboardProps) {
  const [search, setSearch] = useState('')
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return customers.filter((c) => {
      if (
        selectedDays.length > 0 &&
        !selectedDays.includes((c.day || '').toLowerCase())
      ) {
        return false
      }
      if (typeFilter !== 'all' && (c.type || '').toLowerCase() !== typeFilter.toLowerCase()) {
        return false
      }
      if (!query) return true
      return (
        (c.name || '').toLowerCase().includes(query) ||
        (c.address || '').toLowerCase().includes(query)
      )
    })
  }, [customers, search, selectedDays, typeFilter])

  const totalRevenue = filtered.reduce(
    (sum, c) => sum + Number(c.cost || 0) + Number(c.additional_work_cost || 0),
    0
  )
  const addOnRevenue = filtered
    .filter((c) => c.has_additional_work)
    .reduce((sum, c) => sum + Number(c.additional_work_cost || 0), 0)
  const avgRevenuePerStop = filtered.length > 0 ? totalRevenue / filtered.length : 0
  const actualRevenue = useMemo(() => {
    return (serviceHistory || []).reduce((sum, entry) => sum + Number(entry.cost || 0), 0)
  }, [serviceHistory])

  const routesPerDay = useMemo(() => {
    const counts: Record<string, number> = {}
    filtered.forEach((c) => {
      const day = c.day || 'Unscheduled'
      counts[day] = (counts[day] || 0) + 1
    })
    return Object.entries(counts).sort((a, b) => (DAYS.indexOf(a[0]) - DAYS.indexOf(b[0])))
  }, [filtered])

  const revenuePerDay = useMemo(() => {
    const sums: Record<string, number> = {}
    filtered.forEach((c) => {
      const day = c.day || 'Unscheduled'
      const value = Number(c.cost || 0) + Number(c.additional_work_cost || 0)
      sums[day] = (sums[day] || 0) + value
    })
    return Object.entries(sums).sort((a, b) => (DAYS.indexOf(a[0]) - DAYS.indexOf(b[0])))
  }, [filtered])

  const routesPerDayData = routesPerDay.map(([label, value]) => ({ label, value }))
  const revenuePerDayData = revenuePerDay.map(([label, value]) => ({ label, value }))

  const addOnStats = useMemo(() => {
    const yes = filtered.filter((c) => c.has_additional_work).length
    const total = filtered.length || 1
    const yesPct = (yes / total) * 100
    return { yes, yesPct, noPct: 100 - yesPct }
  }, [filtered])

  const hasMap = Boolean(GOOGLE_MAPS_BROWSER_API_KEY)

  const handleDaySelect = (label: string) => {
    const value = label.toLowerCase()
    setSelectedDays((prev) => {
      if (prev.includes(value)) {
        return prev.filter((d) => d !== value)
      }
      return [...prev, value]
    })
  }

  const resetFilters = () => {
    setSearch('')
    setSelectedDays([])
    setTypeFilter('all')
    setSelectedCustomerId(null)
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Lawn Care Proof of Concept</h1>
            <p className="text-sm text-slate-500">Live service metrics and route performance</p>
          </div>
          <div className="flex items-center gap-2 lg:hidden">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-300 text-slate-700"
              onClick={() => setFiltersOpen((v) => !v)}
            >
              {filtersOpen ? 'Hide filters' : 'Show filters'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-slate-300 text-slate-700"
              onClick={resetFilters}
            >
              Reset
            </Button>
          </div>
          <div
            className={`flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center ${
              filtersOpen ? 'flex' : 'hidden'
            } lg:flex`}
          >
            <Input
              placeholder="Search name or address"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-56 bg-white border-slate-300 text-slate-900"
            />
            <Select
              value={
                selectedDays.length === 0
                  ? 'all'
                  : selectedDays.length === 1
                  ? selectedDays[0]
                  : 'multi'
              }
              onValueChange={(v) => {
                if (v === 'all') {
                  setSelectedDays([])
                } else if (v !== 'multi') {
                  setSelectedDays([v])
                }
              }}
            >
              <SelectTrigger className="w-full sm:w-44 bg-white border-slate-300 text-slate-900">
                <SelectValue placeholder="Day" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Days</SelectItem>
                <SelectItem value="multi" disabled>
                  Multiple (use chart)
                </SelectItem>
                {DAYS.map((day) => (
                  <SelectItem key={day} value={day.toLowerCase()}>
                    {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-40 bg-white border-slate-300 text-slate-900">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {TYPES.map((t) => (
                  <SelectItem key={t} value={t.toLowerCase()}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              className="hidden border-slate-300 text-slate-700 lg:inline-flex"
              onClick={resetFilters}
            >
              Reset
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-slate-50">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
          {(selectedDays.length > 0 || typeFilter !== 'all' || search) && (
            <div className="flex flex-wrap items-center gap-2">
              {selectedDays.map((day) => (
                <Button
                  key={day}
                  variant="secondary"
                  size="sm"
                  className="bg-slate-100 text-slate-800 hover:bg-slate-200"
                  onClick={() =>
                    setSelectedDays((prev) => prev.filter((d) => d !== day))
                  }
                >
                  Day: {day.charAt(0).toUpperCase() + day.slice(1)} ×
                </Button>
              ))}
              {typeFilter !== 'all' && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-slate-100 text-slate-800 hover:bg-slate-200"
                  onClick={() => setTypeFilter('all')}
                >
                  Type: {typeFilter} ×
                </Button>
              )}
              {search && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-slate-100 text-slate-800 hover:bg-slate-200"
                  onClick={() => setSearch('')}
                >
                  Search: “{search}” ×
                </Button>
              )}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-white text-slate-900 border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Record Count</CardTitle>
                <CardDescription className="text-slate-500">Total stops</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{filtered.length}</div>
              </CardContent>
            </Card>

            <Card className="bg-white text-slate-900 border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Planned revenue</CardTitle>
                <CardDescription className="text-slate-500">Scheduled vs. serviced</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatCurrency(totalRevenue)}</div>
                <div className="text-xs text-slate-500">Actual: {formatCurrency(actualRevenue)}</div>
              </CardContent>
            </Card>

            <Card className="bg-white text-slate-900 border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Revenue per stop average</CardTitle>
                <CardDescription className="text-slate-500">Avg cost including add-ons</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {avgRevenuePerStop.toLocaleString(undefined, {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 2,
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white text-slate-900 border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Add-on service revenue</CardTitle>
                <CardDescription className="text-slate-500">Upsell dollars</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatCurrency(addOnRevenue)}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="bg-white text-slate-900 border-slate-200 shadow-sm lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Routes per day</CardTitle>
              </CardHeader>
              <CardContent className="pb-6">
                <FilterableBarChart
                  data={routesPerDayData}
                  color="#ef4444"
                  selectedLabels={selectedDays}
                  onSelect={handleDaySelect}
                />
              </CardContent>
            </Card>

              <Card className="bg-white text-slate-900 border-slate-200 shadow-sm lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Revenue per day</CardTitle>
              </CardHeader>
              <CardContent className="pb-6">
                <FilterableBarChart
                  data={revenuePerDayData}
                  color="#22c55e"
                  currency
                  selectedLabels={selectedDays}
                  onSelect={handleDaySelect}
                />
              </CardContent>
            </Card>

            <Card className="bg-white text-slate-900 border-slate-200 shadow-sm lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  Percentage of stops with add-on services
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center">
                <PieChart yesPct={addOnStats.yesPct} />
                <div className="ml-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-full bg-[#a855f7]" />
                    <span>No</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-full bg-[#facc15]" />
                    <span>Yes</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

            <Card className="bg-white text-slate-900 border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Service map</CardTitle>
                <CardDescription className="text-slate-500">
                  Stops colored by assigned day
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[320px] sm:h-[420px] lg:h-[480px]">
                {hasMap ? (
                  <APIProvider apiKey={GOOGLE_MAPS_BROWSER_API_KEY}>
                    <MapSection
                      filtered={filtered}
                      selectedCustomerId={selectedCustomerId}
                      onSelectCustomer={setSelectedCustomerId}
                      shopLocation={shopLocation}
                    />
                  </APIProvider>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-lg bg-slate-100 text-sm text-slate-600">
                    Add your Google Maps API key to view the map.
                  </div>
                )}
              </CardContent>
            </Card>
        </div>
      </div>
    </div>
  )
}

interface ChartDataPoint {
  label: string
  value: number
}

interface FilterableBarChartProps {
  data: ChartDataPoint[]
  color: string
  currency?: boolean
  selectedLabels?: string[]
  onSelect?: (label: string) => void
}

function CustomTooltip({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean
  payload?: any[]
  label?: string
  currency?: boolean
}) {
  if (!active || !payload || !payload.length) return null
  const value = payload[0].value
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-md">
      <div className="font-semibold text-slate-900">{label}</div>
      <div>{currency ? formatCurrency(Math.round(value)) : value}</div>
    </div>
  )
}

function FilterableBarChart({
  data,
  color,
  currency,
  selectedLabels,
  onSelect,
}: FilterableBarChartProps) {
  const anySelected = selectedLabels && selectedLabels.length > 0

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
          barCategoryGap="30%"
        >
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#0f172a', fontSize: 12 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#475569', fontSize: 12 }}
          />
          <RechartsTooltip
            content={<CustomTooltip currency={currency} />}
            cursor={{ fill: 'rgba(148, 163, 184, 0.15)' }}
          />
          <Bar
            dataKey="value"
            onClick={(data) => onSelect?.((data as any).label)}
            cursor={onSelect ? 'pointer' : 'default'}
          >
            {data.map((entry, index) => {
              const active =
                !anySelected || selectedLabels?.includes(entry.label.toLowerCase())
              return (
                <Cell
                  key={entry.label + index}
                  fill={color}
                  fillOpacity={active ? 1 : 0.35}
                />
              )
            })}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  )
}

function PieChart({ yesPct }: { yesPct: number }) {
  const yes = Math.min(Math.max(yesPct, 0), 100)
  const no = 100 - yes
  return (
    <div
      className="flex h-40 w-40 items-center justify-center rounded-full text-sm font-semibold text-slate-900"
      style={{
        background: `conic-gradient(#facc15 ${yes}%, #a855f7 0)`,
      }}
    >
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white text-slate-900 shadow-inner">
        {yes.toFixed(1)}% Yes
      </div>
    </div>
  )
}

function MapSection({
  filtered,
  selectedCustomerId,
  onSelectCustomer,
  shopLocation,
}: {
  filtered: CustomerPoint[]
  selectedCustomerId: string | null
  onSelectCustomer: (id: string | null) => void
  shopLocation: ShopLocation
}) {
  const map = useMap('analytics-map-instance')

  const legendSet = new Set<string>(filtered.map((c) => c.day || 'Unscheduled'))
  legendSet.add('Workshop') // always show Workshop in legend

  const legendDays = Array.from(legendSet).sort((a, b) => {
    const ai = DAYS.indexOf(a)
    const bi = DAYS.indexOf(b)
    if (ai === -1 && bi === -1) return a.localeCompare(b)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })

  useEffect(() => {
    if (!map) return
    const points = filtered.filter((c) => c.latitude != null && c.longitude != null)
    if (points.length === 0) {
      map.setCenter(shopLocation)
      map.setZoom(11)
      return
    }

    const bounds = new google.maps.LatLngBounds()
    points.forEach((c) => bounds.extend({ lat: c.latitude!, lng: c.longitude! }))

    if (points.length === 1) {
      map.setCenter(bounds.getCenter())
      map.setZoom(13)
    } else {
      map.fitBounds(bounds, 40)
    }
  }, [map, filtered, shopLocation.lat, shopLocation.lng])

  return (
    <>
      <Map
        id="analytics-map-instance"
        mapId="analytics-map"
        defaultCenter={shopLocation}
        defaultZoom={11}
        className="h-full w-full rounded-lg"
        disableDefaultUI={false}
        gestureHandling="greedy"
        onClick={() => onSelectCustomer(null)}
      >
        {/* Workshop / shop marker */}
        <AdvancedMarker position={shopLocation} zIndex={8000}>
          <Pin
            background={DAY_COLORS['Workshop'] || '#22c55e'}
            glyphColor="transparent"
            borderColor="#ffffff"
            scale={1.3}
          />
        </AdvancedMarker>

        {filtered.map((c) => {
          if (c.latitude == null || c.longitude == null) return null
          const color = DAY_COLORS[c.day || ''] || '#0ea5e9'
          return (
            <AdvancedMarker
              key={c.id}
              position={{ lat: c.latitude, lng: c.longitude }}
              zIndex={c.day === 'Workshop' ? 5000 : undefined}
              onClick={() => onSelectCustomer(c.id)}
            >
              <Pin
                background={color}
                glyphColor="transparent"
                borderColor="#ffffff"
                scale={0.84}
              />
            </AdvancedMarker>
          )
        })}
      </Map>
      {selectedCustomerId && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/10"
          onClick={() => onSelectCustomer(null)}
        >
          <div
            className="pointer-events-auto max-w-sm rounded-lg border border-slate-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2 p-4">
              {(() => {
                const c = filtered.find((x) => x.id === selectedCustomerId)
                if (!c) return null
                return (
                  <>
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-slate-900">
                        {c.name || 'Customer'}
                      </div>
                      <div className="text-xs text-slate-600">{c.address}</div>
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Badge variant="secondary" className="bg-slate-100 text-slate-800">
                          {c.day || 'Unscheduled'}
                        </Badge>
                        {c.type && (
                          <Badge variant="outline" className="text-slate-700">
                            {c.type}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <button
                      className="text-xs text-slate-500 hover:text-slate-800"
                      onClick={() => onSelectCustomer(null)}
                    >
                      ✕
                    </button>
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-700">
        {legendDays.map((day) => (
          <span key={day} className="inline-flex items-center gap-1">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: DAY_COLORS[day] || '#0ea5e9' }}
            />
            {day}
          </span>
        ))}
      </div>
    </>
  )
}
