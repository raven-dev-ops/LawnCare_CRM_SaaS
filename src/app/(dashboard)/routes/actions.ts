'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/roles'
import { revalidatePath } from 'next/cache'
import { GOOGLE_MAPS_SERVER_API_KEY } from '@/lib/config'
import { getShopLocation } from '@/lib/settings'
import { haversineMiles } from '@/lib/geo'
import { optimizeRouteNearestNeighbor } from '@/lib/routes'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const SERVICE_TIME_PER_STOP_MIN = 30

function getServiceSupabase() {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase service role env vars are missing')
  }

  return createServiceClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

async function getOptimizedRoute(customers: Array<{ id: string; latitude: number | null; longitude: number | null }>, shopLocation: { lat: number; lng: number }) {
  const allHaveCoords = customers.every(
    (c) => c.latitude != null && c.longitude != null
  )
  const canUseGoogle = Boolean(GOOGLE_MAPS_SERVER_API_KEY) && customers.length >= 2 && allHaveCoords

  // Fallback helper that uses nearest-neighbor and rough drive time
  const fallbackNearestNeighbor = () => {
    const ordered = optimizeRouteNearestNeighbor(customers, shopLocation)
    let distance = 0
    let prev = { lat: shopLocation.lat, lng: shopLocation.lng }

    ordered.forEach((customer) => {
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

    const last = ordered[ordered.length - 1]
    if (last?.latitude && last?.longitude) {
      distance += haversineMiles(
        last.latitude,
        last.longitude,
        shopLocation.lat,
        shopLocation.lng
      )
    }

    return {
      orderedCustomers: ordered,
      drivingDistanceMiles: distance,
      drivingDurationMinutes: Math.round(distance * 3), // rough 20mph estimate
      orderIndices: ordered.map((_, idx) => idx),
    }
  }

  if (!canUseGoogle) {
    return fallbackNearestNeighbor()
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

    const data = await response.json()
    if (data.status !== 'OK' || !data.routes?.[0]) {
      throw new Error(`Directions API error status: ${data.status}`)
    }

    const waypointOrder: number[] = data.routes[0].waypoint_order
    if (!Array.isArray(waypointOrder) || waypointOrder.length !== customers.length) {
      throw new Error('Directions API returned invalid waypoint_order')
    }

    const orderedCustomers = waypointOrder.map((idx) => customers[idx])
    const legs = data.routes[0].legs || []
    const totalDistanceMeters = legs.reduce(
      (sum: number, leg: any) => sum + (leg.distance?.value || 0),
      0
    )
    const totalDurationSeconds = legs.reduce(
      (sum: number, leg: any) => sum + (leg.duration?.value || 0),
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
    .select('id, latitude, longitude')
    .in(
      'id',
      input.customers.map((c) => c.id)
    )

  if (!customers || customers.length === 0) {
    return { error: 'No customers found' }
  }

  // Optimize order using Google Directions (falls back to nearest-neighbor)
  const shopLocation = await getShopLocation()

  const {
    orderedCustomers,
    drivingDistanceMiles,
    drivingDurationMinutes,
    orderIndices,
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

  revalidatePath('/routes')
  return { success: true, routeId: route.id }
}

export async function updateRouteStatus(input: UpdateRouteStatusInput) {
  const supabase = await createClient()
  const admin = getServiceSupabase()

  try {
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

    // Use service role to avoid RLS issues when user session is missing
    const { data, error } = await admin
      .from('routes')
      .update(updateData)
      .eq('id', input.routeId)
      .select()
      .maybeSingle()

    if (error) {
      console.error('Update route status error:', error)
      return { error: 'Failed to update route status' }
    }
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
    .select('id, latitude, longitude')
    .eq('id', input.customerId)
    .single()

  if (customerError || !customer) {
    console.error('Add stop customer fetch error:', customerError)
    return { error: 'Customer not found' }
  }

  if (customer.latitude == null || customer.longitude == null) {
    return { error: 'Customer is missing coordinates, cannot add to route' }
  }

  const stops = route.route_stops || []
  const optimizationInput = [
    ...stops.map((stop) => ({
      id: stop.customer_id,
      latitude: stop.customers?.latitude ?? null,
      longitude: stop.customers?.longitude ?? null,
      stopId: stop.id,
      status: stop.status,
      estimated_duration_minutes:
        stop.estimated_duration_minutes ?? SERVICE_TIME_PER_STOP_MIN,
    })),
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

  const { orderedCustomers, drivingDistanceMiles, drivingDurationMinutes, orderIndices } =
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
  for (let i = 0; i < orderedEntries.length; i++) {
    const entry = orderedEntries[i]
    if (entry.stopId) {
      const { error: stopUpdateError } = await supabase
        .from('route_stops')
        .update({ stop_order: i + 1 })
        .eq('id', entry.stopId)

      if (stopUpdateError) {
        console.error('Add stop reorder error:', stopUpdateError)
        return { error: 'Failed to reorder existing stops' }
      }
    } else {
      const { error: stopInsertError } = await supabase.from('route_stops').insert({
        route_id: input.routeId,
        customer_id: entry.id,
        stop_order: i + 1,
        status: 'pending',
        estimated_duration_minutes:
          entry.estimated_duration_minutes ?? SERVICE_TIME_PER_STOP_MIN,
      })

      if (stopInsertError) {
        console.error('Add stop insert error:', stopInsertError)
        return { error: 'Failed to add new stop' }
      }
    }
  }

  revalidatePath(`/routes/${input.routeId}`)
  revalidatePath('/routes')

  return { success: true }
}

export async function updateRouteStop(input: UpdateStopInput) {
  const supabase = await createClient()

  try {
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
  const admin = getServiceSupabase()
  const supabase = await createClient()

  const { data: route, error: routeFetchError } = await admin
    .from('routes')
    .select('start_time')
    .eq('id', routeId)
    .maybeSingle()

  if (routeFetchError) {
    console.error('Fetch route failed:', routeFetchError)
  }

  const endTime = new Date().toISOString()
  const startIso = route?.start_time || endTime
  const startMs = new Date(startIso).getTime()
  const endMs = new Date(endTime).getTime()
  const durationMinutes = Math.max(0, Math.round((endMs - startMs) / 60000))

  const result = await updateRouteStatus({
    routeId,
    status: 'completed',
    startTime: startIso,
    endTime,
  })

  if (result.success) {
    // Record the actual duration for analytics
    const { error: rtError } = await admin.from('route_times').insert({
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
    const { data: avgRows, error: avgError } = await admin
      .from('route_times')
      .select('duration_minutes')
      .eq('route_id', routeId)

    if (!avgError && avgRows) {
      const durations = avgRows
        .map((r) => (r.duration_minutes != null ? Number(r.duration_minutes) : null))
        .filter((v): v is number => v !== null)
      if (durations.length > 0) {
        const avg = durations.reduce((a, b) => a + b, 0) / durations.length
        const { error: avgUpdateError } = await admin
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
  const supabase = await createClient()

  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) {
    return { error: adminCheck.error }
  }

  try {
    // Delete route stops first
    const { error: stopsError } = await supabase
      .from('route_stops')
      .delete()
      .eq('route_id', routeId)

    if (stopsError) {
      console.error('Delete route stops error:', stopsError)
      return { error: 'Failed to delete route stops' }
    }

    // Delete route
    const { error: routeError } = await supabase
      .from('routes')
      .delete()
      .eq('id', routeId)

    if (routeError) {
      console.error('Delete route error:', routeError)
      return { error: 'Failed to delete route' }
    }

    revalidatePath('/routes')
    return { success: true }
  } catch (error) {
    console.error('Delete route error:', error)
    return { error: 'An unexpected error occurred' }
  }
}
