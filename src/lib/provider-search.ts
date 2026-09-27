/**
 * Service provider search with geolocation
 */

import { supabase } from './supabase'
import type { ServiceProvider, Service, User } from '@/types/database'
import { calculateDistance, isValidLocation } from './geolocation'

export interface ProviderWithDistance extends ServiceProvider {
  user?: User
  service?: Service
  distanceKm?: number
}

export interface SearchFilters {
  serviceId?: number
  minRating?: number
  maxDistanceKm?: number
  isAvailable?: boolean
  verificationStatus?: 'verified' | 'pending' | 'unverified'
}

/**
 * Search for service providers near a location
 */
export async function searchProvidersNearLocation(
  latitude: number,
  longitude: number,
  filters: SearchFilters = {},
  limit: number = 20
): Promise<ProviderWithDistance[]> {
  if (!isValidLocation(latitude, longitude)) {
    throw new Error('Invalid location coordinates')
  }

  // Build query
  let query = supabase
    .from('service_providers')
    .select(`
      *,
      user:users(*),
      service:services(*)
    `)

  // Apply filters
  if (filters.serviceId) {
    query = query.eq('service_id', filters.serviceId)
  }

  if (filters.isAvailable !== undefined) {
    query = query.eq('is_available', filters.isAvailable)
  }

  if (filters.verificationStatus) {
    query = query.eq('verification_status', filters.verificationStatus)
  }

  if (filters.minRating) {
    query = query.gte('rating', filters.minRating)
  }

  // First, fetch providers
  const { data: providers, error } = await query.order('rating', { ascending: false }).limit(limit)

  if (error) throw error
  if (!providers) return []

  // Calculate distances and filter by maxDistanceKm if specified
  const providersWithDistance = providers.map((provider) => {
    let distanceKm: number | undefined = undefined

    // Calculate distance if provider has location data (either on provider or user record)
    const provLat = provider.latitude ?? provider.user?.latitude
    const provLng = provider.longitude ?? provider.user?.longitude

    if (provLat !== undefined && provLat !== null && provLng !== undefined && provLng !== null) {
      distanceKm = calculateDistance(
        latitude,
        longitude,
        provLat,
        provLng
      )
    }

    return {
      ...provider,
      distanceKm,
    } as ProviderWithDistance
  })

  // Filter by max distance if specified
  if (filters.maxDistanceKm) {
    return providersWithDistance.filter(
      (provider) =>
        provider.distanceKm !== undefined && provider.distanceKm <= filters.maxDistanceKm!
    )
  }

  return providersWithDistance
}

/**
 * Find providers within a specific service radius
 */
export async function findProvidersWithinRadius(
  latitude: number,
  longitude: number,
  maxRadiusKm: number,
  filters: SearchFilters = {}
): Promise<ProviderWithDistance[]> {
  // First, get all providers that might be in radius
  const providers = await searchProvidersNearLocation(latitude, longitude, filters, 100)

  // Filter by maxRadiusKm and check provider's own service radius
  return providers.filter((provider) => {
    // Check if provider is within maxRadiusKm from search location
    if (provider.distanceKm === undefined || provider.distanceKm > maxRadiusKm) {
      return false
    }

    // Check if provider can serve at that distance (within their service radius)
    return provider.distanceKm <= provider.service_radius_km
  })
}

/**
 * Find providers by city/state (fallback when location not available)
 */
export async function findProvidersByArea(
  city?: string,
  state?: string,
  serviceId?: number
): Promise<ProviderWithDistance[]> {
  let query = supabase
    .from('service_providers')
    .select(`
      *,
      user:users(*),
      service:services(*)
    `)

  if (serviceId) {
    query = query.eq('service_id', serviceId)
  }

  query = query.eq('is_available', true)

  // If we have city/state, filter through user table
  if (city || state) {
    // We'll filter in memory after fetching because of the join
    const { data: providers, error } = await query

    if (error) throw error
    if (!providers) return []

    return providers.filter((provider) => {
      const user = provider.user as unknown as User
      if (!user) return false

      const cityMatch = !city || user.city?.toLowerCase().includes(city.toLowerCase())
      const stateMatch = !state || user.state?.toLowerCase().includes(state.toLowerCase())

      return cityMatch && stateMatch
    }) as ProviderWithDistance[]
  }

  // No location filter, just return available providers
  const { data: providers, error } = await query
  if (error) throw error
  return (providers || []) as ProviderWithDistance[]
}

/**
 * Update provider location
 */
export async function updateProviderLocation(
  providerId: string,
  latitude: number,
  longitude: number
): Promise<void> {
  if (!isValidLocation(latitude, longitude)) {
    throw new Error('Invalid location coordinates')
  }

  const { error } = await supabase
    .from('service_providers')
    .update({ latitude, longitude })
    .eq('id', providerId)

  if (error) throw error
}

/**
 * Update user location
 */
export async function updateUserLocation(
  userId: string,
  latitude: number,
  longitude: number
): Promise<void> {
  if (!isValidLocation(latitude, longitude)) {
    throw new Error('Invalid location coordinates')
  }

  const { error } = await supabase
    .from('users')
    .update({ latitude, longitude })
    .eq('id', userId)

  if (error) throw error
}

/**
 * Get nearby providers sorted by distance
 */
export async function getNearbyProviders(
  latitude: number,
  longitude: number,
  serviceId?: number
): Promise<ProviderWithDistance[]> {
  const providers = await searchProvidersNearLocation(latitude, longitude, {
    serviceId,
    isAvailable: true,
    verificationStatus: 'verified',
  }, 50)

  // Sort by distance
  return providers
    .filter((p) => p.distanceKm !== undefined)
    .sort((a, b) => (a.distanceKm || Infinity) - (b.distanceKm || Infinity))
}

/**
 * Find providers who can serve a specific address
 */
export async function findProvidersForAddress(
  latitude: number,
  longitude: number,
  serviceId?: number
): Promise<ProviderWithDistance[]> {
  const providers = await getNearbyProviders(latitude, longitude, serviceId)

  // Filter providers who have a service radius that can cover the distance
  return providers.filter((provider) => {
    // If provider doesn't have location, we can't calculate distance
    if (provider.distanceKm === undefined) return false

    // Check if provider's service radius can cover the distance
    return provider.distanceKm <= provider.service_radius_km
  })
}