/**
 * Re-optimizes ALL existing routes using Google Directions waypoint optimization
 * (falls back to nearest-neighbor). Updates route metrics and stop_order.
 *
 * Requirements:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - GOOGLE_MAPS_SERVER_API_KEY (or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY fallback)
 * - Optional: NEXT_PUBLIC_SHOP_LAT / NEXT_PUBLIC_SHOP_LNG / NEXT_PUBLIC_SHOP_ADDRESS
 *
 * Run: node scripts/reoptimize-routes.js
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const SERVICE_TIME_PER_STOP_MIN = 30
const MILES_PER_METER = 1 / 1609.34

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const googleMapsKey = process.env.GOOGLE_MAPS_SERVER_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const SHOP_LOCATION = {
  lat:
    process.env.NEXT_PUBLIC_SHOP_LAT && !Number.isNaN(Number(process.env.NEXT_PUBLIC_SHOP_LAT))
      ? Number(process.env.NEXT_PUBLIC_SHOP_LAT)
      : 38.7839,
  lng:
    process.env.NEXT_PUBLIC_SHOP_LNG && !Number.isNaN(Number(process.env.NEXT_PUBLIC_SHOP_LNG))
      ? Number(process.env.NEXT_PUBLIC_SHOP_LNG)
      : -90.4974,
  address: process.env.NEXT_PUBLIC_SHOP_ADDRESS || '16 Cherokee Dr, St Peters, MO',
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function haversineMiles(lat1, lng1, lat2, lng2) {
  const R = 3959 // miles
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function optimizeNearestNeighbor(customers) {
  if (customers.length <= 1) {
    return {
      orderedCustomers: customers,
      drivingDistanceMiles: customers.length === 1
        ? haversineMiles(
            SHOP_LOCATION.lat,
            SHOP_LOCATION.lng,
            customers[0].latitude,
            customers[0].longitude
          ) * 2
        : 0,
      drivingDurationMinutes: customers.length === 1
        ? Math.round(
            haversineMiles(
              SHOP_LOCATION.lat,
              SHOP_LOCATION.lng,
              customers[0].latitude,
              customers[0].longitude
            ) * 3
          )
        : 0,
      orderIndices: customers.map((_, idx) => idx),
    }
  }

  const unvisited = [...customers]
  const ordered = []
  let current = { lat: SHOP_LOCATION.lat, lng: SHOP_LOCATION.lng }

  while (unvisited.length > 0) {
    let nearestIndex = 0
    let nearestDistance = Infinity

    unvisited.forEach((point, index) => {
      const distance = haversineMiles(current.lat, current.lng, point.latitude, point.longitude)
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestIndex = index
      }
    })

    const nearest = unvisited.splice(nearestIndex, 1)[0]
    ordered.push(nearest)
    current = { lat: nearest.latitude, lng: nearest.longitude }
  }

  let distance = 0
  let prev = { lat: SHOP_LOCATION.lat, lng: SHOP_LOCATION.lng }
  ordered.forEach((point) => {
    distance += haversineMiles(prev.lat, prev.lng, point.latitude, point.longitude)
    prev = { lat: point.latitude, lng: point.longitude }
  })
  distance += haversineMiles(prev.lat, prev.lng, SHOP_LOCATION.lat, SHOP_LOCATION.lng)

  return {
    orderedCustomers: ordered,
    drivingDistanceMiles: distance,
    drivingDurationMinutes: Math.round(distance * 3),
    orderIndices: ordered.map((_, idx) => idx),
  }
}

async function optimizeWithGoogle(customers) {
  const allHaveCoords = customers.every((c) => c.latitude != null && c.longitude != null)
  const canUseGoogle = Boolean(googleMapsKey) && customers.length >= 2 && customers.length <= 23 && allHaveCoords
  if (!canUseGoogle) return optimizeNearestNeighbor(customers)

  try {
    const origin = `${SHOP_LOCATION.lat},${SHOP_LOCATION.lng}`
    const waypointsParam = customers
      .map((c) => `${c.latitude},${c.longitude}`)
      .map(encodeURIComponent)
      .join('|')

    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${origin}&waypoints=optimize:true|${waypointsParam}&mode=driving&key=${googleMapsKey}`
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`)

    const data = await response.json()
    if (data.status !== 'OK' || !data.routes?.[0]) {
      throw new Error(`Directions status ${data.status}`)
    }

    const route = data.routes[0]
    const waypointOrder = route.waypoint_order
    if (!Array.isArray(waypointOrder) || waypointOrder.length !== customers.length) {
      throw new Error('Invalid waypoint_order')
    }

    const orderedCustomers = waypointOrder.map((idx) => customers[idx])
    const legs = route.legs || []
    const totalDistanceMeters = legs.reduce((sum, leg) => sum + (leg.distance?.value || 0), 0)
    const totalDurationSeconds = legs.reduce((sum, leg) => sum + (leg.duration?.value || 0), 0)

    return {
      orderedCustomers,
      drivingDistanceMiles: totalDistanceMeters * MILES_PER_METER,
      drivingDurationMinutes: totalDurationSeconds / 60,
      orderIndices: waypointOrder,
    }
  } catch (error) {
    console.error('   ⚠️  Google optimization failed, using nearest-neighbor:', error.message)
    return optimizeNearestNeighbor(customers)
  }
}

async function reoptimizeRoutes() {
  console.log('🔄 Re-optimizing existing routes...\n')

  const { data: routes, error } = await supabase
    .from('routes')
    .select(
      `
      id,
      day_of_week,
      route_stops (
        id,
        customer_id,
        customers (
          latitude,
          longitude
        )
      )
    `
    )

  if (error) {
    console.error('❌ Failed to fetch routes:', error)
    process.exit(1)
  }

  if (!routes || routes.length === 0) {
    console.log('ℹ️  No routes found to optimize.')
    return
  }

  let updatedCount = 0

  for (const route of routes) {
    const stops = route.route_stops || []
    if (stops.length === 0) {
      console.log(`📭 Route ${route.id} (${route.day_of_week}) has no stops, skipping`)
      continue
    }

    const customers = stops.map((stop) => ({
      id: stop.customer_id,
      latitude: stop.customers?.latitude ?? null,
      longitude: stop.customers?.longitude ?? null,
    }))

    const missingCoords = customers.some((c) => c.latitude == null || c.longitude == null)
    if (missingCoords) {
      console.log(`⚠️  Route ${route.id} missing customer coordinates, skipping`)
      continue
    }

    console.log(`➡️  Optimizing route ${route.id} (${route.day_of_week}) with ${stops.length} stops`)
    const optimization = await optimizeWithGoogle(customers)

    const totalDuration =
      Math.round(optimization.drivingDurationMinutes) + customers.length * SERVICE_TIME_PER_STOP_MIN
    const fuelCost = optimization.drivingDistanceMiles * 0.15

    const updatePayload = {
      total_distance_miles: optimization.drivingDistanceMiles,
      total_distance_km: optimization.drivingDistanceMiles * 1.60934,
      total_duration_minutes: totalDuration,
      estimated_fuel_cost: fuelCost,
      optimized_waypoints: {
        waypoints: optimization.orderedCustomers.map((c) => ({
          lat: c.latitude,
          lng: c.longitude,
        })),
        order: optimization.orderIndices,
      },
      updated_at: new Date().toISOString(),
    }

    const { error: routeUpdateError } = await supabase
      .from('routes')
      .update(updatePayload)
      .eq('id', route.id)

    if (routeUpdateError) {
      console.error(`❌ Failed to update route ${route.id}:`, routeUpdateError)
      continue
    }

    // Reorder stops
    const newStopOrder = optimization.orderIndices.map((idx) => stops[idx])
    for (let i = 0; i < newStopOrder.length; i++) {
      const stop = newStopOrder[i]
      const { error: stopErr } = await supabase
        .from('route_stops')
        .update({ stop_order: i + 1 })
        .eq('id', stop.id)
      if (stopErr) {
        console.error(`   ⚠️  Failed to update stop ${stop.id}:`, stopErr)
      }
      await sleep(50) // small spacing to avoid rate limits
    }

    updatedCount++
    console.log(
      `   ✅ Route ${route.id} optimized: ${optimization.drivingDistanceMiles.toFixed(
        1
      )} mi, ${Math.round(optimization.drivingDurationMinutes)} min drive`
    )
  }

  console.log('\n🎯 Done. Routes optimized:', updatedCount)
}

reoptimizeRoutes().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
