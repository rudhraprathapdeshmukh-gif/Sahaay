/**
 * React hook for geolocation and reverse geocoding
 */

import { useState, useCallback } from 'react'
import { getCurrentLocation, Location } from '@/lib/geolocation'

export interface UseGeolocationState {
  location: Location | null
  loading: boolean
  error: string | null
}

export interface UseGeolocationReturn extends UseGeolocationState {
  requestLocation: () => Promise<void>
  clearLocation: () => void
  clearError: () => void
  reverseGeocode: (lat: number, lng: number) => Promise<{ district?: string; state?: string }>
}

/**
 * Hook to request user's current location
 */
export function useGeolocation(): UseGeolocationReturn {
  const [state, setState] = useState<UseGeolocationState>({
    location: null,
    loading: false,
    error: null,
  })

  const requestLocation = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    try {
      const location = await getCurrentLocation()
      setState((prev) => ({
        ...prev,
        location,
        loading: false,
        error: null,
      }))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get location'
      setState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }))
    }
  }, [])

  const clearLocation = useCallback(() => {
    setState({
      location: null,
      loading: false,
      error: null,
    })
  }, [])

  const clearError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      error: null,
    }))
  }, [])

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
      const data = await res.json()
      return {
        district: data.address?.state_district || data.address?.county || data.address?.city || data.address?.town || data.address?.village,
        state: data.address?.state,
      }
    } catch {
      return {}
    }
  }, [])

  return {
    ...state,
    requestLocation,
    clearLocation,
    clearError,
    reverseGeocode,
  }
}