'use client'

import { useEffect, useMemo, useState } from 'react'
import { APIProvider, Map as GoogleMap, AdvancedMarker, Pin, useMap } from '@vis.gl/react-google-maps'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { GOOGLE_MAPS_BROWSER_API_KEY } from '@/lib/config'
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Cell,
  LineChart as RechartsLineChart,
  Line,
  CartesianGrid,
} from 'recharts'

type ServiceHistoryEntry = {
  cost: number | null
  service_date: string
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

type CustomerMetric = {
  id: string
  name: string
  type: string | null
  base_cost: number | null
  total_services: number | null
  lifetime_revenue: number | null
  avg_service_cost: number | null
  last_service_date: string | null
  avg_rating: number | null
  services_last_90_days: number | null
}

type RouteStatistic = {
  id: string
  date: string
  day_of_week: string | null
  status: string | null
  total_stops: number | null
  completed_stops: number | null
  skipped_stops: number | null
  total_distance_miles: number | null
  total_duration_minutes: number | null
  total_revenue: number | null
  estimated_fuel_cost: number | null
}
const ROUTE_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const CUSTOMER_DAYS = [...ROUTE_DAYS, 'Unscheduled']
const TYPES = ['Residential', 'Commercial', 'Workshop']

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

const MS_PER_DAY = 24 * 60 * 60 * 1000

function formatCurrency(value: number, digits = 0) {
  return value.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

function formatNumber(value: number, digits = 0) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  })
}

function formatPercent(value: number, digits = 0) {
  return `${value.toFixed(digits)}%`
}

function safeNumber(value: number | null | undefined) {
  return Number(value || 0)
}

function formatDateInput(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDateInput(value: string) {
  if (!value) return null
  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function daysBetween(start: Date, end: Date) {
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY)
}

function isDateInRange(value: string, start: Date, end: Date) {
  const date = parseDateInput(value)
  if (!date) return false
  return date >= start && date <= end
}

type RouteTotals = {
  routes: number
  totalStops: number
  completedStops: number
  skippedStops: number
  totalRevenue: number
  totalDistance: number
  totalDuration: number
}

function buildRouteTotals(rows: RouteStatistic[]): RouteTotals {
  return rows.reduce(
    (acc, row) => {
      acc.routes += 1
      acc.totalStops += safeNumber(row.total_stops)
      acc.completedStops += safeNumber(row.completed_stops)
      acc.skippedStops += safeNumber(row.skipped_stops)
      acc.totalRevenue += safeNumber(row.total_revenue)
      acc.totalDistance += safeNumber(row.total_distance_miles)
      acc.totalDuration += safeNumber(row.total_duration_minutes)
      return acc
    },
    {
      routes: 0,
      totalStops: 0,
      completedStops: 0,
      skippedStops: 0,
      totalRevenue: 0,
      totalDistance: 0,
      totalDuration: 0,
    }
  )
}
interface ShopLocation {
  lat: number
  lng: number
  address: string
}

interface AnalyticsDashboardProps {
  customers: CustomerPoint[]
  customerMetrics: CustomerMetric[]
  routeStats: RouteStatistic[]
  serviceHistory: ServiceHistoryEntry[]
  shopLocation: ShopLocation
}

export function AnalyticsDashboard({
  customers,
  customerMetrics,
  routeStats,
  serviceHistory,
  shopLocation,
}: AnalyticsDashboardProps) {
  const [search, setSearch] = useState('')
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [typeFilter, setTypeFilter] = useState('all')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [rangeStart, setRangeStart] = useState(() => formatDateInput(addDays(new Date(), -30)))
  const [rangeEnd, setRangeEnd] = useState(() => formatDateInput(new Date()))
  const [compareEnabled, setCompareEnabled] = useState(false)

  const normalizedRange = useMemo(() => {
    const today = new Date()
    const fallbackStart = addDays(today, -30)
    const startValue = parseDateInput(rangeStart) ?? fallbackStart
    const endValue = parseDateInput(rangeEnd) ?? today

    if (startValue <= endValue) return { start: startValue, end: endValue }
    return { start: endValue, end: startValue }
  }, [rangeStart, rangeEnd])

  const rangeDays = useMemo(() => {
    return Math.max(1, daysBetween(normalizedRange.start, normalizedRange.end) + 1)
  }, [normalizedRange])

  const compareRange = useMemo(() => {
    if (!compareEnabled) return null
    const compareEnd = addDays(normalizedRange.start, -1)
    const compareStart = addDays(compareEnd, -(rangeDays - 1))
    return { start: compareStart, end: compareEnd }
  }, [compareEnabled, normalizedRange.start, rangeDays])

  const compareLabel = useMemo(() => {
    if (!compareRange) return ''
    return `${formatDateInput(compareRange.start)} to ${formatDateInput(compareRange.end)}`
  }, [compareRange])

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase()
    return customers.filter((customer) => {
      const customerDay = customer.day || 'Unscheduled'
      if (selectedDays.length > 0 && !selectedDays.includes(customerDay)) {
        return false
      }
      if (typeFilter !== 'all' && (customer.type || '') !== typeFilter) {
        return false
      }
      if (!query) return true
      return (
        (customer.name || '').toLowerCase().includes(query) ||
        (customer.address || '').toLowerCase().includes(query)
      )
    })
  }, [customers, search, selectedDays, typeFilter])

  const routeStatsInRange = useMemo(() => {
    return routeStats.filter((row) =>
      row.date ? isDateInRange(row.date, normalizedRange.start, normalizedRange.end) : false
    )
  }, [routeStats, normalizedRange])

  const routeStatsCompare = useMemo(() => {
    if (!compareRange) return []
    return routeStats.filter((row) =>
      row.date ? isDateInRange(row.date, compareRange.start, compareRange.end) : false
    )
  }, [routeStats, compareRange])

  const serviceHistoryInRange = useMemo(() => {
    return serviceHistory.filter((row) =>
      row.service_date
        ? isDateInRange(row.service_date, normalizedRange.start, normalizedRange.end)
        : false
    )
  }, [serviceHistory, normalizedRange])

  const serviceHistoryCompare = useMemo(() => {
    if (!compareRange) return []
    return serviceHistory.filter((row) =>
      row.service_date ? isDateInRange(row.service_date, compareRange.start, compareRange.end) : false
    )
  }, [serviceHistory, compareRange])

  const routeTotals = useMemo(() => buildRouteTotals(routeStatsInRange), [routeStatsInRange])
  const routeTotalsCompare = useMemo(() => buildRouteTotals(routeStatsCompare), [routeStatsCompare])

  const actualRevenue = useMemo(() => {
    return serviceHistoryInRange.reduce((sum, entry) => sum + safeNumber(entry.cost), 0)
  }, [serviceHistoryInRange])

  const actualRevenueCompare = useMemo(() => {
    return serviceHistoryCompare.reduce((sum, entry) => sum + safeNumber(entry.cost), 0)
  }, [serviceHistoryCompare])

  const revenueTotal = actualRevenue > 0 ? actualRevenue : routeTotals.totalRevenue
  const revenueTotalCompare = compareRange
    ? actualRevenueCompare > 0
      ? actualRevenueCompare
      : routeTotalsCompare.totalRevenue
    : null

  const revenuePerDay = revenueTotal / rangeDays
  const revenuePerDayCompare = compareRange ? (revenueTotalCompare || 0) / rangeDays : null

  const avgStopsPerDay = routeTotals.totalStops / rangeDays
  const avgStopsPerDayCompare = compareRange ? routeTotalsCompare.totalStops / rangeDays : null

  const completionRate = routeTotals.totalStops
    ? (routeTotals.completedStops / routeTotals.totalStops) * 100
    : 0
  const completionRateCompare =
    compareRange && routeTotalsCompare.totalStops
      ? (routeTotalsCompare.completedStops / routeTotalsCompare.totalStops) * 100
      : null

  const hasRouteData = routeStatsInRange.length > 0
  const hasServiceData = serviceHistoryInRange.length > 0

  const selectedRouteDays = useMemo(
    () => selectedDays.filter((day) => ROUTE_DAYS.includes(day)),
    [selectedDays]
  )

  const routesByWeekday = useMemo(() => {
    const counts = new Map<string, number>()
    routeStatsInRange.forEach((row) => {
      const day = row.day_of_week
      if (!day) return
      counts.set(day, (counts.get(day) || 0) + 1)
    })
    return ROUTE_DAYS.map((day) => ({ label: day, value: counts.get(day) || 0 }))
  }, [routeStatsInRange])

  const revenueByWeekday = useMemo(() => {
    const totals = new Map<string, number>()
    routeStatsInRange.forEach((row) => {
      const day = row.day_of_week
      if (!day) return
      totals.set(day, (totals.get(day) || 0) + safeNumber(row.total_revenue))
    })
    return ROUTE_DAYS.map((day) => ({ label: day, value: totals.get(day) || 0 }))
  }, [routeStatsInRange])

  const completionTrendData = useMemo(() => {
    const totals = new Map<string, { completed: number; total: number }>()
    routeStatsInRange.forEach((row) => {
      if (!row.date) return
      const entry = totals.get(row.date) || { completed: 0, total: 0 }
      entry.completed += safeNumber(row.completed_stops)
      entry.total += safeNumber(row.total_stops)
      totals.set(row.date, entry)
    })
    return Array.from(totals.entries())
      .sort(
        ([a], [b]) =>
          new Date(`${a}T00:00:00`).getTime() - new Date(`${b}T00:00:00`).getTime()
      )
      .map(([date, entry]) => ({
        date,
        completionRate: entry.total ? Math.round((entry.completed / entry.total) * 1000) / 10 : 0,
      }))
  }, [routeStatsInRange])

  const customerSummary = useMemo(() => {
    const count = customerMetrics.length
    if (!count) {
      return {
        count: 0,
        avgRating: 0,
        avgLtv: 0,
        avgServiceCost: 0,
        activeCustomers: 0,
      }
    }

    let sumRating = 0
    let sumLtv = 0
    let sumServiceCost = 0
    let activeCustomers = 0

    customerMetrics.forEach((metric) => {
      sumRating += safeNumber(metric.avg_rating)
      sumLtv += safeNumber(metric.lifetime_revenue)
      sumServiceCost += safeNumber(metric.avg_service_cost)
      if (safeNumber(metric.services_last_90_days) > 0) {
        activeCustomers += 1
      }
    })

    return {
      count,
      avgRating: sumRating / count,
      avgLtv: sumLtv / count,
      avgServiceCost: sumServiceCost / count,
      activeCustomers,
    }
  }, [customerMetrics])

  const hasMap = Boolean(GOOGLE_MAPS_BROWSER_API_KEY)

  const handleDaySelect = (label: string) => {
    setSelectedDays((prev) => {
      if (prev.includes(label)) {
        return prev.filter((day) => day !== label)
      }
      return [...prev, label]
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
            <h1 className="text-2xl font-semibold text-slate-900">Lawn Care CRM Analytics</h1>
            <p className="text-sm text-slate-500">Service metrics, revenue, and route performance</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex items-center gap-2">
              <Label htmlFor="range-start" className="text-xs text-slate-600">
                From
              </Label>
              <Input
                id="range-start"
                type="date"
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
                className="w-full min-w-[140px] bg-white border-slate-300 text-slate-900"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="range-end" className="text-xs text-slate-600">
                To
              </Label>
              <Input
                id="range-end"
                type="date"
                value={rangeEnd}
                onChange={(e) => setRangeEnd(e.target.value)}
                className="w-full min-w-[140px] bg-white border-slate-300 text-slate-900"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="compare-period"
                checked={compareEnabled}
                onCheckedChange={(value) => setCompareEnabled(value)}
              />
              <Label htmlFor="compare-period" className="text-xs text-slate-600">
                Compare period
              </Label>
            </div>
            {compareEnabled && compareLabel && (
              <div className="text-xs text-slate-500">Prev: {compareLabel}</div>
            )}
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 lg:hidden">
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
          className={`mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center ${
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
            onValueChange={(value) => {
              if (value === 'all') {
                setSelectedDays([])
              } else if (value !== 'multi') {
                setSelectedDays([value])
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
              {CUSTOMER_DAYS.map((day) => (
                <SelectItem key={day} value={day}>
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
              {TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
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
                  onClick={() => setSelectedDays((prev) => prev.filter((value) => value !== day))}
                >
                  Day: {day}
                </Button>
              ))}
              {typeFilter !== 'all' && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-slate-100 text-slate-800 hover:bg-slate-200"
                  onClick={() => setTypeFilter('all')}
                >
                  Type: {typeFilter}
                </Button>
              )}
              {search && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-slate-100 text-slate-800 hover:bg-slate-200"
                  onClick={() => setSearch('')}
                >
                  Search: {search}
                </Button>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="Revenue per day"
              description="Actual or planned revenue"
              value={formatCurrency(revenuePerDay, 0)}
              subValue={
                hasRouteData || hasServiceData
                  ? hasServiceData
                    ? `Actual: ${formatCurrency(actualRevenue, 0)}${
                        routeTotals.totalRevenue
                          ? ` | Planned: ${formatCurrency(routeTotals.totalRevenue, 0)}`
                          : ''
                      }`
                    : `Planned: ${formatCurrency(routeTotals.totalRevenue, 0)}`
                  : 'No revenue data for selected range.'
              }
              compareValue={
                compareRange ? `Prev: ${formatCurrency(revenuePerDayCompare || 0, 0)}` : undefined
              }
            />
            <KpiCard
              title="Average stops per day"
              description="Stops across routes"
              value={formatNumber(avgStopsPerDay, 1)}
              subValue={
                hasRouteData
                  ? `Total stops: ${formatNumber(routeTotals.totalStops)} | Routes: ${
                      routeTotals.routes
                    }`
                  : 'No route data for selected range.'
              }
              compareValue={
                compareRange ? `Prev: ${formatNumber(avgStopsPerDayCompare || 0, 1)}` : undefined
              }
            />
            <KpiCard
              title="Completion rate"
              description="Completed stops"
              value={formatPercent(completionRate, 1)}
              subValue={
                hasRouteData
                  ? `Completed: ${formatNumber(routeTotals.completedStops)} / ${formatNumber(
                      routeTotals.totalStops
                    )}`
                  : 'No route data for selected range.'
              }
              compareValue={
                compareRange && completionRateCompare != null
                  ? `Prev: ${formatPercent(completionRateCompare, 1)}`
                  : undefined
              }
            />
            <Card className="bg-white text-slate-900 border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Customer snapshot</CardTitle>
                <CardDescription className="text-slate-500">From customer metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-3xl font-bold">{formatNumber(customerSummary.count)}</div>
                {customerSummary.count > 0 ? (
                  <>
                    <div className="text-xs text-slate-500">
                      Active last 90 days: {formatNumber(customerSummary.activeCustomers)}
                    </div>
                    <div className="text-xs text-slate-500">
                      Avg rating: {formatNumber(customerSummary.avgRating, 1)}
                    </div>
                    <div className="text-xs text-slate-500">
                      Avg LTV: {formatCurrency(customerSummary.avgLtv, 0)}
                    </div>
                    <div className="text-xs text-slate-500">
                      Avg service: {formatCurrency(customerSummary.avgServiceCost, 0)}
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-slate-500">No customer metrics available.</div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="bg-white text-slate-900 border-slate-200 shadow-sm lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Routes by weekday</CardTitle>
                <CardDescription className="text-slate-500">Count of routes in range</CardDescription>
              </CardHeader>
              <CardContent className="pb-6">
                {hasRouteData ? (
                  <FilterableBarChart
                    data={routesByWeekday}
                    color="#ef4444"
                    selectedLabels={selectedRouteDays}
                    onSelect={handleDaySelect}
                  />
                ) : (
                  <EmptyState message="No routes in this date range." />
                )}
              </CardContent>
            </Card>

            <Card className="bg-white text-slate-900 border-slate-200 shadow-sm lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Revenue by weekday</CardTitle>
                <CardDescription className="text-slate-500">Planned revenue totals</CardDescription>
              </CardHeader>
              <CardContent className="pb-6">
                {hasRouteData ? (
                  <FilterableBarChart
                    data={revenueByWeekday}
                    color="#22c55e"
                    currency
                    selectedLabels={selectedRouteDays}
                    onSelect={handleDaySelect}
                  />
                ) : (
                  <EmptyState message="No revenue data in this date range." />
                )}
              </CardContent>
            </Card>

            <Card className="bg-white text-slate-900 border-slate-200 shadow-sm lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Completion trend</CardTitle>
                <CardDescription className="text-slate-500">
                  Completed stops by route date
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-6">
                {completionTrendData.length > 0 ? (
                  <CompletionTrend data={completionTrendData} />
                ) : (
                  <EmptyState message="No completion data in this date range." />
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="bg-white text-slate-900 border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Service map</CardTitle>
              <CardDescription className="text-slate-500">Stops colored by assigned day</CardDescription>
            </CardHeader>
            <CardContent className="h-[320px] sm:h-[420px] lg:h-[480px]">
              {hasMap ? (
                <APIProvider apiKey={GOOGLE_MAPS_BROWSER_API_KEY}>
                  <MapSection
                    filtered={filteredCustomers}
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

function KpiCard({
  title,
  description,
  value,
  subValue,
  compareValue,
}: {
  title: string
  description?: string
  value: string
  subValue?: string
  compareValue?: string
}) {
  return (
    <Card className="bg-white text-slate-900 border-slate-200 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {description ? <CardDescription className="text-slate-500">{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        {subValue ? <div className="text-xs text-slate-500">{subValue}</div> : null}
        {compareValue ? <div className="text-xs text-slate-500">{compareValue}</div> : null}
      </CardContent>
    </Card>
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

type TooltipPayload = {
  value?: number
}

type TooltipProps = {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string
  currency?: boolean
}

function CustomTooltip({
  active,
  payload,
  label,
  currency,
}: TooltipProps) {
  if (!active || !payload || !payload.length) return null
  const value = Number(payload[0].value || 0)
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-md">
      <div className="font-semibold text-slate-900">{label}</div>
      <div>{currency ? formatCurrency(value, 0) : value}</div>
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
        <RechartsBarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
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
            cursor={onSelect ? 'pointer' : 'default'}
          >
            {data.map((entry, index) => {
              const active = !anySelected || selectedLabels?.includes(entry.label)
              return (
                <Cell
                  key={`${entry.label}-${index}`}
                  fill={color}
                  fillOpacity={active ? 1 : 0.35}
                  onClick={onSelect ? () => onSelect(entry.label) : undefined}
                />
              )
            })}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  )
}

function CompletionTooltip({
  active,
  payload,
  label,
}: Omit<TooltipProps, 'currency'>) {
  if (!active || !payload || !payload.length) return null
  const value = Number(payload[0].value || 0)
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-md">
      <div className="font-semibold text-slate-900">{label}</div>
      <div>{formatPercent(value, 1)}</div>
    </div>
  )
}

function CompletionTrend({ data }: { data: Array<{ date: string; completionRate: number }> }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
          <CartesianGrid stroke="rgba(148, 163, 184, 0.35)" strokeDasharray="4 4" />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#0f172a', fontSize: 12 }}
          />
          <YAxis
            domain={[0, 100]}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#475569', fontSize: 12 }}
            tickFormatter={(value) => `${value}%`}
          />
          <RechartsTooltip content={<CompletionTooltip />} />
          <Line type="monotone" dataKey="completionRate" stroke="#3b82f6" strokeWidth={2} />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
      {message}
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

  const shopLocationPoint = useMemo(
    () => ({ lat: shopLocation.lat, lng: shopLocation.lng }),
    [shopLocation.lat, shopLocation.lng]
  )

  const legendSet = new Set<string>(filtered.map((customer) => customer.day || 'Unscheduled'))
  legendSet.add('Workshop')

  const legendDays = Array.from(legendSet).sort((a, b) => {
    const ai = CUSTOMER_DAYS.indexOf(a)
    const bi = CUSTOMER_DAYS.indexOf(b)
    if (ai === -1 && bi === -1) return a.localeCompare(b)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })

  useEffect(() => {
    if (!map) return
    const points = filtered.filter((customer) => customer.latitude != null && customer.longitude != null)
    if (points.length === 0) {
      map.setCenter(shopLocationPoint)
      map.setZoom(11)
      return
    }

    const bounds = new google.maps.LatLngBounds()
    points.forEach((customer) =>
      bounds.extend({ lat: customer.latitude as number, lng: customer.longitude as number })
    )

    if (points.length === 1) {
      map.setCenter(bounds.getCenter())
      map.setZoom(13)
    } else {
      map.fitBounds(bounds, 40)
    }
  }, [map, filtered, shopLocationPoint])

  return (
    <>
      <GoogleMap
        id="analytics-map-instance"
        mapId="analytics-map"
        defaultCenter={shopLocationPoint}
        defaultZoom={11}
        className="h-full w-full rounded-lg"
        disableDefaultUI={false}
        gestureHandling="greedy"
        onClick={() => onSelectCustomer(null)}
      >
        <AdvancedMarker position={shopLocationPoint} zIndex={8000}>
          <Pin
            background={DAY_COLORS['Workshop'] || '#22c55e'}
            glyphColor="transparent"
            borderColor="#ffffff"
            scale={1.3}
          />
        </AdvancedMarker>

        {filtered.map((customer) => {
          if (customer.latitude == null || customer.longitude == null) return null
          const color = DAY_COLORS[customer.day || ''] || '#0ea5e9'
          return (
            <AdvancedMarker
              key={customer.id}
              position={{ lat: customer.latitude, lng: customer.longitude }}
              zIndex={customer.day === 'Workshop' ? 5000 : undefined}
              onClick={() => onSelectCustomer(customer.id)}
            >
              <Pin background={color} glyphColor="transparent" borderColor="#ffffff" scale={0.84} />
            </AdvancedMarker>
          )
        })}
      </GoogleMap>
      {selectedCustomerId && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/10"
          onClick={() => onSelectCustomer(null)}
        >
          <div
            className="pointer-events-auto max-w-sm rounded-lg border border-slate-200 bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2 p-4">
              {(() => {
                const customer = filtered.find((item) => item.id === selectedCustomerId)
                if (!customer) return null
                return (
                  <>
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-slate-900">
                        {customer.name || 'Customer'}
                      </div>
                      <div className="text-xs text-slate-600">{customer.address}</div>
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Badge variant="secondary" className="bg-slate-100 text-slate-800">
                          {customer.day || 'Unscheduled'}
                        </Badge>
                        {customer.type && (
                          <Badge variant="outline" className="text-slate-700">
                            {customer.type}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <button
                      className="text-xs text-slate-500 hover:text-slate-800"
                      onClick={() => onSelectCustomer(null)}
                    >
                      Close
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
