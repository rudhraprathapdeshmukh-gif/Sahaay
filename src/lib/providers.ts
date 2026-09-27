import type { User, Service, ServiceProvider, Skill, ProviderProfileFull, Booking, BookingStatus } from '@/types/database'
import { supabase } from './supabase'

// ── Types for Provider Home Data ──────────────────────────────────────────
export interface BookingWithDetails extends Booking {
  customer: {
    full_name: string
    avatar_url: string | null
    phone: string | null
  } | null
  service: {
    name: string
  } | null
  distance_km?: number | null
}

export const DEFAULT_SKILLS_BY_SERVICE: Record<number, string[]> = {
  1: [
    'Fan Repair',
    'Switch & Socket Repair',
    'Light Installation',
    'Wiring Repair',
  ],
  2: [
    'Tap Repair',
    'Pipe Leakage',
    'Drain Blockage',
    'Bathroom Plumbing',
  ],
  3: [
    'Door Repair',
    'Furniture Repair',
    'Lock Repair',
    'Shelf Installation',
  ],
  4: [
    'Wall Painting',
    'Room Painting',
    'Touch-up',
    'Exterior Painting',
  ],
  5: [
    'Home Cleaning',
    'Bathroom Cleaning',
    'Kitchen Cleaning',
    'Deep Cleaning',
  ],
  6: [
    'Local Driver',
    'Outstation Driver',
    'Full-Day Driver',
  ],
  7: [
    'AC Repair',
    'Refrigerator Repair',
    'Washing Machine Repair',
    'TV Repair',
  ],
  8: [
    'Elder Care',
    'Patient Care',
    'Daily Assistance',
  ],
}

// ── Fetch all services (for the category dropdown) ─────────────────────
export const fetchServices = async (): Promise<Service[]> => {
  const { data, error } = await supabase
    .from('services')
    .select('id, name, slug, icon, description, created_at')
    .order('id')
  if (error) throw error
  return data ?? []
}

// ── Look up a service by name ────────────────────────────────────────
export const fetchServiceByName = async (name: string): Promise<Service | null> => {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .ilike('name', name)
    .maybeSingle()
  if (error) throw error
  return data
}

// ── Fetch skills for a selected service category ──────────────────────
export const fetchSkillsForService = async (serviceId: number): Promise<Skill[]> => {
  try {
    const { data, error } = await supabase
      .from('skills')
      .select('*')
      .eq('service_id', serviceId)
      .order('name')

    if (!error && data && data.length > 0) {
      return data
    }
  } catch (err) {
    console.warn('Could not fetch skills from database, falling back to defaults:', err)
  }

  // Fallback to preset defaults if database has no rows seeded yet
  const defaults = DEFAULT_SKILLS_BY_SERVICE[serviceId] || []
  return defaults.map((name, index) => ({
    id: -(index + 1), // temporary negative IDs for virtual preset skills
    name,
    service_id: serviceId,
    created_at: new Date().toISOString(),
  }))
}

// ── Create or update a user profile ─────────────────────────────────
export const upsertUser = async (payload: {
  id: string
  email: string
  full_name: string
  phone?: string
  city?: string
  state?: string
  latitude?: number
  longitude?: number
  role?: 'customer' | 'provider' | 'admin'
  first_name?: string
  last_name?: string
  dob?: string
}): Promise<User> => {
  // Minimal payload with only guaranteed columns
  const minimalPayload = {
    id: payload.id,
    email: payload.email,
    full_name: payload.full_name,
    role: payload.role,
  }

  // Try with all fields first
  try {
    const { data, error } = await supabase
      .from('users')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single()

    if (!error && data) return data

    // If column doesn't exist (42703) or schema cache error, retry with extended payload
    if (error) {
      // Check for unique constraint violation (23505)
      if (error.code === '23505' && error.details?.includes('idx_users_phone_unique')) {
        throw new Error('Mobile number already registered.')
      }

      const errMsg = error.message?.toLowerCase() || ''
      if (error.code === '42703' || errMsg.includes("could not find") || errMsg.includes("column")) {

        console.warn('Columns missing, retrying with base columns:', error.message)

        // Extended payload without new columns
        const extendedPayload = {
          id: payload.id,
          email: payload.email,
          full_name: payload.full_name,
          phone: payload.phone,
          city: payload.city,
          state: payload.state,
          role: payload.role,
        }

        const { data: retryData, error: retryError } = await supabase
          .from('users')
          .upsert(extendedPayload, { onConflict: 'id' })
          .select()
          .single()

        if (retryError) {
          // Final fallback: minimal payload only
          console.warn('Extended columns also missing, using minimal payload:', retryError.message)
          const { data: minimalData, error: minimalError } = await supabase
            .from('users')
            .upsert(minimalPayload, { onConflict: 'id' })
            .select()
            .single()

          if (minimalError) {
            if (minimalError.message?.toLowerCase().includes('permission denied') || minimalError.message?.toLowerCase().includes('policy')) {
              throw new Error('Failed to create user profile: RLS policy may not be configured. Please check Supabase migrations.')
            }
            throw minimalError
          }
          return minimalData
        }
        return retryData
      }

      if (errMsg.includes('permission denied') || errMsg.includes('policy')) {
        throw new Error('Failed to create user profile: RLS policy may not be configured. Please check Supabase migrations.')
      }
      throw error
    }
  } catch (err: any) {
    if (err.message?.includes('RLS policy')) throw err
    // Try minimal payload one more time as last resort
    try {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('users')
        .upsert(minimalPayload, { onConflict: 'id' })
        .select()
        .single()
      if (fallbackError) throw fallbackError
      return fallbackData
    } catch (fallbackErr: any) {
      throw new Error(`Failed to create user profile: ${err.message || fallbackErr.message || 'Unknown error'}`)
    }
  }

  throw new Error('Failed to create user profile: Unknown error')
}

// ── Create or update provider profile directly ────────────────────────
export const upsertProviderProfile = async (payload: {
  user_id: string
  service_id: number
  bio: string
  years_experience: string
  service_radius_km: number
  availability?: string[]
  profile_photo_url?: string | null
  certificate_url?: string | null
  latitude?: number
  longitude?: number
}): Promise<ServiceProvider> => {
  // First attempt with all columns
  try {
    const { data, error } = await supabase
      .from('service_providers')
      .upsert(
        {
          user_id: payload.user_id,
          service_id: payload.service_id,
          bio: payload.bio,
          years_experience: payload.years_experience,
          service_radius_km: 10,
          availability: payload.availability ?? [],
          profile_photo_url: payload.profile_photo_url ?? null,
          certificate_url: payload.certificate_url ?? null,
          latitude: payload.latitude ?? null,
          longitude: payload.longitude ?? null,
          verification_status: 'pending',
          is_available: true,
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single()

    if (!error && data) return data

    // If column doesn't exist (42703), retry without new columns
    if (error && error.code === '42703') {
      console.warn('Some service_providers columns not found, retrying with base columns:', error.message)
    } else if (error) {
      throw error
    }
  } catch (err: any) {
    console.warn('Retrying provider profile upsert without extra columns:', err.message)
  }

  // Fallback without availability & extra columns
  const { data, error } = await supabase
    .from('service_providers')
    .upsert(
      {
        user_id: payload.user_id,
        service_id: payload.service_id,
        bio: payload.bio,
        years_experience: payload.years_experience,
        service_radius_km: 10,
        verification_status: 'pending',
        is_available: true,
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single()

  if (error) {
    const msg = error.message?.toLowerCase() || ''
    if (msg.includes('permission denied') || msg.includes('policy') || msg.includes('violates row-level security')) {
      throw new Error('Failed to create provider profile: RLS policy may be blocking the insert. Please apply migration 0006_provider_extra_fields.sql in Supabase SQL Editor.')
    }
    throw error
  }
  return data
}

// ── Fetch a provider profile by user_id ───────────────────────────────
export const fetchProviderByUserId = async (userId: string): Promise<ServiceProvider | null> => {
  const { data, error } = await supabase
    .from('service_providers')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

// ── Save skills associated with provider ──────────────────────────────
export const saveProviderSkills = async (
  providerId: string,
  skills: { id?: number; name: string }[],
  serviceId: number
): Promise<void> => {
  if (!skills || skills.length === 0) return

  try {
    // Resolve skill IDs
    const resolvedIds: number[] = []

    for (const s of skills) {
      if (s.id && s.id > 0) {
        resolvedIds.push(s.id)
      } else {
        // Find or insert in database skills table
        try {
          const { data: existing } = await supabase
            .from('skills')
            .select('id')
            .eq('service_id', serviceId)
            .ilike('name', s.name)
            .maybeSingle()

          if (existing?.id) {
            resolvedIds.push(existing.id)
          } else {
            const { data: created } = await supabase
              .from('skills')
              .insert({ service_id: serviceId, name: s.name })
              .select('id')
              .maybeSingle()
            if (created?.id) resolvedIds.push(created.id)
          }
        } catch {
          // ignore skill insertion if RLS limits it
        }
      }
    }

    if (resolvedIds.length > 0) {
      // Clear previous links
      await supabase.from('provider_skills').delete().eq('provider_id', providerId)

      // Insert new links
      const rows = resolvedIds.map(skill_id => ({
        provider_id: providerId,
        skill_id,
      }))
      await supabase.from('provider_skills').insert(rows)
    }
  } catch (err) {
    console.warn('Notice: Provider skills could not be synced to provider_skills table:', err)
  }
}

// ── Fetch provider + service + user + skills data (for profile preview) ────────
export const fetchFullProviderProfile = async (userId: string): Promise<ProviderProfileFull | null> => {
  const { data: provider, error: providerError } = await supabase
    .from('service_providers')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (providerError) throw providerError
  if (!provider) return null

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (userError) throw userError
  if (!user) return null

  let service: Service | null = null
  if (provider.service_id) {
    const { data: s } = await supabase
      .from('services')
      .select('*')
      .eq('id', provider.service_id)
      .maybeSingle()
    service = s
  }

  // Load skills linked to provider
  let skills: Skill[] = []
  try {
    const { data: links } = await supabase
      .from('provider_skills')
      .select('skill_id, skills(*)')
      .eq('provider_id', provider.id)

    if (links && links.length > 0) {
      skills = links
        .map((l: any) => l.skills)
        .filter((sk: any): sk is Skill => Boolean(sk && sk.name))
    }
  } catch (err) {
    console.warn('Could not load linked provider_skills:', err)
  }

  // If no linked skills in DB, fallback to category defaults for clean presentation
  if (skills.length === 0 && provider.service_id) {
    const defaults = DEFAULT_SKILLS_BY_SERVICE[provider.service_id] || []
    skills = defaults.slice(0, 3).map((name, i) => ({
      id: -(i + 1),
      name,
      service_id: provider.service_id,
      created_at: new Date().toISOString(),
    }))
  }

  return { provider, user, service, skills }
}

// ── Complete Provider Registration (RPC with resilient client fallback) ─────
export const registerProvider = async (payload: {
  user_id: string
  email: string
  full_name: string
  first_name?: string
  last_name?: string
  dob?: string
  phone: string
  district: string
  state: string
  service_id: number
  bio: string
  years_experience: string
  service_radius_km: number
  availability: string[]
  skills?: { id?: number; name: string }[]
  latitude?: number
  longitude?: number
  profile_photo_url?: string | null
  certificate_url?: string | null
  uan?: string | null
}): Promise<{ user: User; provider: ServiceProvider }> => {
  const skillIds = (payload.skills ?? [])
    .map(s => s.id)
    .filter((id): id is number => typeof id === 'number' && id > 0)

  // 1. Try atomic RPC register_provider if available
  try {
    const { data, error } = await supabase.rpc('register_provider', {
      p_user_id: payload.user_id,
      p_email: payload.email,
      p_full_name: payload.full_name,
      p_phone: payload.phone,
      p_city: payload.district, // district is stored in the city column
      p_state: payload.state,
      p_service_id: payload.service_id,
      p_bio: payload.bio,
      p_years_exp: payload.years_experience,
      p_radius_km: payload.service_radius_km,
      p_availability: payload.availability,
      p_skill_ids: skillIds,
      p_latitude: payload.latitude ?? null,
      p_longitude: payload.longitude ?? null,
      p_certificate_url: payload.certificate_url ?? null,
      p_uan: payload.uan ?? null,
    })

    if (!error && data?.user && data?.provider) {
      return data as { user: User; provider: ServiceProvider }
    }
  } catch (rpcErr) {
    console.warn('RPC register_provider failed or not found, falling back to direct table queries:', rpcErr)
  }

  // 2. Direct client fallback (handles unmigrated RPC gracefully)
  const userProfile = await upsertUser({
    id: payload.user_id,
    email: payload.email,
    full_name: payload.full_name,
    first_name: payload.first_name,
    last_name: payload.last_name,
    dob: payload.dob,
    phone: payload.phone,
    city: payload.district, // district is stored in the city column
    state: payload.state,
    role: 'provider',
    latitude: payload.latitude,
    longitude: payload.longitude,
  })

  // update avatar also
  if(payload.profile_photo_url) {
    await updateUserProfile(payload.user_id, {
      avatar_url: payload.profile_photo_url,
    })
  }

  const providerProfile = await upsertProviderProfile({
    user_id: payload.user_id,
    service_id: payload.service_id,
    bio: payload.bio,
    years_experience: payload.years_experience,
    service_radius_km: payload.service_radius_km,
    availability: payload.availability,
    latitude: payload.latitude,
    longitude: payload.longitude,
    profile_photo_url: payload.profile_photo_url,
    certificate_url: payload.certificate_url,
  })

  // Try to save skills to provider_skills (no-op when no skills supplied)
  await saveProviderSkills(providerProfile.id, payload.skills ?? [], payload.service_id)

  return { user: userProfile, provider: providerProfile }
}

// ── Update user profile details ─────────────────────────────────────────
export const updateUserProfile = async (
  userId: string,
  updates: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>
): Promise<User> => {
  // Check if new phone is taken by someone else
  if (updates.phone) {
    const { data: phoneCheck } = await supabase
      .from('users')
      .select('id')
      .eq('phone', updates.phone)
      .neq('id', userId)
      .maybeSingle()

    if (phoneCheck) {
      throw new Error('Mobile number already registered.')
    }
  }

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  if (error) {
     if (error.code === '23505' && error.details?.includes('idx_users_phone_unique')) {
        throw new Error('Mobile number already registered.')
      }
     throw error
  }
  return data
}

// ── Update full provider profile with skills ────────────────────────────
export const updateFullProviderProfile = async (payload: {
  user_id: string
  full_name: string
  phone: string
  city: string
  state: string
  avatar_url?: string | null
  service_id: number
  bio: string
  years_experience: string
  service_radius_km: number
  availability: string[]
  profile_photo_url?: string | null
  skills: { id?: number; name: string }[]
}): Promise<ProviderProfileFull> => {
  // 1. Update user profile
  // Note: district (users.city) is intentionally NOT updated — it is immutable after registration.
  await updateUserProfile(payload.user_id, {
    full_name: payload.full_name,
    phone: payload.phone,
    state: payload.state,
    ...(payload.avatar_url !== undefined ? { avatar_url: payload.avatar_url } : {}),
  })

  // 2. Update provider profile
  // Preserve the existing certificate_url — it is only set at registration and
  // cannot be re-uploaded from the edit form, so never null it out here.
  const { data: existingProvider } = await supabase
    .from('service_providers')
    .select('certificate_url')
    .eq('user_id', payload.user_id)
    .maybeSingle()

  const provider = await upsertProviderProfile({
    user_id: payload.user_id,
    service_id: payload.service_id,
    bio: payload.bio,
    years_experience: payload.years_experience,
    service_radius_km: payload.service_radius_km,
    availability: payload.availability,
    profile_photo_url: payload.profile_photo_url ?? payload.avatar_url ?? undefined,
    certificate_url: existingProvider?.certificate_url ?? null,
  })

  // 3. Sync skills
  await saveProviderSkills(provider.id, payload.skills, payload.service_id)

  // 4. Fetch fresh profile
  const fresh = await fetchFullProviderProfile(payload.user_id)
  if (!fresh) {
    throw new Error('Could not retrieve updated profile.')
  }
  return fresh
}


// ── Fetch Provider Dashboard Context (Home Data) ──────────────────────────
export const fetchProviderHomeData = async (userId: string) => {
  // Fetch provider profile
  const { data: provider, error: providerError } = await supabase
    .from('service_providers')
    .select('*, service:services(name, slug), user:users(full_name, avatar_url, phone, city, state)')
    .eq('user_id', userId)
    .single()

  if (providerError) throw providerError

  // Fetch all relevant bookings to calculate stats and lists
  const { data: bookingsData, error: bookingsError } = await supabase
    .from('bookings')
    .select('*, customer:users(full_name, avatar_url, phone), service:services(name)')
    .eq('provider_id', provider.id)
    .order('created_at', { ascending: false })

  if (bookingsError) {
    console.error('Error fetching bookings:', bookingsError)
  }

  const allBookings = (bookingsData || []) as any[]

  const pendingRequests = allBookings.filter(b => b.status === 'pending')
  const acceptedRequests = allBookings.filter(b => ['in_progress', 'confirmed'].includes(b.status))
  const completedJobs = allBookings.filter(b => b.status === 'completed')

  // Fetch INCOMING broadcast requests (new requests for this provider's service type)
  // These are requests with status 'broadcast' and no provider assigned yet
  const { data: broadcastData, error: broadcastError } = await supabase
    .from('bookings')
    .select('*, customer:users(full_name, avatar_url, phone), service:services(name)')
    .eq('status', 'broadcast')
    .is('provider_id', null)
    .eq('service_id', provider.service_id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (broadcastError) {
    console.error('Error fetching broadcast requests:', broadcastError)
  }

  const incomingRequests = (broadcastData || []) as any[]

  // Calculate earnings from completed jobs where amount is present
  const totalEarnings = completedJobs.reduce((sum, b) => sum + (b.amount || 0), 0)

  return {
    provider,
    pendingRequests,
    acceptedRequests,
    completedJobs,
    incomingRequests, // NEW: broadcast requests waiting to be accepted
    stats: {
      pendingCount: pendingRequests.length,
      incomingCount: incomingRequests.length,
      acceptedCount: acceptedRequests.length,
      completedCount: completedJobs.length,
      rating: provider.rating || 0,
      totalEarnings,
    }
  }
}

// ── Update Booking Status ────────────────────────────────────────────────
export const updateBookingStatus = async (bookingId: string, status: BookingStatus) => {
  const { data, error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', bookingId)
    .select()
    .single()

  if (error) throw error
  
  try {
    let title = '';
    let body = '';
    let type = '';
    
    // For specific statuses, trigger notification to customer
    if (status === 'in_progress') {
      type = 'journey_started';
      title = 'Provider On The Way 🚗';
      body = 'Your service provider is on their way to your location.';
    } else if (status === 'started' as any) {
      type = 'booking_confirmed';
      title = 'Service Started ⏱️';
      body = 'Your service is now in progress.';
    } else if (status === 'completed') {
      type = 'service_completed';
      title = 'Service Completed 🎉';
      body = 'Your service has been marked as completed. Please leave a review!';
    } else if (status === 'cancelled') {
      type = 'booking_cancelled';
      title = 'Booking Cancelled ❌';
      body = 'Your booking has been cancelled.';
    }
    
    if (title && type) {
      await createNotification({
        user_id: data.customer_id,
        type: type as any,
        title,
        body,
        related_id: data.id,
        related_type: 'booking'
      });
    }
  } catch (err) {
    console.error('Failed to notify customer on status update:', err);
  }
  
  return data
}
