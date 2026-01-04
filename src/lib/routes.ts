import { SHOP_LOCATION } from './config'
import { haversineMiles } from './geo'

export const GOOGLE_DIRECTIONS_MAX_WAYPOINTS = 23

interface RoutePoint {
  latitude: number | null
  longitude: number | null
}

interface RouteOrigin {
  lat: number
  lng: number
}

type IndexedPoint<T extends RoutePoint> = {
  point: T
  index: number
}

export function optimizeRouteNearestNeighborWithIndices<T extends RoutePoint>(
  points: T[],
  origin: RouteOrigin = SHOP_LOCATION
) {
  if (points.length <= 1) {
    return { ordered: points, orderIndices: points.map((_, idx) => idx) }
  }

  const unvisited: Array<IndexedPoint<T>> = points.map((point, index) => ({
    point,
    index,
  }))
  const ordered: Array<IndexedPoint<T>> = []
  let current = { lat: origin.lat, lng: origin.lng }

  while (unvisited.length > 0) {
    let nearestIndex = 0
    let nearestDistance = Infinity

    unvisited.forEach((item, index) => {
      const { point } = item
      if (point.latitude == null || point.longitude == null) return
      const distance = haversineMiles(
        current.lat,
        current.lng,
        point.latitude,
        point.longitude
      )
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestIndex = index
      }
    })

    const nearest = unvisited.splice(nearestIndex, 1)[0]
    ordered.push(nearest)
    if (nearest.point.latitude != null && nearest.point.longitude != null) {
      current = { lat: nearest.point.latitude, lng: nearest.point.longitude }
    }
  }

  return {
    ordered: ordered.map((item) => item.point),
    orderIndices: ordered.map((item) => item.index),
  }
}

export function chunkRouteStops<T>(stops: T[], maxChunkSize: number) {
  if (maxChunkSize <= 0) {
    return [stops]
  }

  const chunks: T[][] = []
  for (let i = 0; i < stops.length; i += maxChunkSize) {
    chunks.push(stops.slice(i, i + maxChunkSize))
  }
  return chunks
}

export function estimateRouteMetrics(
  points: RoutePoint[],
  origin: RouteOrigin = SHOP_LOCATION
) {
  if (points.length === 0) {
    return { distanceMiles: 0, durationMinutes: 0 }
  }

  let distance = 0
  let prev = { lat: origin.lat, lng: origin.lng }
  let hasVisited = false

  points.forEach((point) => {
    if (point.latitude == null || point.longitude == null) return
    distance += haversineMiles(
      prev.lat,
      prev.lng,
      point.latitude,
      point.longitude
    )
    prev = { lat: point.latitude, lng: point.longitude }
    hasVisited = true
  })

  if (hasVisited) {
    distance += haversineMiles(
      prev.lat,
      prev.lng,
      origin.lat,
      origin.lng
    )
  }

  return {
    distanceMiles: distance,
    durationMinutes: Math.round(distance * 3),
  }
}

export function optimizeRouteNearestNeighbor<T extends RoutePoint>(
  points: T[],
  origin: RouteOrigin = SHOP_LOCATION
): T[] {
  return optimizeRouteNearestNeighborWithIndices(points, origin).ordered
}

export function buildStopOrderIds(
  orderedEntries: Array<{ stopId: string | null }>,
  newStopId: string | null
) {
  return orderedEntries.map((entry) => entry.stopId ?? newStopId)
}


export function getCompletionPlan(status: string | null | undefined, startTime: string | null | undefined) {
  if (status === 'completed') {
    return { alreadyCompleted: true as const }
  }

  const endTime = new Date().toISOString()
  const startIso = startTime || endTime
  const startMs = new Date(startIso).getTime()
  const endMs = new Date(endTime).getTime()
  const durationMinutes = Math.max(0, Math.round((endMs - startMs) / 60000))

  return {
    alreadyCompleted: false as const,
    startIso,
    endTime,
    durationMinutes,
  }
}
