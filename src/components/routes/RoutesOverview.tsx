'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Calendar,
  MapPin,
  Users,
  Route as RouteIcon,
  Navigation,
  Clock,
} from 'lucide-react'
import Link from 'next/link'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type CustomerSummary = {
  name?: string | null
  cost?: number | null
  additional_work_cost?: number | null
}

type RouteStopSummary = {
  id: string
  customer?: CustomerSummary | CustomerSummary[] | null
}

type RouteSummary = {
  id: string
  name?: string | null
  date: string
  day_of_week: string
  status: string
  driver_id?: string | null
  driver_name?: string | null
  total_distance_miles?: number | null
  total_duration_minutes?: number | null
  estimated_fuel_cost?: number | null
  route_stops?: RouteStopSummary[] | null
}

type CrewMember = {
  id: string
  name: string
  active?: boolean
}

interface RoutesOverviewProps {
  routes: RouteSummary[]
  unscheduledCustomers: Array<{ id: string }>
  crewMembers: CrewMember[]
  routesError?: boolean
  unscheduledError?: boolean
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

const STATUS_OPTIONS = [
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
] as const

type StatusValue = (typeof STATUS_OPTIONS)[number]['value']

export function RoutesOverview({
  routes,
  unscheduledCustomers,
  crewMembers,
  routesError,
  unscheduledError,
}: RoutesOverviewProps) {
  const [dayFilter, setDayFilter] = useState<'all' | string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | StatusValue>('all')
  const [crewFilter, setCrewFilter] = useState<string>('all')

  const getDayColor = (day: string) => {
    const colors: Record<string, string> = {
      Monday: 'bg-rose-100 text-rose-700 border-rose-300',
      Tuesday: 'bg-orange-100 text-orange-700 border-orange-300',
      Wednesday: 'bg-amber-100 text-amber-700 border-amber-300',
      Thursday: 'bg-lime-100 text-lime-700 border-lime-300',
      Friday: 'bg-cyan-100 text-cyan-700 border-cyan-300',
      Saturday: 'bg-blue-100 text-blue-700 border-blue-300',
      Sunday: 'bg-violet-100 text-violet-700 border-violet-300',
    }
    return colors[day] || 'bg-gray-100 text-gray-700 border-gray-300'
  }

  const getStopCustomer = (stop: RouteStopSummary) => {
    if (Array.isArray(stop.customer)) {
      return stop.customer[0] || null
    }
    return stop.customer || null
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      planned: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-amber-100 text-amber-700',
      completed: 'bg-emerald-100 text-emerald-700',
      cancelled: 'bg-red-100 text-red-700',
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
  }

  const filteredRoutes = useMemo(() => {
    return (routes || []).filter((route) => {
      const matchesDay = dayFilter === 'all' || route.day_of_week === dayFilter
      const matchesStatus = statusFilter === 'all' || route.status === statusFilter
      const matchesCrew =
        crewFilter === 'all' ||
        (crewFilter === 'unassigned' ? !route.driver_id : route.driver_id === crewFilter)
      return matchesDay && matchesStatus && matchesCrew
    })
  }, [routes, dayFilter, statusFilter, crewFilter])

  const routesByDay: Record<string, RouteSummary[]> = useMemo(() => {
    const grouped: Record<string, RouteSummary[]> = {}
    filteredRoutes.forEach((route) => {
      const day = route.day_of_week
      if (!grouped[day]) grouped[day] = []
      grouped[day].push(route)
    })
    return grouped
  }, [filteredRoutes])

  const totalStops = filteredRoutes.reduce(
    (sum, route) => sum + (route.route_stops?.length || 0),
    0
  )

  const totalDistance = filteredRoutes.reduce(
    (sum, route) => sum + (Number(route.total_distance_miles) || 0),
    0
  )

  const totalRevenue = filteredRoutes.reduce((sum, route) => {
    const routeRevenue =
      route.route_stops?.reduce((stopSum, stop) => {
        const customer = getStopCustomer(stop)
        const base = Number(customer?.cost || 0)
        const extra = Number(customer?.additional_work_cost || 0)
        return stopSum + base + extra
      }, 0) || 0

    return sum + routeRevenue
  }, 0)

  const todayIso = new Date().toISOString().split('T')[0]
  const todayRoutes = (routes || []).filter((route) => route.date === todayIso)

  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-white px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Routes</h1>
            <p className="text-muted-foreground">
              Optimized service routes for maximum efficiency
            </p>
          </div>
          <Button className="bg-emerald-500 hover:bg-emerald-600" asChild>
            <Link href="/routes/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Route
            </Link>
          </Button>
        </div>

        {(routesError || unscheduledError) && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            Failed to load all route data. Some information may be incomplete.
          </div>
        )}

        {todayRoutes.length > 0 && (
          <Card className="mb-4 border-l-4 border-l-emerald-500">
            <CardHeader className="py-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4" />
                Today&apos;s Routes
              </CardTitle>
              <CardDescription className="text-xs">
                {todayRoutes.length} route
                {todayRoutes.length !== 1 && 's'} scheduled for{' '}
                {new Date(todayIso).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Day:</span>
              <Select
                value={dayFilter}
                onValueChange={(value) => setDayFilter(value as 'all' | string)}
              >
                <SelectTrigger className="h-8 w-[160px]">
                  <SelectValue placeholder="All days" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All days</SelectItem>
                  {DAYS_OF_WEEK.map((day) => (
                    <SelectItem key={day} value={day}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span>Status:</span>
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as 'all' | StatusValue)
                }
              >
                <SelectTrigger className="h-8 w-[180px]">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {crewMembers.length > 0 && (
              <div className="flex items-center gap-2">
                <span>Driver:</span>
                <Select value={crewFilter} onValueChange={setCrewFilter}>
                  <SelectTrigger className="h-8 w-[200px]">
                    <SelectValue placeholder="All drivers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All drivers</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {crewMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-l-4 border-l-emerald-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Stops</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalStops}</div>
                <p className="text-xs text-muted-foreground">
                  Across {filteredRoutes.length} route
                  {filteredRoutes.length !== 1 && 's'}
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Distance</CardTitle>
                <RouteIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalDistance.toFixed(0)} mi</div>
                <p className="text-xs text-muted-foreground">Filtered routes combined</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Weekly Revenue</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalRevenue.toFixed(0)}</div>
                <p className="text-xs text-muted-foreground">From filtered routes</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unscheduled</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{unscheduledCustomers.length}</div>
                <p className="text-xs text-muted-foreground">Customers to assign</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-slate-50 p-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-w-7xl mx-auto">
          {DAYS_OF_WEEK.map((day) => {
            const dayRoutes = routesByDay[day] || []
            const mainRoute = dayRoutes[0]

            if (!mainRoute) {
              return (
                <Card
                  key={day}
                  className={`overflow-hidden transition-all hover:shadow-md border-2 ${getDayColor(
                    day
                  )}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{day}</CardTitle>
                      <Badge variant="secondary" className="bg-white/50">
                        No route
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="py-8 text-center">
                      <MapPin className="mx-auto h-8 w-8 text-muted-foreground/30" />
                      <p className="mt-2 text-xs text-muted-foreground">No route planned</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 text-xs"
                        asChild
                      >
                        <Link href="/routes/new">
                          <Plus className="mr-1 h-3 w-3" />
                          Create Route
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            }

            const stopCount = mainRoute.route_stops?.length || 0
            const routeDistance = Number(mainRoute.total_distance_miles) || 0
            const totalDuration = Number(mainRoute.total_duration_minutes) || 0
            const routeRevenue =
              mainRoute.route_stops?.reduce((sum, stop) => {
                const customer = getStopCustomer(stop)
                return (
                  sum +
                  Number(customer?.cost || 0) +
                  Number(customer?.additional_work_cost || 0)
                )
              }, 0) || 0

            return (
              <Link key={day} href={`/routes/${mainRoute.id}`}>
                <Card
                  className={`overflow-hidden transition-all hover:shadow-lg cursor-pointer border-2 ${getDayColor(
                    day
                  )}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{day}</CardTitle>
                      <div className="flex gap-1">
                        <Badge
                          variant="secondary"
                          className={getStatusColor(mainRoute.status)}
                        >
                          {mainRoute.status}
                        </Badge>
                        <Badge variant="secondary" className="bg-white/50">
                          {stopCount} stops
                        </Badge>
                      </div>
                    </div>
                    {mainRoute.name && (
                      <div className="text-xs text-muted-foreground truncate">
                        {mainRoute.name}
                      </div>
                    )}
                    {mainRoute.driver_name && (
                      <div className="text-xs text-muted-foreground">
                        Driver: {mainRoute.driver_name}
                      </div>
                    )}
                    <CardDescription className="text-xs flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {totalDuration} min route
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Revenue</span>
                        <span className="font-medium">${routeRevenue.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Distance</span>
                        <span className="font-medium">{routeDistance.toFixed(1)} mi</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Avg $/stop</span>
                        <span className="font-medium">
                          ${stopCount > 0 ? (routeRevenue / stopCount).toFixed(2) : '0.00'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Fuel Cost</span>
                        <span className="font-medium">
                          ${(Number(mainRoute.estimated_fuel_cost) || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t">
                      <div className="text-xs text-muted-foreground mb-2">Route Stops</div>
                      <div className="space-y-1">
                        {mainRoute.route_stops
                          ?.slice(0, 3)
                          .map((stop) => {
                            const customer = getStopCustomer(stop)
                            return (
                              <div key={stop.id} className="flex items-center gap-2 text-xs">
                                <div className="h-1.5 w-1.5 rounded-full bg-current" />
                                <span className="truncate flex-1">
                                  {customer?.name}
                                </span>
                                <span className="text-muted-foreground">
                                  ${Number(customer?.cost || 0).toFixed(0)}
                                </span>
                              </div>
                            )
                          })}
                        {stopCount > 3 && (
                          <div className="text-xs text-muted-foreground pl-3">
                            +{stopCount - 3} more stops
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <div className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground">
                        <Navigation className="h-3 w-3" />
                        Click to view route
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
