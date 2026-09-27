import { supabase } from './supabase'
import type { Service, User, ServiceProvider, Booking } from '@/types/database'

// ── Services (categories) ─────────────────────────────────────
export const fetchServices = async (): Promise<Service[]> => {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .order('name')
  if (error) throw error
  return data ?? []
}

// ── Users ─────────────────────────────────────────────────────
export const fetchUser = async (id: string): Promise<User | null> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

export const createUser = async (user: {
  id: string
  email: string
  full_name: string
  role?: 'customer' | 'provider' | 'admin'
}): Promise<User> => {
  const { data, error } = await supabase
    .from('users')
    .insert({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role ?? 'customer',
    })
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Service Providers ─────────────────────────────────────────
export const fetchProviders = async (filters?: {
  service_id?: number
  city?: string
  verification_status?: 'pending' | 'verified'
}): Promise<ServiceProvider[]> => {
  let query = supabase
    .from('service_providers')
    .select('*')
    .order('rating', { ascending: false })

  if (filters?.service_id) query = query.eq('service_id', filters.service_id)
  if (filters?.city) query = query.eq('user_id.city', filters.city) // joined field
  if (filters?.verification_status) query = query.eq('verification_status', filters.verification_status)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export const fetchProviderById = async (id: string): Promise<ServiceProvider | null> => {
  const { data, error } = await supabase
    .from('service_providers')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

export const createProviderProfile = async (profile: {
  user_id: string
  service_id: number
  bio: string
  years_experience: string
  service_radius_km: number
}): Promise<ServiceProvider> => {
  const { data, error } = await supabase
    .from('service_providers')
    .insert({
      user_id: profile.user_id,
      service_id: profile.service_id,
      bio: profile.bio,
      years_experience: profile.years_experience,
      service_radius_km: profile.service_radius_km,
      verification_status: 'pending',
    })
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Bookings ──────────────────────────────────────────────────
export const fetchBookingsForCustomer = async (customerId: string): Promise<Booking[]> => {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('customer_id', customerId)
    .order('scheduled_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export const fetchBookingsForProvider = async (providerId: string): Promise<Booking[]> => {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('provider_id', providerId)
    .order('scheduled_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export const createBooking = async (booking: {
  customer_id: string
  provider_id: string | null
  service_id: number
  scheduled_at?: string
  address?: string
  notes?: string
  amount: number
}): Promise<Booking> => {
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      ...booking,
      provider_id: booking.provider_id ?? null,
      status: 'pending',
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateBookingStatus = async (
  bookingId: string,
  status: Booking['status']
): Promise<Booking> => {
  const update: Partial<Booking> = { status }
  if (status === 'completed') update.completed_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('bookings')
    .update(update)
    .eq('id', bookingId)
    .select()
    .single()
  if (error) throw error
  return data
}
