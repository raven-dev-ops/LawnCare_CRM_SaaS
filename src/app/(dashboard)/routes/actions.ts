'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/roles'
import { revalidatePath } from 'next/cache'
import { GOOGLE_MAPS_SERVER_API_KEY } from '@/lib/config'
import { getShopLocation } from '@/lib/settings'
import { buildStopOrderIds, chunkRouteStops, estimateRouteMetrics, getCompletionPlan, GOOGLE_DIRECTIONS_MAX_WAYPOINTS, optimizeRouteNearestNeighborWithIndices } from '@/lib/routes'
import { logAuditEvent } from '@/lib/audit'

const SERVICE_TIME_PER_STOP_MIN = 30

type AuthClient = Awaited<ReturnType<typeof createClient>>
type AuthClientResult = { supabase: AuthClient } | { error: string }

async function requireAuthenticatedClient(): Promise<AuthClientResult> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()

  if (error) {
    console.error('Auth user lookup failed:', error)
  }

  if (!data.user) {
    return { error: 'Authentication required.' }
  }

  return { supabase }
}

type RouteStop = {
  id: string
  latitude: number | null
  longitude: number | null
}

type LatLng = {
  lat: number
  lng: number
}

type DirectionsLeg = {
  distance?: { value?: number }
  duration?: { value?: number }
}

type DirectionsRoute = {
  legs?: DirectionsLeg[]
  waypoint_order?: number[]
}

type DirectionsResponse = {
  status?: string
  routes?: DirectionsRoute[]
}

type OptimizedRouteResult = {
  orderedCustomers: RouteStop[]
  drivingDistanceMiles: number
  drivingDurationMinutes: number
  orderIndices: number[]
  warning?: string
}

function getLatLng(point: RouteStop | null) {
  if (!point || point.latitude == null || point.longitude == null) {
    return null
  }
  return { lat: point.latitude, lng: point.longitude }
}

function buildEstimatedRoute(
  orderedCustomers: RouteStop[],
  shopLocation: LatLng,
  orderIndices: number[],
  warning?: string
): OptimizedRouteResult {
  const metrics = estimateRouteMetrics(orderedCustomers, shopLocation)

  return {
    orderedCustomers,
    drivingDistanceMiles: metrics.distanceMiles,
    drivingDurationMinutes: metrics.durationMinutes,
    orderIndices,
    warning,
  }
}

async function fetchDirectionsMetrics(
  origin: LatLng,
  destination: LatLng,
  waypoints: LatLng[]
) {
  if (!GOOGLE_MAPS_SERVER_API_KEY) {
    return null
  }

  const originParam = `${origin.lat},${origin.lng}`
  const destinationParam = `${destination.lat},${destination.lng}`
  const waypointParam = waypoints.length
    ? `&waypoints=${waypoints.map((point) => encodeURIComponent(`${point.lat},${point.lng}`)).join('|')}`
    : ''
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originParam}&destination=${destinationParam}${waypointParam}&mode=driving&key=${GOOGLE_MAPS_SERVER_API_KEY}`

  const response = await fetch(url)
  if (!response.ok) {
    return null
  }

  const data = (await response.json()) as DirectionsResponse
  if (data.status !== 'OK' || !data.routes?.[0]) {
    return null
  }

  const legs: DirectionsLeg[] = data.routes[0].legs ?? []
  const totalDistanceMeters = legs.reduce(
    (sum, leg) => sum + (leg.distance?.value ?? 0),
    0
  )
  const totalDurationSeconds = legs.reduce(
    (sum, leg) => sum + (leg.duration?.value ?? 0),
    0
  )

  return {
    distanceMiles: totalDistanceMeters / 1609.34,
    durationMinutes: Math.round(totalDurationSeconds / 60),
  }
}

async function getChunkedDirectionsMetrics(
  orderedCustomers: RouteStop[],
  shopLocation: LatLng
) {
  const chunks = chunkRouteStops(orderedCustomers, GOOGLE_DIRECTIONS_MAX_WAYPOINTS)
  let totalDistance = 0
  let totalDuration = 0
  let origin = { lat: shopLocation.lat, lng: shopLocation.lng }

  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i]
    if (chunk.length === 0) continue

    const isLast = i === chunks.length - 1
    const destinationStop = isLast ? null : chunk[chunk.length - 1]
    const destination = isLast ? shopLocation : getLatLng(destinationStop)
    if (!destination) {
      return null
    }

    const waypointStops = isLast ? chunk : chunk.slice(0, -1)
    const waypointCoords: LatLng[] = []
    for (const stop of waypointStops) {
      const coords = getLatLng(stop)
      if (!coords) {
        return null
      }
      waypointCoords.push(coords)
    }

    const metrics = await fetchDirectionsMetrics(origin, destination, waypointCoords)
    if (!metrics) {
      return null
    }

    totalDistance += metrics.distanceMiles
    totalDuration += metrics.durationMinutes
    origin = destination
  }

  return {
    distanceMiles: totalDistance,
    durationMinutes: totalDuration,
  }
}

async function getOptimizedRoute(customers: RouteStop[], shopLocation: LatLng): Promise<OptimizedRouteResult> {
  const allHaveCoords = customers.every(
    (c) => c.latitude != null && c.longitude != null
  )
  const canUseGoogle = Boolean(GOOGLE_MAPS_SERVER_API_KEY) && customers.length >= 2 && allHaveCoords
  const exceedsWaypointLimit = customers.length > GOOGLE_DIRECTIONS_MAX_WAYPOINTS

  // Fallback helper that uses nearest-neighbor and rough drive time
  const fallbackNearestNeighbor = (warning?: string) => {
    const { ordered, orderIndices } = optimizeRouteNearestNeighborWithIndices(customers, shopLocation)
    return buildEstimatedRoute(ordered, shopLocation, orderIndices, warning)
  }

  if (!canUseGoogle) {
    return fallbackNearestNeighbor()
  }

  if (exceedsWaypointLimit) {
    const { ordered, orderIndices } = optimizeRouteNearestNeighborWithIndices(customers, shopLocation)
    const warning = `Route has ${customers.length} stops. Using chunked optimization to stay within the ${GOOGLE_DIRECTIONS_MAX_WAYPOINTS}-stop Directions API limit.`
    const metrics = await getChunkedDirectionsMetrics(ordered, shopLocation)

    if (!metrics) {
      return buildEstimatedRoute(
        ordered,
        shopLocation,
        orderIndices,
        `${warning} Using estimated distance and time.`
      )
    }

    return {
      orderedCustomers: ordered,
      drivingDistanceMiles: metrics.distanceMiles,
      drivingDurationMinutes: metrics.durationMinutes,
      orderIndices,
      warning,
    }
  }

  try {
    const origin = `${shopLocation.lat},${shopLocation.lng}`
    const waypointStrings = customers.map(
      (c) => `${c.latitude},${c.longitude}`
    )
    const waypointsParam = waypointStrings.map(encodeURIComponent).join('|')
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${origin}&waypoints=optimize:true|${waypointsParam}&mode=driving&key=${GOOGLE_MAPS_SERVER_API_KEY}`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Directions API failed: ${response.status} ${response.statusText}`)
    }

    const data = (await response.json()) as DirectionsResponse
    if (data.status !== 'OK' || !data.routes?.[0]) {
      throw new Error(`Directions API error status: ${data.status}`)
    }

    const waypointOrder = data.routes[0].waypoint_order ?? []
    if (!Array.isArray(waypointOrder) || waypointOrder.length !== customers.length) {
      throw new Error('Directions API returned invalid waypoint_order')
    }

    const orderedCustomers = waypointOrder.map((idx) => customers[idx])
    const legs: DirectionsLeg[] = data.routes[0].legs ?? []
    const totalDistanceMeters = legs.reduce(
      (sum, leg) => sum + (leg.distance?.value ?? 0),
      0
    )
    const totalDurationSeconds = legs.reduce(
      (sum, leg) => sum + (leg.duration?.value ?? 0),
      0
    )

    return {
      orderedCustomers,
      drivingDistanceMiles: totalDistanceMeters / 1609.34,
      drivingDurationMinutes: totalDurationSeconds / 60,
      orderIndices: waypointOrder,
    }
  } catch (error) {
    console.error('Google Directions optimize error:', error)
    return fallbackNearestNeighbor()
  }
}

interface CreateRouteInput {
  name?: string | null
  day_of_week: string
  date: string
  customers: Array<{ id: string }>
  driverId?: string | null
}

interface UpdateRouteStatusInput {
  routeId: string
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled'
  startTime?: string
  endTime?: string
  totalDurationMinutes?: number
}

interface UpdateStopInput {
  stopId: string
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'cancelled'
  serviceNotes?: string
  skipReason?: string
  actualArrivalTime?: string
  actualDepartureTime?: string
  actualDurationMinutes?: number
}

interface AddStopInput {
  routeId: string
  customerId: string
}

export async function createRoute(input: CreateRouteInput) {
  const supabase = await createClient()
  // Fetch customer details to calculate route metrics
  const { data: customers } = await supabase
    .from('customers')
    .select('id, latitude, longitude, archived_at')
    .in(
      'id',
      input.customers.map((c) => c.id)
    )

  if (!customers || customers.length === 0) {
    return { error: 'No customers found' }
  }

  let driverName: string | null = null
  if (input.driverId) {
    const { data: driver, error: driverError } = await supabase
      .from('crew_members')
      .select('name')
      .eq('id', input.driverId)
      .maybeSingle()

    if (driverError) {
      console.error('Driver lookup error:', driverError)
      return { error: 'Failed to assign driver.' }
    }

    if (!driver) {
      return { error: 'Selected driver not found.' }
    }

    driverName = driver.name
  }

  // Optimize order using Google Directions (falls back to nearest-neighbor)
  const shopLocation = await getShopLocation()

  const {
    orderedCustomers,
    drivingDistanceMiles,
    drivingDurationMinutes,
    orderIndices,
    warning,
  } = await getOptimizedRoute(customers, shopLocation)

  // Use Google's driving time as the estimated route duration (no extra per-stop padding)
  const totalDuration = Math.round(drivingDurationMinutes)
  const fuelCost = drivingDistanceMiles * 0.15

  // Create route
  const { data: route, error: routeError } = await supabase
    .from('routes')
    .insert({
      name: input.name?.trim() || null,
      date: input.date,
      day_of_week: input.day_of_week,
      status: 'planned',
      driver_id: input.driverId ?? null,
      driver_name: driverName,
      total_distance_miles: drivingDistanceMiles,
      total_distance_km: drivingDistanceMiles * 1.60934,
      total_duration_minutes: totalDuration,
      estimated_fuel_cost: fuelCost,
      optimized_waypoints: {
        waypoints: orderedCustomers.map((c) => ({
          lat: c.latitude,
          lng: c.longitude,
        })),
        order: orderIndices,
      },
    })
    .select()
    .single()

  if (routeError || !route) {
    return { error: 'Failed to create route' }
  }

  // Create route stops
  const routeStops = orderedCustomers.map((customer, index) => {
    return {
      route_id: route.id,
      customer_id: customer.id,
      stop_order: index + 1,
      status: 'pending',
      estimated_duration_minutes: SERVICE_TIME_PER_STOP_MIN,
    }
  })

  const { error: stopsError } = await supabase
    .from('route_stops')
    .insert(routeStops)

  if (stopsError) {
    // Rollback route creation
    await supabase.from('routes').delete().eq('id', route.id)
    return { error: 'Failed to create route stops' }
  }

  await logAuditEvent(supabase, {
    action: 'create',
    entityType: 'route',
    entityId: route.id,
    afterData: route,
  })

  revalidatePath('/routes')
  return { success: true, routeId: route.id, warning }
}

export async function updateRouteStatus(input: UpdateRouteStatusInput) {
  const auth = await requireAuthenticatedClient()
  if ('error' in auth) {
    return { error: auth.error }
  }
  const supabase = auth.supabase

  try {
    const { data: before } = await supabase
      .from('routes')
      .select('*')
      .eq('id', input.routeId)
      .maybeSingle()

    interface RouteUpdate {
      status: string
      updated_at: string
      start_time?: string
      end_time?: string
      total_duration_minutes?: number
    }

    const updateData: RouteUpdate = {
      status: input.status,
      updated_at: new Date().toISOString(),
    }

    if (input.startTime) {
      updateData.start_time = input.startTime
    }

    if (input.endTime) {
      updateData.end_time = input.endTime
    }

    if (input.totalDurationMinutes !== undefined) {
      updateData.total_duration_minutes = input.totalDurationMinutes
    }

    const { data, error } = await supabase
      .from('routes')
      .update(updateData)
      .eq('id', input.routeId)
      .select()
      .maybeSingle()

    if (error) {
      console.error('Update route status error:', error)
      return { error: 'Failed to update route status' }
    }

    await logAuditEvent(supabase, {
      action: 'status_change',
      entityType: 'route',
      entityId: input.routeId,
      beforeData: before ?? null,
      afterData: data ?? null,
    })
    revalidatePath(`/routes/${input.routeId}`)
    revalidatePath('/routes')
    return { success: true, route: data || null }
  } catch (error) {
    console.error('Update route status error:', error)
    return { error: 'An unexpected error occurred' }
  }
}

export async function addStopToRoute(input: AddStopInput) {
  const supabase = await createClient()
  // Fetch route with existing stops and customer coords
  const { data: route, error: routeError } = await supabase
    .from('routes')
    .select(
      `
      id,
      route_stops (
        id,
        customer_id,
        status,
        estimated_duration_minutes,
        customers (
          latitude,
          longitude
        )
      )
    `
    )
    .eq('id', input.routeId)
    .single()

  if (routeError || !route) {
    console.error('Add stop route fetch error:', routeError)
    return { error: 'Route not found' }
  }

  // Check if customer already in route
  const existingStop = route.route_stops?.find(
    (stop) => stop.customer_id === input.customerId
  )
  if (existingStop) {
    return { error: 'Customer is already in this route' }
  }

  // Fetch new customer details
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('id, latitude, longitude, archived_at')
    .eq('id', input.customerId)
    .single()

  if (customerError || !customer) {
    console.error('Add stop customer fetch error:', customerError)
    return { error: 'Customer not found' }
  }

  if (customer.archived_at) {
    return { error: 'Customer is archived and cannot be added to routes' }
  }


  if (customer.latitude == null || customer.longitude == null) {
    return { error: 'Customer is missing coordinates, cannot add to route' }
  }

  const stops = route.route_stops || []
  const optimizationInput = [
    ...stops.map((stop) => {
      const stopCustomer = Array.isArray(stop.customers) ? stop.customers[0] : stop.customers
      return {
        id: stop.customer_id,
        latitude: stopCustomer?.latitude ?? null,
        longitude: stopCustomer?.longitude ?? null,
        stopId: stop.id,
        status: stop.status,
        estimated_duration_minutes:
          stop.estimated_duration_minutes ?? SERVICE_TIME_PER_STOP_MIN,
      }
    }),
    {
      id: customer.id,
      latitude: customer.latitude,
      longitude: customer.longitude,
      stopId: null,
      status: 'pending',
      estimated_duration_minutes: SERVICE_TIME_PER_STOP_MIN,
    },
  ]

  // If any existing stop lacks coordinates, abort (should be rare after geocoding)
  const missingCoords = optimizationInput.some(
    (s) => s.latitude == null || s.longitude == null
  )
  if (missingCoords) {
    return { error: 'One or more stops are missing coordinates; cannot optimize' }
  }

  const shopLocation = await getShopLocation()

  const { orderedCustomers, drivingDistanceMiles, drivingDurationMinutes, orderIndices, warning } =
    await getOptimizedRoute(optimizationInput, shopLocation)

  // Update route metrics
  // Keep estimated time aligned with Google's driving time only
  const totalDuration = Math.round(drivingDurationMinutes)
  const fuelCost = drivingDistanceMiles * 0.15

  const { error: routeUpdateError } = await supabase
    .from('routes')
    .update({
      total_distance_miles: drivingDistanceMiles,
      total_distance_km: drivingDistanceMiles * 1.60934,
      total_duration_minutes: totalDuration,
      estimated_fuel_cost: fuelCost,
      optimized_waypoints: {
        waypoints: orderedCustomers.map((c) => ({
          lat: c.latitude,
          lng: c.longitude,
        })),
        order: orderIndices,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.routeId)

  if (routeUpdateError) {
    console.error('Add stop route update error:', routeUpdateError)
    return { error: 'Failed to update route metrics' }
  }

  // Reorder existing stops and insert the new one
  const orderedEntries = orderIndices.map((idx) => optimizationInput[idx])
  const newEntry = orderedEntries.find((entry) => !entry.stopId)
  let newStopId: string | null = null

  if (newEntry) {
    const { data: insertedStop, error: stopInsertError } = await supabase
      .from('route_stops')
      .insert({
        route_id: input.routeId,
        customer_id: newEntry.id,
        stop_order: orderedEntries.length,
        status: 'pending',
        estimated_duration_minutes:
          newEntry.estimated_duration_minutes ?? SERVICE_TIME_PER_STOP_MIN,
      })
      .select('id')
      .single()

    if (stopInsertError || !insertedStop) {
      console.error('Add stop insert error:', stopInsertError)
      return { error: 'Failed to add new stop' }
    }

    newStopId = insertedStop.id
  }

  const orderedStopIds = buildStopOrderIds(orderedEntries, newStopId)
  if (orderedStopIds.some((id) => !id)) {
    console.error('Add stop reorder error: missing stop id for ordering')
    return { error: 'Failed to compute stop order' }
  }

  const { error: batchOrderError } = await supabase.rpc('update_route_stop_orders', {
    route_id: input.routeId,
    stop_ids: orderedStopIds,
  })

  if (batchOrderError) {
    console.error('Add stop batch reorder error:', batchOrderError)
    for (let i = 0; i < orderedEntries.length; i++) {
      const stopId = orderedEntries[i].stopId ?? newStopId
      if (!stopId) {
        return { error: 'Failed to reorder stops' }
      }
      const { error: stopUpdateError } = await supabase
        .from('route_stops')
        .update({ stop_order: i + 1 })
        .eq('id', stopId)

      if (stopUpdateError) {
        console.error('Add stop reorder error:', stopUpdateError)
        return { error: 'Failed to reorder existing stops' }
      }
    }
  }

  await logAuditEvent(supabase, {
    action: 'add_stop',
    entityType: 'route',
    entityId: input.routeId,
    afterData: {
      customerId: input.customerId,
      newStopId,
      stopOrder: orderedStopIds,
    },
  })

  revalidatePath(`/routes/${input.routeId}`)
  revalidatePath('/routes')

  return { success: true, warning }
}

interface AssignRouteDriverInput {
  routeId: string
  driverId: string | null
}

export async function assignRouteDriver(input: AssignRouteDriverInput) {
  const supabase = await createClient()

  let driverName: string | null = null

  const { data: before } = await supabase
    .from('routes')
    .select('*')
    .eq('id', input.routeId)
    .maybeSingle()

  if (input.driverId) {
    const { data: driver, error: driverError } = await supabase
      .from('crew_members')
      .select('name')
      .eq('id', input.driverId)
      .maybeSingle()

    if (driverError) {
      console.error('Assign driver lookup error:', driverError)
      return { error: 'Failed to assign driver.' }
    }

    if (!driver) {
      return { error: 'Selected driver not found.' }
    }

    driverName = driver.name
  }

  const { data, error } = await supabase
    .from('routes')
    .update({
      driver_id: input.driverId ?? null,
      driver_name: driverName,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.routeId)
    .select()
    .maybeSingle()

  if (error) {
    console.error('Assign driver update error:', error)
    return { error: 'Failed to assign driver.' }
  }

  await logAuditEvent(supabase, {
    action: 'assign_driver',
    entityType: 'route',
    entityId: input.routeId,
    beforeData: before ?? null,
    afterData: data ?? null,
  })

  revalidatePath(`/routes/${input.routeId}`)
  revalidatePath('/routes')
  revalidatePath('/schedule')

  return { success: true, driverName }
}

export async function updateRouteStop(input: UpdateStopInput) {
  const supabase = await createClient()
  try {
    const { data: before } = await supabase
      .from('route_stops')
      .select('*')
      .eq('id', input.stopId)
      .maybeSingle()
    interface StopUpdate {
      status: string
      updated_at: string
      service_notes?: string
      skip_reason?: string
      actual_arrival_time?: string
      actual_departure_time?: string
      actual_duration_minutes?: number
      completed_at?: string
    }

    const updateData: StopUpdate = {
      status: input.status,
      updated_at: new Date().toISOString(),
    }

    if (input.serviceNotes !== undefined) {
      updateData.service_notes = input.serviceNotes
    }

    if (input.skipReason !== undefined) {
      updateData.skip_reason = input.skipReason
    }

    if (input.actualArrivalTime) {
      updateData.actual_arrival_time = input.actualArrivalTime
    }

    if (input.actualDepartureTime) {
      updateData.actual_departure_time = input.actualDepartureTime
    }

    if (input.actualDurationMinutes !== undefined) {
      updateData.actual_duration_minutes = input.actualDurationMinutes
    }

    if (input.status === 'completed') {
      updateData.completed_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('route_stops')
      .update(updateData)
      .eq('id', input.stopId)
      .select()
      .maybeSingle()

    if (error) {
      console.error('Update route stop error:', error)
      return { error: 'Failed to update route stop' }
    }

    await logAuditEvent(supabase, {
      action: 'update_stop',
      entityType: 'route_stop',
      entityId: input.stopId,
      beforeData: before ?? null,
      afterData: data ?? null,
    })

    // Get route_id to revalidate
    const { data: stop } = await supabase
      .from('route_stops')
      .select('route_id')
      .eq('id', input.stopId)
      .maybeSingle()

    if (stop) {
      revalidatePath(`/routes/${stop.route_id}`)
    }

    return { success: true, stop: data || null }
  } catch (error) {
    console.error('Update route stop error:', error)
    return { error: 'An unexpected error occurred' }
  }
}

export async function startRoute(routeId: string) {
  return updateRouteStatus({
    routeId,
    status: 'in_progress',
    startTime: new Date().toISOString(),
  })
}

export async function completeRoute(routeId: string) {
  const auth = await requireAuthenticatedClient()
  if ('error' in auth) {
    return { error: auth.error }
  }
  const supabase = auth.supabase

  const { data: route, error: routeFetchError } = await supabase
    .from('routes')
    .select('status, start_time')
    .eq('id', routeId)
    .maybeSingle()

  if (routeFetchError) {
    console.error('Fetch route failed:', routeFetchError)
  }

  const plan = getCompletionPlan(route?.status ?? null, route?.start_time ?? null)
  if (plan.alreadyCompleted) {
    return { success: true, alreadyCompleted: true }
  }

  const { startIso, endTime, durationMinutes } = plan

  const result = await updateRouteStatus({
    routeId,
    status: 'completed',
    startTime: startIso,
    endTime,
  })

  if (result.success) {
    // Record the actual duration for analytics
    const { error: rtError } = await supabase.from('route_times').insert({
      route_id: routeId,
      started_at: startIso,
      ended_at: endTime,
      duration_minutes: durationMinutes,
    })

    if (rtError) {
      console.error('route_times insert failed:', rtError)
      return { error: `Failed to record route duration: ${rtError.message}` }
    }

    // Update the stored average on routes (in case trigger fails/lagging)
    const { data: avgRows, error: avgError } = await supabase
      .from('route_times')
      .select('duration_minutes')
      .eq('route_id', routeId)

    if (!avgError && avgRows) {
      const durations = avgRows
        .map((r) => (r.duration_minutes != null ? Number(r.duration_minutes) : null))
        .filter((v): v is number => v !== null)
      if (durations.length > 0) {
        const avg = durations.reduce((a, b) => a + b, 0) / durations.length
        const { error: avgUpdateError } = await supabase
          .from('routes')
          .update({ average_duration_minutes: avg })
          .eq('id', routeId)
        if (avgUpdateError) {
          console.error('routes average_duration_minutes update failed:', avgUpdateError)
        }
      }
    } else if (avgError) {
      console.error('route_times average fetch failed:', avgError)
    }
  }

  return result
}

export async function deleteRoute(routeId: string) {
  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) {
    return { error: adminCheck.error }
  }

  const supabase = await createClient()

  try {
    const { data: existing } = await supabase
      .from('routes')
      .select('*')
      .eq('id', routeId)
      .maybeSingle()

    // Delete route
    const { error: routeError } = await supabase
      .from('routes')
      .delete()
      .eq('id', routeId)

    if (routeError) {
      console.error('Delete route error:', routeError)
      return { error: 'Failed to delete route' }
    }

    await logAuditEvent(supabase, {
      action: 'delete',
      entityType: 'route',
      entityId: routeId,
      beforeData: existing ?? null,
      afterData: null,
    })

    revalidatePath('/routes')
    return { success: true }
  } catch (error) {
    console.error('Delete route error:', error)
    return { error: 'An unexpected error occurred' }
  }
}
