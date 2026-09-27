import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from '@/components/Layout'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { getCurrentLocation, calculateDistance, formatDistance, Location } from '@/lib/geolocation'
import { fetchServices } from '@/lib/providers'
import { requestService, fetchCustomerActiveBookingsCount, fetchCustomerBookings, deleteBooking } from '@/lib/bookings'
import type { Service, Booking } from '@/types/database'
import ProviderHomeSummary from '@/components/ProviderHomeSummary'
import ProvidersMap from '@/components/ProvidersMap'
import BookingModal from '@/components/BookingModal'
import {
  SearchIcon,
  LocationIcon,
  StarIcon,
  ArrowRightIcon,
  BoltIcon,
  WrenchIcon,
  HammerIcon,
  PaintBrushIcon,
  BroomIcon,
  TruckIcon,
  ChipIcon,
  HeartIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  ClockIcon,
  CalendarIcon,
  TrashIcon,
} from '@/components/Icons'

// Radius options
const PRIMARY_RADIUS = 7
const EXTENDED_RADIUS = 15

// Icon mapping for services
const SERVICE_ICONS: Record<string, React.FC<{ className?: string }>> = {
  electrician: BoltIcon,
  plumber: WrenchIcon,
  carpenter: HammerIcon,
  painter: PaintBrushIcon,
  cleaner: BroomIcon,
  driver: TruckIcon,
  caregiver: HeartIcon,
  technician: ChipIcon,
}

// Service emojis for map markers
const SERVICE_EMOJIS: Record<string, string> = {
  electrician: '⚡',
  plumber: '🔧',
  carpenter: '🪚',
  painter: '🎨',
  cleaner: '🧹',
  driver: '🚗',
  caregiver: '💙',
  technician: '🔌',
}

// Map category slug to service_id
const CATEGORY_SLUG_TO_ID: Record<string, number> = {
  electrician: 1,
  plumber: 2,
  carpenter: 3,
  painter: 4,
  driver: 5,
  cleaner: 6,
  caregiver: 7,
  technician: 8,
}

// Reverse map: service_id to slug
const SERVICE_ID_TO_SLUG: Record<number, string> = {
  1: 'electrician',
  2: 'plumber',
  3: 'carpenter',
  4: 'painter',
  5: 'driver',
  6: 'cleaner',
  7: 'caregiver',
  8: 'technician',
}

// Keywords customers use for each service category (so "bulb fitting", "fan repair", etc. match)
const KEYWORDS_BY_SERVICE_SLUG: Record<string, string[]> = {
  electrician: ['fan repair', 'bulb', 'fitting', 'light', 'switch', 'socket', 'plug', 'wiring', 'ceiling fan', 'exhaust', 'led', 'lamp', 'current', 'electric', 'choke', 'starter', 'holder'],
  plumber: ['tap', 'pipe', 'leak', 'drain', 'blockage', 'bathroom', 'plumb', 'faucet', 'mixer', 'water'],
  carpenter: ['door', 'furniture', 'lock', 'shelf', 'cabinet', 'drawer', 'hinge', 'wood', 'wooden', 'repair'],
  painter: ['wall', 'paint', 'colour', 'color', 'touch up', 'touch-up', 'exterior', 'interior', 'whitewash'],
  cleaner: ['clean', 'deep clean', 'bathroom cleaning', 'kitchen cleaning', 'home clean', 'sanitization', 'degreas', 'mop', 'dust'],
  driver: ['driver', 'driving', 'chauffeur', 'trip', 'outstation', 'local driver', 'full day', 'travel'],
  caregiver: ['elder', 'senior', 'patient', 'care', 'nurse', 'daily assistance', 'support', 'companion'],
  technician: ['ac ', 'air condition', 'refrigerator', 'fridge', 'washing machine', 'tv ', 'television', 'appliance'],
}

// Does this provider match the free-text search? Matches category name, slug and keywords
function providerMatchesSearch(
  provider: ProviderSearchResult,
  searchQuery: string
): boolean {
  const q = searchQuery.toLowerCase().trim()
  if (!q) return true

  const slug = (provider.service?.slug ?? '').toLowerCase()
  if (slug && (slug.includes(q) || q.includes(slug))) return true

  const serviceName = (provider.service?.name ?? '').toLowerCase()
  if (serviceName && (serviceName.includes(q) || q.includes(serviceName))) return true

  const keywords = KEYWORDS_BY_SERVICE_SLUG[slug] ?? []
  for (const kw of keywords) {
    if (q.includes(kw) || kw.includes(q)) return true
  }

  return false
}

interface ProviderSearchResult {
  id: string
  user_id: string
  service_id: number
  bio: string | null
  years_experience: string | null
  service_radius_km: number
  verification_status: string
  rating: number
  jobs_completed: number
  hourly_rate: number | null
  is_available: boolean
  distance?: number
  user?: {
    full_name: string
    city: string | null
    state: string | null
  }
  service?: {
    name: string
    slug: string
  }
}

const Home = () => {
  const { t } = useTranslation()
  const { user, isAuthenticated } = useAuth()
  const isAdmin = isAuthenticated && user?.role === 'admin'
  const isProvider = isAuthenticated && user?.role === 'provider'


  // Location state
  const [customerLocation, setCustomerLocation] = useState<Location | null>(null)
  const [locationLoading, setLocationLoading] = useState<boolean>(false)
  const [locationError, setLocationError] = useState<string | null>(null)

  // Service & Search state
  const [servicesList, setServicesList] = useState<Service[]>([])
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [suggestionsOpen, setSuggestionsOpen] = useState<boolean>(false)

  // Search results state
  const [providers, setProviders] = useState<ProviderSearchResult[]>([])
  const [isExtendedRadius, setIsExtendedRadius] = useState<boolean>(false)
  const [searchLoading, setSearchLoading] = useState<boolean>(false)

  // Booking modal state
  const [selectedProvider, setSelectedProvider] = useState<ProviderSearchResult | null>(null)
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false)
  const [activeCount, setActiveCount] = useState(0)
  const atLimit = activeCount >= 1

  // Customer bookings state for "Requested Services" section
  const [customerBookings, setCustomerBookings] = useState<any[]>([])
  const [bookingsLoading, setBookingsLoading] = useState(false)

  // Nearby providers for map (within 10km)
  const [nearbyProviders, setNearbyProviders] = useState<any[]>([])
  const [providersLoading, setProvidersLoading] = useState(false)

  // Fetch nearby providers for map (within 10km radius, filtered by service category)
  const loadNearbyProviders = useCallback(async (serviceId?: number) => {
    if (!customerLocation) return

    setProvidersLoading(true)
    try {
      let query = supabase
        .from('service_providers')
        .select(`
          id,
          user_id,
          latitude,
          longitude,
          rating,
          service_id,
          service:services(name, slug),
          user:users(full_name)
        `)
        .eq('is_available', true)
        .eq('verification_status', 'verified')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)

      // Filter by service category if provided
      if (serviceId) {
        query = query.eq('service_id', serviceId)
      }

      const { data, error } = await query

      if (error) throw error

      // Filter by distance (10km radius) and add emoji
      const nearby = (data || []).filter((provider: any) => {
        if (!provider.latitude || !provider.longitude) return false
        const distance = calculateDistance(
          customerLocation.latitude,
          customerLocation.longitude,
          provider.latitude,
          provider.longitude
        )
        return distance <= 10 // 10km radius
      }).map((provider: any) => {
        const distance = calculateDistance(
          customerLocation.latitude,
          customerLocation.longitude,
          provider.latitude,
          provider.longitude
        )
        return {
          ...provider,
          // Add emoji based on service category
          emoji: SERVICE_EMOJIS[provider.service?.slug || ''] || '🔧',
          distance
        }
      })

      setNearbyProviders(nearby)
    } catch (err) {
      console.warn('Error fetching nearby providers:', err)
    } finally {
      setProvidersLoading(false)
    }
  }, [customerLocation])

  // Fetch customer bookings for "Requested Services" section
  const loadCustomerBookings = useCallback(async () => {
    if (!user?.id || user.role !== 'customer') return

    setBookingsLoading(true)
    try {
      const data = await fetchCustomerBookings(user.id)
      if (data) {
        setCustomerBookings(data)
      }
    } catch (err) {
      console.warn('Error fetching customer bookings:', err)
    } finally {
      setBookingsLoading(false)
    }
  }, [user?.id, user?.role])

  useEffect(() => {
    loadCustomerBookings()

    // Subscribe to real-time booking updates
    const channel = supabase
      .channel(`home-customer-bookings-${user?.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `customer_id=eq.${user?.id}`,
        },
        () => {
          loadCustomerBookings()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, user?.role, loadCustomerBookings])

  // Load nearby providers only when customer has an active service request
  useEffect(() => {
    if (user?.role === 'customer' && customerLocation && customerBookings.length > 0) {
      // Find the active broadcast request
      const activeRequest = customerBookings.find(b => b.status === 'broadcast')
      if (activeRequest && activeRequest.service_id) {
        // Load only providers matching the requested service
        loadNearbyProviders(activeRequest.service_id)
      } else {
        // No active request, clear the map
        setNearbyProviders([])
      }
    } else {
      // No bookings or not a customer, clear the map
      setNearbyProviders([])
    }
  }, [user?.role, customerLocation, customerBookings, loadNearbyProviders])

  // Delete broadcast request
  const handleDeleteRequest = async (bookingId: string) => {
    if (!confirm('Are you sure you want to delete this request?')) {
      return
    }

    // Optimistically remove from UI
    setCustomerBookings(prev => prev.filter(b => b.id !== bookingId))

    try {
      await deleteBooking(bookingId)
      await loadCustomerBookings()
    } catch (err) {
      console.error('Failed to delete request:', err)
      await loadCustomerBookings()
    }
  }

  // 1. Detect Customer Location automatically on mount (only for logged-in users)
  const detectLocation = useCallback(async () => {
    // Only detect location for authenticated users
    if (!isAuthenticated) {
      setLocationLoading(false)
      setCustomerLocation(null)
      return
    }

    setLocationLoading(true)
    setLocationError(null)

    try {
      console.log('Home: Starting location detection...')
      const loc = await getCurrentLocation()
      console.log('Home: Got location:', loc)
      setCustomerLocation(loc)
      setLocationError(null)

      // Sync with user's profile if authenticated (city/state only; latitude/longitude columns pending migration)
      if (user?.id) {
        supabase
          .from('users')
          .update({
            city: loc.city || undefined,
            state: loc.state || undefined,
          })
          .eq('id', user.id)
          .then(() => {
            console.log('Home: Updated user profile location:', loc.city, loc.state)
          })
      }
    } catch (err) {
      console.error('Geolocation detection failed:', err)
      setCustomerLocation(null)
      setLocationError('Unable to detect your location. Please enable location services.')
    } finally {
      setLocationLoading(false)
    }
  }, [user?.id, isAuthenticated])

  useEffect(() => {
    if (isAuthenticated && (user?.role === 'customer' || user?.role === 'provider')) {
      detectLocation()
    } else {
      // Log for debugging
      console.log('Location detection not running:', {
        isAuthenticated,
        userRole: user?.role
      })
    }
  }, [isAuthenticated, user?.role, detectLocation])

  // 2. Load Services from Supabase
  useEffect(() => {
    const loadServices = async () => {
      try {
        const loaded = await fetchServices()
        if (loaded && loaded.length > 0) {
          setServicesList(loaded)
        }
      } catch (err) {
        console.error('Failed to load services:', err)
      }
    }
    loadServices()
  }, [])

  // Track active bookings (pending/confirmed/in_progress) – real Supabase data
  useEffect(() => {
    if (!user?.id || user.role !== 'customer') return
    let cancelled = false
    const fetchCount = async () => {
      try {
        const n = await fetchCustomerActiveBookingsCount(user.id)
        if (!cancelled) setActiveCount(n)
      } catch {}
    }
    fetchCount()
    const ch = supabase.channel(`home-active-count-${user.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `customer_id=eq.${user.id}` }, async (payload) => {
      if (payload.eventType === 'DELETE') {
        // On DELETE, wait briefly for propagation then re-fetch
        await new Promise(resolve => setTimeout(resolve, 500))
        fetchCount()
      } else if (payload.eventType === 'UPDATE') {
        const newStatus = (payload.new as any)?.status
        // Optimistically clear banner immediately for terminal statuses
        if (newStatus === 'completed' || newStatus === 'cancelled') {
          if (!cancelled) setActiveCount(0)
        }
        // Always re-fetch authoritative count from DB
        fetchCount()
      } else {
        // INSERT - re-fetch fresh count
        fetchCount()
      }
    }).subscribe()
    return () => { cancelled = true; supabase.removeChannel(ch) }
  }, [user?.id, user?.role])

  const handleBookingSubmit = async (data: {
    address: string
    scheduledDate: string | null
    scheduledTime: string | null
    notes: string
    isEmergency: boolean
  }) => {
    if (!user?.id || !selectedProvider) return
    if (atLimit) {
      alert('You have reached the maximum limit of 2 active services. Please complete or cancel an existing service before starting a new one.')
      return
    }

    setIsSubmittingBooking(true)
    let scheduled_at: string | null = null
    if (data.scheduledDate && data.scheduledTime) {
      scheduled_at = new Date(`${data.scheduledDate}T${data.scheduledTime}`).toISOString()
    }

    try {
      await requestService({
        customer_id: user.id,
        provider_id: selectedProvider.id,
        service_id: selectedProvider.service_id,
        scheduled_at,
        address: data.address,
        notes: data.notes,
        amount: 0,
      })
      alert('Service request sent successfully!')
      setSelectedProvider(null)
      try {
        const n = await fetchCustomerActiveBookingsCount(user.id)
        setActiveCount(n)
      } catch {}
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Failed to send request. Please try again.')
    } finally {
      setIsSubmittingBooking(false)
    }
  }

  // 3. Search Providers from Supabase when Location or Search Query changes (authenticated only)
  useEffect(() => {
    if (!isAuthenticated || !customerLocation) {
      setProviders([])
      return
    }

    const searchProviders = async () => {
      setSearchLoading(true)

      try {
        const { data: rawProviders, error } = await supabase
          .from('service_providers')
          .select(`
            id,
            user_id,
            service_id,
            bio,
            years_experience,
            service_radius_km,
            verification_status,
            rating,
            jobs_completed,
            hourly_rate,
            is_available,
            latitude,
            longitude,
            user:users(full_name, city, state),
            service:services(name, slug)
          `)
          .eq('is_available', true)
          .eq('verification_status', 'verified')

        if (error) throw error

        const allProviders: ProviderSearchResult[] = []
        const { latitude: custLat, longitude: custLng } = customerLocation

        console.log('DEBUG [Home]: Customer coordinates:', custLat, custLng)
        console.log('DEBUG [Home]: allProviders fetched:', rawProviders)

        for (const item of (rawProviders || []) as any[]) {
          const provLat = item.latitude
          const provLng = item.longitude

          // Strictly exclude providers missing location data
          if (provLat === null || provLat === undefined || provLng === null || provLng === undefined) {
             console.log('DEBUG [Home]: Excluded missing location for provider ID:', item.id)
            continue
          }

          const distance = calculateDistance(custLat, custLng, Number(provLat), Number(provLng))
          console.log(`DEBUG [Home]: Provider ${item.id} distance calculated: ${distance} km`)
          allProviders.push({ ...item, distance })
        }

        // Sort nearest first (ascending distance)
        allProviders.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))

        // Apply keyword / category search on top of the location-sorted results
        const filtered = allProviders.filter(p => providerMatchesSearch(p, searchQuery))
        if (searchQuery.trim() && filtered.length === 0) {
          setProviders([])
          setIsExtendedRadius(false)
          return
        }

        // Primary radius: providers within 7 km (no extra charge)
        const primaryRadiusProviders = filtered.filter(
          (p) => p.distance !== undefined && p.distance <= PRIMARY_RADIUS
        )

        if (primaryRadiusProviders.length > 0) {
          // Providers found within 7 km – show them normally
          setProviders(primaryRadiusProviders)
          setIsExtendedRadius(false)
        } else {
          // No provider within 7 km – fall back to providers up to 15 km
          const extendedRadiusProviders = filtered.filter(
            (p) => p.distance !== undefined && p.distance > PRIMARY_RADIUS && p.distance <= EXTENDED_RADIUS
          )
          setProviders(extendedRadiusProviders)
          setIsExtendedRadius(extendedRadiusProviders.length > 0)
        }
      } catch (err) {
        console.error('Error fetching providers:', err)
        setProviders([])
        setIsExtendedRadius(false)
      } finally {
        setSearchLoading(false)
      }
    }

    searchProviders()

    // Subscribe to realtime updates for service providers
    const channel = supabase
      .channel('service_providers_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'service_providers' },
        () => {
          searchProviders()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isAuthenticated, customerLocation, searchQuery])

  // Resolve active service category from the free-text search query
  const activeService = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return undefined
    return servicesList.find((s) => {
      const name = s.name.toLowerCase()
      const slug = s.slug.toLowerCase()
      if (name.includes(q) || q.includes(name)) return true
      if (slug.includes(q) || q.includes(slug)) return true
      const keywords = KEYWORDS_BY_SERVICE_SLUG[slug] ?? []
      return keywords.some((kw) => q.includes(kw) || kw.includes(q))
    })
  }, [servicesList, searchQuery])

  // Auto-suggest: flat list of keywords that match the current search
  const searchSuggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return []
    // service names
    const nameHits = servicesList
      .map((s) => s.name)
      .filter((n) => n.toLowerCase().includes(q) || q.includes(n.toLowerCase()))
    // keyword hits
    const kwHits: string[] = []
    for (const kws of Object.values(KEYWORDS_BY_SERVICE_SLUG)) {
      for (const kw of kws) {
        if (q.includes(kw) || kw.includes(q)) kwHits.push(kw)
      }
    }
    // de-dupe while preserving order
    const seen = new Set<string>()
    const out: string[] = []
    for (const item of [...nameHits, ...kwHits]) {
      const key = item.toLowerCase()
      if (!seen.has(key)) {
        seen.add(key)
        out.push(item)
      }
    }
    return out.slice(0, 8)
  }, [servicesList, searchQuery])

  // Formatted location display label
  const detectedLocationLabel = customerLocation
    ? [customerLocation.district || customerLocation.city, customerLocation.state]
        .filter(Boolean)
        .join(', ') || 'Current Location'
    : null

  // Redirect admins to admin dashboard
  if (isAdmin) {
    return <Navigate to="/admin" replace />
  }

  // Provider Homepage Summary View
  if (isProvider) {
    return (
      <Layout>
        <ProviderHomeSummary />
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="min-h-screen transition-colors duration-300" style={{background: 'linear-gradient(to bottom right, var(--color-bg), var(--color-surface))'}}>
        {/* ── HERO ── */}
        <section className="border-b relative overflow-hidden transition-colors duration-300" style={{backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)'}}>
          {/* Decorative gradient blobs */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-8 sm:pt-24 sm:pb-12 relative z-10">
            <div className="max-w-full">
              {/* ── SEARCH BAR ── */}
              {isAuthenticated && user?.role !== 'customer' && (
                <div className="relative mb-8 max-w-2xl">
                  <div className="relative">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => setSuggestionsOpen(true)}
                      onBlur={() => setSuggestionsOpen(false)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setSuggestionsOpen(false)
                      }}
                      placeholder={t('search_providers_placeholder', 'Search services (e.g. bulb fitting, fan repair, tap…)')}
                      className="w-full border-2 rounded-2xl pl-12 pr-4 py-4 text-base focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-2 transition-all duration-200 shadow-sm"
                      style={{backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)'}}/>
                    {suggestionsOpen && searchQuery.trim() && (
                      <div className="absolute top-full left-0 right-0 mt-2 border rounded-2xl shadow-lg z-20 py-1 transition-colors duration-300" style={{backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)'}}>
                        {searchSuggestions.length > 0 ? (
                          searchSuggestions.map((s) => (
                            <button
                              key={s}
                              onMouseDown={(e) => {
                                e.preventDefault()
                                setSearchQuery(s)
                                setSuggestionsOpen(false)
                              }}
                              className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors hover:bg-brand-50 hover:text-brand-700"
                              style={{color: 'var(--color-text-muted)'}}>
                              <SearchIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              {s}
                            </button>
                          ))
                        ) : (
                          <p className="px-4 py-2.5 text-sm" style={{color: 'var(--color-text-faint)'}}>No matching services found</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── REQUEST SERVICE CTA FOR CUSTOMERS ── */}
              {isAuthenticated && user?.role === 'customer' && (
                <div className="mb-8 space-y-4">
                  {/* Active Requests Status Banner */}
                  {activeCount > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                          <ClockIcon className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-amber-900">
                            You have {activeCount} active request{activeCount > 1 ? 's' : ''}
                          </p>
                          <p className="text-xs text-amber-700">
                            {activeCount === 1 ? 'Waiting for provider to accept' : 'Maximum active requests reached'}
                          </p>
                        </div>
                      </div>
                      <Link
                        to="/bookings"
                        className="text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1"
                      >
                        View <ArrowRightIcon className="w-3 h-3" />
                      </Link>
                    </div>
                  )}

                  {/* Main CTA Card */}
                  <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800 rounded-3xl p-6 sm:p-8 shadow-xl text-white relative overflow-hidden">
                    {/* Decorative elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>

                    <div className="relative z-10">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 mb-6">
                        <div className="flex-1">
                          <h2 className="text-2xl sm:text-3xl font-bold mb-3">Need a Service?</h2>
                          <p className="text-teal-100 text-sm sm:text-base leading-relaxed">
                            Submit a request and let verified providers come to you.
                            We'll match you with professionals within 20km of your location.
                          </p>
                        </div>
                        <Link
                          to="/request"
                          className={`flex items-center justify-center gap-2 px-6 py-3 bg-white text-teal-700 rounded-xl font-bold hover:bg-teal-50 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${atLimit ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                        >
                          <WrenchIcon className="w-5 h-5" />
                          {atLimit ? 'Limit Reached' : 'Request Service'}
                          <ArrowRightIcon className="w-4 h-4" />
                        </Link>
                      </div>

                      {/* Process Steps */}
                      </div>
                  </div>

                  {/* ── REQUESTED SERVICES SECTION ── */}
                  <div className="rounded-2xl border p-6 shadow-sm mb-8 transition-colors duration-300" style={{backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)'}}>
                    <div className="flex items-center justify-between mb-6 pb-4 border-b" style={{borderColor: 'var(--color-border)'}}>
                      <h2 className="text-base font-bold flex items-center gap-2" style={{color: 'var(--color-text)'}}>
                        <SearchIcon className="w-5 h-5 text-blue-600" /> {t('requested_services', 'Requested Services')}
                      </h2>
                      <Link to="/bookings" className="text-xs font-semibold hover:underline" style={{color: 'var(--color-primary)'}}>
                        {t('view_all_bookings', 'View all bookings')}
                      </Link>
                    </div>

                    {bookingsLoading ? (
                      <div className="py-12 text-center">
                        <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-sm text-slate-500 font-medium">{t('loading', 'Loading...')}</p>
                      </div>
                    ) : customerBookings.filter(b => b.status === 'broadcast').length === 0 ? (
                      <div className="py-12 text-center max-w-sm mx-auto">
                        <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4">
                          <SearchIcon className="w-7 h-7 text-slate-400" />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 mb-1">{t('no_pending_requests', 'No pending requests')}</h3>
                        <p className="text-sm text-slate-500 mb-6">
                          {t('submit_service_request', 'Submit a service request and let verified providers come to you.')}
                        </p>
                        <Link
                          to="/request"
                          className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 shadow-sm hover:bg-blue-700 transition-colors"
                        >
                          {t('request_service_now', 'Request Service Now')}
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {customerBookings.filter(b => b.status === 'broadcast').map((booking) => (
                          <div key={booking.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:border-blue-100 hover:bg-blue-50/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <div className="relative mt-1">
                                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                  <SearchIcon className="w-4 h-4 text-blue-600 animate-pulse" />
                                </div>
                                <div className="absolute inset-0 bg-blue-200 rounded-lg animate-ping opacity-20" style={{ animationDuration: '2s' }}></div>
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-bold text-slate-900 text-sm">
                                    {booking.provider?.service?.name || booking.service?.name || 'Service Request'}
                                  </h4>
                                  <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold rounded-md bg-purple-50 text-purple-600 border border-purple-200 animate-pulse">
                                    {t('searching_provider', 'Searching')}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                                  <SearchIcon className="w-3 h-3 text-purple-500" />
                                  <span className="animate-pulse">{t('finding_provider', 'Finding a provider for you...')}</span>
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                  {booking.address || 'Service location'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2">
                              <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                                <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                                {booking.scheduled_at ? new Date(booking.scheduled_at).toLocaleString() : t('asap', 'ASAP')}
                              </p>

                              <button
                                onClick={() => handleDeleteRequest(booking.id)}
                                className="text-xs font-semibold text-red-600 hover:text-red-800 flex items-center gap-1 px-2 py-1 rounded-md border border-red-200 hover:bg-red-50 transition-colors"
                                title="Cancel this request"
                              >
                                <TrashIcon className="w-3.5 h-3.5" />
                                Cancel
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ── MAP: Service Providers Within 10km Radius ── */}
                  {/* Only show map when customer has an active service request */}
                  {customerLocation && !bookingsLoading && customerBookings.some(b => b.status === 'broadcast') && (
                    <div className="mt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <LocationIcon className="w-4 h-4 text-blue-600" />
                          Service Providers Near You
                        </h3>
                        <span className="text-xs font-semibold text-slate-500">
                          {providersLoading ? 'Loading...' : `${nearbyProviders.length} providers nearby`}
                        </span>
                      </div>

                      {providersLoading ? (
                        <div className="h-64 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center">
                          <div className="text-center">
                            <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                            <p className="text-xs text-slate-500">Loading map...</p>
                          </div>
                        </div>
                      ) : (
                        <ProvidersMap
                          customerLocation={customerLocation}
                          providers={nearbyProviders}
                          radius={10}
                        />
                      )}
                    </div>
                  )}

                </div>
              )}

              {/* ── PROVIDER RESULTS (directly below search) ── */}
              {/* Provider search disabled - customers use pool-based request flow */}
              {isAuthenticated && user?.role === 'provider' && (
                <div className="mb-8">
                  <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 mb-1">
                        Nearby {activeService?.name || 'Service'} Providers
                      </h2>
                      <p className="text-sm text-slate-500">
                        {providers.length > 0 && isExtendedRadius
                          ? (
                            <>
                              No providers within {PRIMARY_RADIUS} km. Showing providers up to {EXTENDED_RADIUS} km
                              <span className="text-amber-600 font-semibold"> (may charge extra for travel)</span>
                              {' '}of {detectedLocationLabel}
                            </>
                          )
                          : providers.length > 0
                            ? `Showing verified pros within ${PRIMARY_RADIUS} km of ${detectedLocationLabel}`
                            : 'Searching for verified providers...'
                        }
                      </p>
                    </div>
                    {providers.length > 0 && (
                      <span className="text-sm font-bold px-3 py-1 rounded-full bg-brand-50 text-brand-600 border border-brand-100 w-fit">
                        {providers.length} found
                      </span>
                    )}
                  </div>

                  {locationLoading || searchLoading ? (
                    <div className="card p-12 text-center">
                      <div className="w-8 h-8 border-[3px] border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-sm font-semibold text-slate-700">Calculating distances...</p>
                    </div>
                  ) : providers.length === 0 ? (
                    <div className="card p-12 text-center max-w-lg mx-auto">
                      <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <SearchIcon className="w-6 h-6" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mb-2">No providers found nearby</h3>
                      <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                        No verified {activeService?.name?.toLowerCase() || 'service'} pros found within {EXTENDED_RADIUS} km of your location.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {providers.map((prov) => {
                        const initial = prov.user?.full_name?.charAt(0).toUpperCase() || 'P'
                        return (
                          <div key={prov.id} className="card card-hover p-5 flex flex-col justify-between">
                            <div>
                              <div className="flex items-start justify-between gap-3 mb-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-11 h-11 rounded-xl bg-brand-500 text-white font-bold text-lg flex items-center justify-center flex-shrink-0">
                                    {initial}
                                  </div>
                                  <div>
                                    <h3 className="font-bold text-slate-900 leading-tight">
                                      {prov.user?.full_name || 'Verified Provider'}
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                      {prov.user?.city || detectedLocationLabel || 'Local Provider'}
                                    </p>
                                  </div>
                                </div>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100 flex-shrink-0">
                                  <CheckCircleIcon className="w-3 h-3" /> Verified
                                </span>
                              </div>
                              <p className="text-sm text-slate-400 mb-4">
                                Professional {activeService?.name || 'service'} provider.
                              </p>
                            </div>

                            {isExtendedRadius && prov.distance !== undefined && prov.distance > PRIMARY_RADIUS && (
                              <div className="mt-2 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 text-center w-full">
                                ⚠️ Extra charge ₹{Math.round((prov.distance - PRIMARY_RADIUS) * 50 / 5) * 5} (travel beyond {PRIMARY_RADIUS} km) – coming from {formatDistance(prov.distance)}
                              </div>
                            )}

                            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                              <div className="flex items-center gap-3 text-sm font-medium">
                                {prov.rating > 0 && (
                                  <span className="flex items-center gap-1 text-amber-600 font-bold">
                                    <StarIcon className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                    {prov.rating.toFixed(1)}
                                  </span>
                                )}
                                <span className="flex items-center gap-1 text-brand-600 font-bold">
                                  <LocationIcon className="w-3 h-3" />
                                  {prov.distance !== undefined ? formatDistance(prov.distance) : 'Nearby'}
                                </span>
                              </div>
                              <button
                                onClick={() => {
                                  if (atLimit) return alert('Max active services reached.')
                                  setSelectedProvider(prov)
                                }}
                                className="btn-primary px-4 py-2 text-sm"
                              >
                                Book
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── HERO TEXT (moved after results) ── */}
              {!isAuthenticated && (
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 text-brand-500 text-xs font-semibold mb-6 border border-brand-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                    Live GPS Matching
                  </div>
                  <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 leading-[1.1] mb-6">
                    Trusted home services, <br className="hidden sm:block" />just around the corner.
                  </h1>
                  <p className="text-lg text-slate-600 mb-10 leading-relaxed max-w-lg">
                    Find verified electricians, plumbers, and carpenters in your neighbourhood. Real-time distance, transparent pricing, zero middlemen.
                  </p>

                  <div className="flex flex-wrap items-center gap-4">
                    <Link to="/signup" className="btn-primary px-8 py-3.5 text-base">
                      Get Started
                    </Link>
                    <Link to="/how-it-works" className="btn-ghost px-8 py-3.5 text-base">
                      How it works
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        {!(isAuthenticated && user?.role === 'provider') && (
          <section className="py-16 bg-white border-y border-slate-200">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <div className="text-center mb-12">
                <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-slate-900">
                  How It Works
                </h2>
                <p className="text-slate-500 max-w-2xl mx-auto">
                  Simple, fast, and transparent service booking in three easy steps.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 text-white flex items-center justify-center mx-auto mb-5 shadow-lg text-2xl font-bold">
                    1
                  </div>
                  <h3 className="font-bold text-slate-900 text-lg mb-3">Request Service</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    Submit your service request with details. No need to search for providers — they come to you.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 text-white flex items-center justify-center mx-auto mb-5 shadow-lg text-2xl font-bold">
                    2
                  </div>
                  <h3 className="font-bold text-slate-900 text-lg mb-3">Get Matched</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    We broadcast your request to verified providers within 10km. They'll review and accept your job.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 text-white flex items-center justify-center mx-auto mb-5 shadow-lg text-2xl font-bold">
                    3
                  </div>
                  <h3 className="font-bold text-slate-900 text-lg mb-3">Service Completed</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    Professional arrives, completes the work, and you pay directly. Rate your experience.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── SERVICES GRID ── */}
        {!(isAuthenticated && user?.role === 'provider') && (
          <section className="py-16 bg-slate-50">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <div className="mb-10 flex flex-col sm:flex-row items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-slate-900">
                    Our Services
                  </h2>
                  <p className="text-slate-500">
                    Professional home services at your fingertips.
                  </p>
                </div>
                <Link to="/services" className="text-sm font-bold text-brand-500 hover:text-brand-600 transition-colors flex items-center gap-1">
                  View all <ArrowRightIcon className="w-4 h-4" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {servicesList.slice(0, 6).map((service) => {
                  const ServiceIcon = SERVICE_ICONS[service.slug] || WrenchIcon
                  return (
                    <div
                      key={service.id}
                      onClick={() => {
                        if (isAuthenticated) {
                          setSearchQuery(service.name)
                          window.scrollTo({ top: 0, behavior: 'smooth' })
                        }
                      }}
                      className="card card-hover p-6 flex flex-col h-full cursor-pointer group"
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-500 flex items-center justify-center border border-brand-100 group-hover:bg-brand-500 group-hover:text-white transition-colors">
                          <ServiceIcon className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-slate-900 text-lg">{service.name}</h3>
                      </div>
                      <p className="text-sm text-slate-500 mb-6 leading-relaxed flex-1">
                        {service.description || 'Reliable home service'}
                      </p>
                      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                        <span className="text-sm font-bold text-slate-900">From ₹199</span>
                        <span className="flex items-center gap-1.5 text-sm font-bold text-brand-500 group-hover:text-brand-600 transition-colors">
                          {isAuthenticated ? 'Search' : 'Explore'} <ArrowRightIcon className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {/* ── WHY SAHAAY (TRUST) ── */}
        {!(isAuthenticated && user?.role === 'provider') && (
          <section className="py-16 bg-slate-50">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <div className="text-center mb-12">
                <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-slate-900">
                  Why Sahaay?
                </h2>
                <p className="text-slate-500 max-w-2xl mx-auto">
                  A hyperlocal network built for trust, speed, and quality.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card p-6 text-center">
                  <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-500 flex items-center justify-center mx-auto mb-4 border border-brand-100">
                    <LocationIcon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-lg mb-2">Real GPS Proximity</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    No guessing. We use precise real-time GPS distance to connect you with the nearest professional.
                  </p>
                </div>

                <div className="card p-6 text-center">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                    <ShieldCheckIcon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-lg mb-2">Verified Professionals</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    Every provider undergoes rigorous credential and background verification.
                  </p>
                </div>

                <div className="card p-6 text-center">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-4 border border-amber-100">
                    <span className="font-bold text-xl">₹</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-lg mb-2">Direct Pricing</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    Transparent rates set by professionals. No hidden middleman fees.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── PROVIDER CTA ── */}
        {!(isAuthenticated && user?.role === 'customer') && (
          <section className="py-16 bg-white border-t border-slate-200">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
              <div className="bg-slate-900 rounded-2xl p-10 sm:p-14 text-center">
                <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white">
                  Earn with Sahaay
                </h2>
                <p className="text-lg mb-8 max-w-xl mx-auto text-slate-400 leading-relaxed">
                  Join our network of verified professionals. Get matched with customers in your neighborhood.
                </p>
                <Link to="/provider-onboarding" className="btn-primary px-8 py-3.5 text-base bg-brand-500 hover:bg-brand-600">
                  Register as Provider <ArrowRightIcon className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Booking Modal */}
        {selectedProvider && (
          <BookingModal
            provider={{
              id: selectedProvider.id,
              user_id: selectedProvider.user_id,
              service_id: selectedProvider.service_id,
              bio: selectedProvider.bio,
              years_experience: selectedProvider.years_experience,
              service_radius_km: selectedProvider.service_radius_km,
              verification_status: selectedProvider.verification_status as 'unverified' | 'pending' | 'verified' | 'rejected',
              rating: selectedProvider.rating,
              jobs_completed: selectedProvider.jobs_completed,
              hourly_rate: selectedProvider.hourly_rate,
              is_available: selectedProvider.is_available,
              latitude: 0,
              longitude: 0,
              profile_photo_url: undefined,
              user: selectedProvider.user,
            }}
            serviceName={activeService?.name}
            customerLocation={{
              latitude: customerLocation?.latitude || 0,
              longitude: customerLocation?.longitude || 0,
              city: customerLocation?.city || 'Unknown',
              state: customerLocation?.state || 'Location'
            }}
            onSubmit={handleBookingSubmit}
            onClose={() => setSelectedProvider(null)}
            isSubmitting={isSubmittingBooking}
          />
        )}
      </div>
    </Layout>
  )
}

export default Home
