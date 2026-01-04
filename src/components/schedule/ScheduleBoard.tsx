'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { CalendarRange, MapPin, Clock, DollarSign, CheckCircle2, Plus, Search } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

type ScheduleStop = {
  id: string
  stop_order?: number | null
  customer?: {
    id?: string
    name?: string | null
    address?: string | null
    day?: string | null
    type?: string | null
    cost?: number | null
    additional_work_cost?: number | null
  } | null
}

type ScheduleRoute = {
  id: string
  name?: string | null
  date?: string | null
  day_of_week?: string | null
  status: string
  driver_id?: string | null
  driver_name?: string | null
  total_distance_miles?: number | null
  total_duration_minutes?: number | null
  estimated_fuel_cost?: number | null
  route_stops?: ScheduleStop[]
}

type RecurringPlan = {
  id: string
  frequency: string
  custom_cost?: number | null
  start_date?: string | null
  next_service_date?: string | null
  active?: boolean
  customer?: {
    id?: string
    name?: string | null
    address?: string | null
  } | null
  service?: {
    id?: string
    name?: string | null
    base_cost?: number | null
  } | null
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function sortByDate(a?: string | null, b?: string | null) {
  const aTime = a ? new Date(a).getTime() : Number.MAX_SAFE_INTEGER
  const bTime = b ? new Date(b).getTime() : Number.MAX_SAFE_INTEGER
  return aTime - bTime
}

interface ScheduleBoardProps {
  routes: ScheduleRoute[]
  recurringPlans?: RecurringPlan[]
  crewMembers?: Array<{ id: string; name: string; active?: boolean }>
}

function formatCurrency(value: number | undefined | null) {
  const num = Number(value || 0)
  return num.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

function formatDate(date?: string | null) {
  if (!date) return 'No date'
  const d = new Date(date)
  return d.toLocaleDateString()
}

const statusColors: Record<string, string> = {
  planned: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
}

const FREQUENCY_LABELS: Record<string, string> = {
  once: 'One-time',
  weekly: 'Weekly',
  'bi-weekly': 'Bi-weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  seasonal: 'Seasonal',
  yearly: 'Yearly',
}

export function ScheduleBoard({ routes, recurringPlans, crewMembers }: ScheduleBoardProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [crewFilter, setCrewFilter] = useState<string>('all')

  const filteredRoutes = useMemo(() => {
    const query = search.trim().toLowerCase()
    return routes.filter((route) => {
      if (statusFilter !== 'all' && route.status !== statusFilter) return false
      const matchesCrew =
        crewFilter === 'all' ||
        (crewFilter === 'unassigned' ? !route.driver_id : route.driver_id === crewFilter)
      if (!matchesCrew) return false
      if (!query) return true
      const stops = route.route_stops || []
      return stops.some((stop) => {
        const name = (stop.customer?.name || '').toLowerCase()
        const address = (stop.customer?.address || '').toLowerCase()
        return name.includes(query) || address.includes(query)
      })
    })
  }, [routes, statusFilter, search, crewFilter])

  const recurringByDate = useMemo(() => {
    const recurringPlansList = recurringPlans || []
    if (recurringPlansList.length === 0) return []
    const grouped: Record<string, RecurringPlan[]> = {}

    recurringPlansList.forEach((plan) => {
      const date = plan.next_service_date || plan.start_date
      if (!date) return
      if (!grouped[date]) grouped[date] = []
      grouped[date].push(plan)
    })

    return Object.entries(grouped).sort(([a], [b]) => sortByDate(a, b))
  }, [recurringPlans])

  const grouped = useMemo(() => {
    const byDay: Record<string, ScheduleRoute[]> = {}
    DAYS.forEach((d) => (byDay[d] = []))
    filteredRoutes.forEach((route) => {
      const day = route.day_of_week || 'Unscheduled'
      if (!byDay[day]) byDay[day] = []
      byDay[day]!.push(route)
    })
    Object.values(byDay).forEach((routes) => {
      routes.sort((a, b) => sortByDate(a.date, b.date))
    })
    return byDay
  }, [filteredRoutes])

  const totalStops = filteredRoutes.reduce((sum, r) => sum + (r.route_stops?.length || 0), 0)
  const totalRevenue = filteredRoutes.reduce(
    (sum, r) =>
      sum +
      (r.route_stops || []).reduce(
        (s, stop) =>
          s + Number(stop.customer?.cost || 0) + Number(stop.customer?.additional_work_cost || 0),
        0
      ),
    0
  )

  return (
    <div className="flex-1 bg-slate-50">
      <div className="border-b bg-white px-8 py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Schedule</h1>
            <p className="text-muted-foreground">Weekly calendar view of all scheduled routes</p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/routes">View Routes</Link>
            </Button>
            <Button className="bg-emerald-500 hover:bg-emerald-600" asChild>
              <Link href="/routes/new">
                <Plus className="mr-2 h-4 w-4" />
                New Route
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Routes</CardTitle>
              <CardDescription>Total visible routes</CardDescription>
            </CardHeader>
            <CardContent className="text-3xl font-bold">{filteredRoutes.length}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Stops</CardTitle>
              <CardDescription>Total stops across routes</CardDescription>
            </CardHeader>
            <CardContent className="text-3xl font-bold">{totalStops}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <CardDescription>Planned revenue (incl. add-ons)</CardDescription>
            </CardHeader>
            <CardContent className="text-3xl font-bold">{formatCurrency(totalRevenue)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <CardDescription>Filter by route status</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              {crewMembers && crewMembers.length > 0 && (
                <Select value={crewFilter} onValueChange={setCrewFilter}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Driver" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Drivers</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {crewMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search stops by name or address"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="ghost" onClick={() => setSearch('')} className="text-slate-600">
            Clear
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarRange className="h-5 w-5" />
                Weekly Schedule
              </CardTitle>
              <CardDescription>Click a route to view details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {DAYS.map((day) => {
                  const dayRoutes = grouped[day] || []
                  return (
                    <div key={day} className="rounded-lg border bg-white shadow-sm">
                      <div className="flex items-center justify-between border-b px-4 py-3">
                        <div className="font-semibold">{day}</div>
                        <Badge variant="secondary">{dayRoutes.length} route{dayRoutes.length === 1 ? '' : 's'}</Badge>
                      </div>
                      <div className="max-h-[420px] space-y-3 overflow-y-auto p-4">
                        {dayRoutes.length === 0 && (
                          <div className="text-sm text-muted-foreground">
                            No routes scheduled. <Link className="text-emerald-600" href="/routes/new">Create one</Link>.
                          </div>
                        )}
                        {dayRoutes.map((route) => {
                          const stops = route.route_stops || []
                          const stopCount = stops.length
                          const revenue = stops.reduce(
                            (sum, stop) =>
                              sum +
                              Number(stop.customer?.cost || 0) +
                              Number(stop.customer?.additional_work_cost || 0),
                            0
                          )
                          const statusClass = statusColors[route.status] || 'bg-slate-100 text-slate-700'
                          return (
                            <Link
                              key={route.id}
                              href={`/routes/${route.id}`}
                              className="block rounded-md border border-slate-200 bg-slate-50 p-3 hover:border-emerald-400 hover:bg-emerald-50/40 transition"
                            >
                              <div className="flex items-center justify-between">
                                <div className="font-semibold text-slate-900">
                                  {route.name || formatDate(route.date)}
                                </div>
                                <Badge className={cn('capitalize', statusClass)}>{route.status.replace('_', ' ')}</Badge>
                              </div>
                              {route.name && (
                                <div className="text-xs text-slate-500">
                                  {formatDate(route.date)}
                                </div>
                              )}
                              {route.driver_name && (
                                <div className="text-xs text-slate-500">Driver: {route.driver_name}</div>
                              )}
                              <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  {stopCount} stop{stopCount === 1 ? '' : 's'}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <DollarSign className="h-4 w-4" />
                                  {formatCurrency(revenue)}
                                </span>
                                {route.total_duration_minutes && (
                                  <span className="inline-flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    {route.total_duration_minutes} min
                                  </span>
                                )}
                              </div>
                              <div className="mt-3 space-y-1 text-sm text-slate-700">
                                {stops.slice(0, 4).map((stop) => (
                                  <div key={stop.id} className="flex items-start gap-2">
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                                    <div className="min-w-0">
                                      <div className="truncate font-medium">
                                        {stop.customer?.name || 'Customer'}
                                      </div>
                                      <div className="truncate text-xs text-slate-500">
                                        {stop.customer?.address}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                {stopCount > 4 && (
                                  <div className="text-xs text-slate-500">+{stopCount - 4} more stops</div>
                                )}
                              </div>
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
          {recurringByDate.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarRange className="h-5 w-5" />
                  Recurring Services
                </CardTitle>
                <CardDescription>Upcoming plans in the next 7 days</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {recurringByDate.map(([date, plans]) => (
                  <div key={date} className="space-y-2">
                    <div className="text-xs font-semibold text-slate-600">{formatDate(date)}</div>
                    <div className="space-y-2">
                      {plans.map((plan) => {
                        const label = FREQUENCY_LABELS[plan.frequency] || plan.frequency
                        const cost =
                          plan.custom_cost != null
                            ? formatCurrency(plan.custom_cost)
                            : plan.service?.base_cost != null
                            ? formatCurrency(plan.service.base_cost)
                            : 'N/A'

                        return (
                          <div key={plan.id} className="rounded-md border bg-white p-3 text-sm">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <div className="font-medium">{plan.service?.name || 'Service'}</div>
                                <div className="text-xs text-slate-500">
                                  {plan.customer?.name || 'Customer'}
                                  {plan.customer?.address ? `  - ${plan.customer.address}` : ''}
                                </div>
                                <div className="text-xs text-slate-500">{label}</div>
                              </div>
                              <div className="text-xs text-slate-600">{cost}</div>
                            </div>
                            {plan.customer?.id && (
                              <div className="mt-2 text-xs">
                                <Link href={`/customers/${plan.customer.id}`} className="text-emerald-600 hover:underline">
                                  View customer
                                </Link>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
