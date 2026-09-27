// Database types for Sahaay
// These mirror the schema in supabase/migrations/0001_init.sql
// Regenerate via: `supabase gen types typescript` once your project is set up

export type UserRole = 'customer' | 'provider' | 'admin'
export type BookingStatus = 'broadcast' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected'

export interface User {
  id: string
  email: string
  full_name: string
  phone: string | null
  role: UserRole
  avatar_url: string | null
  city: string | null
  state: string | null
  latitude: number | null
  longitude: number | null
  first_name: string | null
  last_name: string | null
  dob: string | null
  created_at: string
  updated_at: string
}

export interface Service {
  id: number
  name: string
  slug: string
  icon: string | null
  description: string | null
  created_at: string
}

export interface Skill {
  id: number
  name: string
  service_id: number
  created_at: string
}

export interface ServiceProvider {
  id: string
  user_id: string
  service_id: number
  bio: string | null
  years_experience: string | null
  service_radius_km: number
  verification_status: VerificationStatus
  rating: number
  jobs_completed: number
  hourly_rate: number | null
  is_available: boolean
  availability: string[] | null
  profile_photo_url: string | null
  certificate_url: string | null
  latitude: number | null
  longitude: number | null
  created_at: string
  updated_at: string
}

export interface ProviderSkill {
  provider_id: string
  skill_id: number
}

export interface ProviderProfileFull {
  provider: ServiceProvider
  user: User
  service: Service | null
  skills: Skill[]
}

export interface Booking {
  id: string
  customer_id: string
  provider_id: string | null
  service_id: number
  status: BookingStatus
  scheduled_at: string | null
  completed_at: string | null
  address: string | null
  notes: string | null
  amount: number
  latitude: number | null
  longitude: number | null
  created_at: string
  updated_at: string
}

export interface Review {
  id: string
  booking_id: string
  customer_id: string
  provider_id: string
  rating: number
  comment: string | null
  created_at: string
}

// Insert / Update payload types (omit auto-generated columns)
export type UserInsert = Omit<User, 'id' | 'created_at' | 'updated_at'>
export type UserUpdate = Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>

export type ServiceProviderInsert = Omit<ServiceProvider, 'id' | 'created_at' | 'updated_at' | 'rating' | 'jobs_completed' | 'verification_status'>
export type ServiceProviderUpdate = Partial<Omit<ServiceProvider, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

export type BookingInsert = Omit<Booking, 'id' | 'created_at' | 'updated_at'>
export type BookingUpdate = Partial<Omit<Booking, 'id' | 'customer_id' | 'provider_id' | 'created_at' | 'updated_at'>>

export type ReviewInsert = Omit<Review, 'id' | 'created_at'>
export type ReviewUpdate = Partial<Omit<Review, 'id' | 'created_at'>>

// Database schema (the actual `Database` type that Supabase expects)
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User
        Insert: UserInsert
        Update: UserUpdate
      }
      services: {
        Row: Service
        Insert: Omit<Service, 'id' | 'created_at'>
        Update: Partial<Omit<Service, 'id' | 'created_at'>>
      }
      skills: {
        Row: Skill
        Insert: Omit<Skill, 'id' | 'created_at'>
        Update: Partial<Omit<Skill, 'id' | 'created_at'>>
      }
      service_providers: {
        Row: ServiceProvider
        Insert: ServiceProviderInsert
        Update: ServiceProviderUpdate
      }
      provider_skills: {
        Row: ProviderSkill
        Insert: Omit<ProviderSkill, never>
        Update: Partial<Omit<ProviderSkill, never>>
      }
      bookings: {
        Row: Booking
        Insert: BookingInsert
        Update: BookingUpdate
      }
      reviews: {
        Row: Review
        Insert: ReviewInsert
        Update: ReviewUpdate
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
