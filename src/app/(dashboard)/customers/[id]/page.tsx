import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import type { Customer } from '@/types/database.types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CustomerDetailActions } from '@/components/customers/CustomerDetailActions'
import { Calendar, MapPin, Ruler } from 'lucide-react'

const DAY_COLORS: Record<string, string> = {
  Monday: 'bg-rose-100 text-rose-700',
  Tuesday: 'bg-orange-100 text-orange-700',
  Wednesday: 'bg-amber-100 text-amber-700',
  Thursday: 'bg-lime-100 text-lime-700',
  Friday: 'bg-cyan-100 text-cyan-700',
  Saturday: 'bg-blue-100 text-blue-700',
  Sunday: 'bg-violet-100 text-violet-700',
}

const TYPE_COLORS: Record<string, string> = {
  Residential: 'bg-emerald-100 text-emerald-700',
  Commercial: 'bg-blue-100 text-blue-700',
  Workshop: 'bg-purple-100 text-purple-700',
}

function formatCurrency(value: number | null | undefined) {
  const amount = Number(value || 0)
  return `$${amount.toFixed(2)}`
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Unknown'
  return new Date(value).toLocaleDateString()
}

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: customer, error } = await supabase
    .from('customers')
    .select(
      'id, name, address, type, day, cost, has_additional_work, additional_work_cost, latitude, longitude, distance_from_shop_miles, created_at, updated_at'
    )
    .eq('id', id)
    .single()

  if (error || !customer) {
    notFound()
  }

  const customerRecord = customer as Customer

  const { data: serviceHistory } = await supabase
    .from('service_history')
    .select('id, service_date, service_type, cost, duration_minutes, notes')
    .eq('customer_id', id)
    .order('service_date', { ascending: false })
    .limit(10)

  const { data: routeStops } = await supabase
    .from('route_stops')
    .select('id, stop_order, status, route:routes (id, name, day_of_week, date, status)')
    .eq('customer_id', id)
    .order('created_at', { ascending: false })

  const dayLabel = customerRecord.day || 'Unscheduled'
  const dayBadgeClass = DAY_COLORS[dayLabel] || 'bg-slate-100 text-slate-700'
  const typeBadgeClass = TYPE_COLORS[customerRecord.type] || 'bg-slate-100 text-slate-700'

  return (
    <div className="p-8 space-y-6">
      <div className="space-y-3">
        <div className="text-sm text-muted-foreground">
          <Link href="/customers" className="hover:underline">Customers</Link>
          <span className="px-2">/</span>
          <span>{customerRecord.name}</span>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{customerRecord.name}</h1>
            <p className="text-muted-foreground">{customerRecord.address}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="secondary" className={typeBadgeClass}>
                {customerRecord.type}
              </Badge>
              <Badge variant="secondary" className={dayBadgeClass}>
                {dayLabel}
              </Badge>
              <Badge variant="outline">Customer since {formatDate(customerRecord.created_at)}</Badge>
            </div>
          </div>
          <CustomerDetailActions customer={customerRecord} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>Core customer details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{customerRecord.address}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Service day: {dayLabel}</span>
            </div>
            <div className="flex items-center gap-2">
              <Ruler className="h-4 w-4 text-muted-foreground" />
              <span>
                Distance from shop:{' '}
                {customerRecord.distance_from_shop_miles != null
                  ? `${Number(customerRecord.distance_from_shop_miles).toFixed(1)} mi`
                  : 'Not calculated'}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              Coordinates: {customerRecord.latitude ?? 'N/A'}, {customerRecord.longitude ?? 'N/A'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
            <CardDescription>Service cost details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Base cost</span>
              <span className="font-medium">{formatCurrency(customerRecord.cost)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Additional work</span>
              <span className="font-medium">
                {customerRecord.has_additional_work
                  ? formatCurrency(customerRecord.additional_work_cost)
                  : 'None'}
              </span>
            </div>
            <div className="flex items-center justify-between border-t pt-2">
              <span className="text-muted-foreground">Estimated total</span>
              <span className="font-semibold">
                {formatCurrency(
                  Number(customerRecord.cost || 0) + Number(customerRecord.additional_work_cost || 0)
                )}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Service Stats</CardTitle>
            <CardDescription>Recent history summary</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Recent services</span>
              <span className="font-medium">{serviceHistory?.length || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Last updated</span>
              <span className="font-medium">{formatDate(customerRecord.updated_at)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Service History</CardTitle>
            <CardDescription>Most recent completed services</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!serviceHistory || serviceHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No service history yet.</p>
            ) : (
              <div className="space-y-3">
                {serviceHistory.map((entry) => (
                  <div key={entry.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="font-medium">{entry.service_type}</div>
                      <div className="text-muted-foreground">{formatDate(entry.service_date)}</div>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Cost: {formatCurrency(entry.cost)}</span>
                      <span>Duration: {entry.duration_minutes ?? 'N/A'} min</span>
                    </div>
                    {entry.notes && (
                      <p className="mt-2 text-xs text-muted-foreground">{entry.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Routes and Stops</CardTitle>
            <CardDescription>Where this customer appears on routes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!routeStops || routeStops.length === 0 ? (
              <p className="text-sm text-muted-foreground">No routes yet.</p>
            ) : (
              <div className="space-y-3">
                {routeStops.map((stop) => (
                  <div key={stop.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">
                        {stop.route?.name || `${stop.route?.day_of_week || 'Route'} Route`}
                      </div>
                      <Badge variant="secondary" className="capitalize">
                        {stop.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {stop.route?.date ? formatDate(stop.route.date) : 'Date TBD'}
                      {stop.stop_order ? ` | Stop ${stop.stop_order}` : ''}
                    </div>
                    {stop.route?.id && (
                      <div className="mt-2 text-xs">
                        <Link
                          href={`/routes/${stop.route.id}`}
                          className="text-emerald-600 hover:underline"
                        >
                          View route details
                        </Link>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
            <CardDescription>Customer-specific notes</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Notes will appear here once saved for this customer.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attachments</CardTitle>
            <CardDescription>Photos and files</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Attachments support is coming soon.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
