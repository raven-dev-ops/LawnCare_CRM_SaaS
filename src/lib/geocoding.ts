import { GOOGLE_MAPS_API_KEY } from '@/lib/config'

interface GeocodeResult {
  latitude: number
  longitude: number
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const apiKey = GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    console.warn('Google Maps API key not configured')
    return null
  }

  try {
    const encodedAddress = encodeURIComponent(address)
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`

    const response = await fetch(url)
    const data = await response.json()

    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location
      return {
        latitude: location.lat,
        longitude: location.lng,
      }
    }

    console.warn('Geocoding failed:', data.status)
    return null
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}
