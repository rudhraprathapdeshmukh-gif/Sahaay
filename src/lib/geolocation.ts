/**
 * Geolocation utilities for Sahaay
 * Provides location detection and distance calculation between coordinates
 */

export interface Location {
  latitude: number
  longitude: number
  city?: string
  district?: string
  state?: string
  country?: string
}

// Cache for detected location to avoid repeated API calls
let cachedLocation: Location | null = null
let isDetecting = false
let locationPromise: Promise<Location> | null = null

/**
 * Calculate the distance between two points using the Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth's radius in km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Convert degrees to radians
 */
function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

/**
 * Format distance for display
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`
  }
  return `${km.toFixed(1)} km`
}

/**
 * Check if location data is valid (non-null and non-zero)
 */
export function isValidLocation(latitude?: number | null, longitude?: number | null): boolean {
  return (
    latitude !== null &&
    latitude !== undefined &&
    longitude !== null &&
    longitude !== undefined &&
    latitude !== 0 &&
    longitude !== 0 &&
    !isNaN(latitude) &&
    !isNaN(longitude)
  )
}

/**
 * Reverse geocode coordinates to get city, state, country
 */
async function reverseGeocode(lat: number, lng: number): Promise<Partial<Location>> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=16&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'SahaayApp/1.0 (https://sahaay.app)',
        },
      }
    )

    if (!response.ok) return {}

    const data = await response.json()
    const address = data.address || {}

    // Build location object with all available info
    const locationData: Partial<Location> = {}

    // Prefer granular locality so the customer sees their exact area
    if (address.city || address.town || address.village || address.city_block ||
        address.suburb || address.neighbourhood || address.county || address.state_district) {
      locationData.city = address.city || address.town || address.village || address.city_block ||
                         address.suburb || address.neighbourhood || address.county || address.state_district
    }

    if (address.city_district || address.district || address.suburb || address.neighbourhood || address.county) {
      locationData.district = address.city_district || address.district || address.suburb ||
                             address.neighbourhood || address.county
    }

    if (address.state || address.region) {
      locationData.state = address.state || address.region
    }

    if (address.country) {
      locationData.country = address.country
    }

    return locationData
  } catch (error) {
    console.error('Reverse geocoding failed:', error)
    return {}
  }
}

/**
 * Detect user's current location using browser Geolocation API
 * Falls back to IP-based geolocation if browser API fails
 */

/**
 * Invalidate the geolocation cache (e.g. when we need a forced fresh reading)
 */
export function clearLocationCache(): void {
  cachedLocation = null
}

export async function getCurrentLocation(forceRefresh = false): Promise<Location> {
  // Return cached location unless a force refresh was requested
  if (!forceRefresh && cachedLocation && isValidLocation(cachedLocation.latitude, cachedLocation.longitude)) {
    console.log('Geolocation: Using cached location:', cachedLocation)
    return cachedLocation
  }

  // If already detecting and not force-refreshing, return the existing promise
  if (isDetecting && locationPromise && !forceRefresh) {
    console.log('Geolocation: Already detecting, returning promise')
    return locationPromise
  }

  console.log('Geolocation: Starting fresh detection', { forceRefresh })
  isDetecting = true
  locationPromise = detectLocationInternal()

  try {
    const location = await Promise.race([
      locationPromise,
      new Promise<Location>((_, reject) =>
        setTimeout(() => reject(new Error('Location detection timeout')), 30000)
      )
    ])
    if (location) {
      cachedLocation = location
      console.log('Geolocation: Detected location:', location)
    }
    return location
  } catch (error) {
    console.error('Geolocation: Detection failed:', error)
    throw error
  } finally {
    isDetecting = false
    locationPromise = null
  }
}

async function detectLocationInternal(): Promise<Location> {
  // Helper to request a position with given options
  const requestPosition = (options: PositionOptions) =>
    new Promise<GeolocationPosition>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'))
        return
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, options)
    })

  // Method 1: Browser Geolocation API – try high accuracy first for precise coordinates
  console.log('Geolocation: Trying browser high accuracy...')
  try {
    const position = await requestPosition({
      enableHighAccuracy: true,
      timeout: 10000, // Reduced from 15000
      maximumAge: 0,
    })

    const { latitude, longitude } = position.coords
    console.log('Geolocation: Got coords:', { latitude, longitude })

    if (isValidLocation(latitude, longitude)) {
      // Get address details via reverse geocoding (exact location)
      const addressDetails = await reverseGeocode(latitude, longitude)
      console.log('Geolocation: Reverse geocoded:', addressDetails)

      return {
        latitude,
        longitude,
        ...addressDetails,
      }
    }
  } catch (highAccErr) {
    console.warn('Browser geolocation failed (high accuracy):', highAccErr)
    const error = highAccErr as GeolocationPositionError
    // If permission denied, fail fast
    if (error.code === 1) {
      console.warn('Geolocation: Permission denied')
      throw new Error('Location permission denied')
    }
  }

  // Fallback: low accuracy (faster, less precise)
  console.log('Geolocation: Trying browser low accuracy...')
  try {
    const position = await requestPosition({
      enableHighAccuracy: false,
      timeout: 8000, // Reduced from 10000
      maximumAge: 300000, // 5 minutes
    })

    const { latitude, longitude } = position.coords
    console.log('Geolocation: Got low accuracy coords:', { latitude, longitude })

    if (isValidLocation(latitude, longitude)) {
      const addressDetails = await reverseGeocode(latitude, longitude)
      console.log('Geolocation: Low accuracy reverse geocoded:', addressDetails)
      return { latitude, longitude, ...addressDetails }
    }
  } catch (lowAccErr) {
    console.warn('Browser geolocation failed (low accuracy):', lowAccErr)
    const error = lowAccErr as GeolocationPositionError
    if (error.code === 1) {
      throw new Error('Location permission denied')
    }
  }

  // Method 2: IP-based geolocation fallback (no permission required)
  console.log('Geolocation: Trying IP-based fallback...')
  try {
    const response = await Promise.race([
      fetch('https://ipapi.co/json/', {
        headers: {
          'User-Agent': 'SahaayApp/1.0',
        },
      }),
      new Promise<Response>((_, reject) =>
        setTimeout(() => reject(new Error('IP geolocation timeout')), 5000)
      )
    ])

    if (response.ok) {
      const data = await response.json()
      console.log('Geolocation: IP-based data:', data)

      if (isValidLocation(data.latitude, data.longitude)) {
        return {
          latitude: data.latitude,
          longitude: data.longitude,
          city: data.city || null,
          district: data.city || null,
          state: data.region || null,
          country: data.country_name || null,
        }
      }
    }
  } catch (ipError) {
    console.warn('IP geolocation failed:', ipError)
  }

  // Method 3: Alternative IP geolocation service
  console.log('Geolocation: Trying alternative IP geolocation...')
  try {
    const response = await Promise.race([
      fetch('https://ifconfig.co/json', {
        headers: {
          'User-Agent': 'SahaayApp/1.0',
        },
      }),
      new Promise<Response>((_, reject) =>
        setTimeout(() => reject(new Error('Alternative IP geolocation timeout')), 5000)
      )
    ])

    if (response.ok) {
      const data = await response.json()
      console.log('Geolocation: Alternative IP data:', data)

      if (isValidLocation(data.latitude, data.longitude)) {
        return {
          latitude: data.latitude,
          longitude: data.longitude,
          city: data.city || null,
          district: data.city || null,
          state: data.region_name || null,
          country: data.country_name || null,
        }
      }
    }
  } catch (altIpError) {
    console.warn('Alternative IP geolocation failed:', altIpError)
  }

  console.error('Geolocation: All methods failed')
  throw new Error('Location detection failed across all methods')
}

/**
 * Watch user location for continuous updates
 */
export function watchLocation(
  callback: (location: Location) => void,
  onError?: (error: GeolocationPositionError) => void
): () => void {
  if (!navigator.geolocation) {
    onError?.({ code: 0, message: 'Geolocation not supported', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError)
    return () => {}
  }

  const watchId = navigator.geolocation.watchPosition(
    async (position) => {
      const { latitude, longitude } = position.coords

      if (isValidLocation(latitude, longitude)) {
        const addressDetails = await reverseGeocode(latitude, longitude)

        const location: Location = {
          latitude,
          longitude,
          ...addressDetails,
        }

        cachedLocation = location
        callback(location)
      }
    },
    (error) => {
      onError?.(error)
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60000,
    }
  )

  // Return cleanup function
  return () => {
    navigator.geolocation.clearWatch(watchId)
  }
}