/**
 * Database cleanup utility for removing fake/placeholder data
 *
 * Usage:
 * 1. Import and call cleanupFakeData() in your admin panel or setup script
 * 2. Or run as an SQL migration in Supabase
 */

import { supabase } from './supabase'
import type { User } from '@/types/database'

// Common patterns for fake/placeholder data
const FAKE_DATA_PATTERNS = {
  emails: [
    'test@',
    'demo@',
    'fake@',
    'placeholder@',
    'dummy@',
    'example@',
    'sample@',
    'admin@localhost',
    'user@localhost',
  ],
  names: [
    'test user',
    'demo user',
    'john doe',
    'jane doe',
    'admin',
    'placeholder',
    'sample',
    'dummy',
    'example',
  ],
  phones: [
    '1234567890',
    '9999999999',
    '0000000000',
    '5555555555',
    '+1234567890',
    'test',
    'demo',
    'placeholder',
  ],
  cities: ['test city', 'demo city', 'sample city', 'placeholder', 'n/a'],
  bios: [
    'test bio',
    'demo bio',
    'placeholder bio',
    'sample bio',
    'lorem ipsum',
    'test description',
  ],
}

/**
 * Check if a user record contains fake/placeholder data
 */
export function isFakeUser(user: User): boolean {
  const email = user.email?.toLowerCase() || ''
  const fullName = user.full_name?.toLowerCase() || ''
  const phone = user.phone?.toLowerCase() || ''
  const city = user.city?.toLowerCase() || ''

  // Check email patterns
  if (FAKE_DATA_PATTERNS.emails.some((pattern) => email.includes(pattern))) {
    return true
  }

  // Check name patterns
  if (FAKE_DATA_PATTERNS.names.some((pattern) => fullName.includes(pattern))) {
    return true
  }

  // Check phone patterns
  if (FAKE_DATA_PATTERNS.phones.some((pattern) => phone.includes(pattern))) {
    return true
  }

  // Check city patterns
  if (FAKE_DATA_PATTERNS.cities.some((pattern) => city.includes(pattern))) {
    return true
  }

  return false
}

/**
 * Check if provider bio contains fake data
 */
export function isFakeBio(bio: string | null): boolean {
  if (!bio) return false
  const bioLower = bio.toLowerCase()
  return FAKE_DATA_PATTERNS.bios.some((pattern) => bioLower.includes(pattern))
}

/**
 * Find all fake users
 */
export async function findFakeUsers(): Promise<User[]> {
  const { data: users, error } = await supabase.from('users').select('*')

  if (error) {
    console.error('Error fetching users:', error)
    return []
  }

  return (users || []).filter(isFakeUser)
}

/**
 * Delete fake providers (those with fake users or fake bios)
 */
export async function deleteFakeProviders(): Promise<{ deleted: number; errors: string[] }> {
  const errors: string[] = []
  let deletedCount = 0

  try {
    // Get all providers with their user data
    const { data: providers, error: fetchError } = await supabase
      .from('service_providers')
      .select(`
        id,
        user_id,
        bio,
        user:users(*)
      `)

    if (fetchError) throw fetchError
    if (!providers) return { deleted: 0, errors: [] }

    // Identify fake providers
    const fakeProviderIds: string[] = []

    for (const provider of providers) {
      const user = provider.user as unknown as User | null
      const isFake =
        (user && isFakeUser(user)) || (provider.bio && isFakeBio(provider.bio))

      if (isFake) {
        fakeProviderIds.push(provider.id)
      }
    }

    // Delete in batches to avoid query size limits
    const batchSize = 50
    for (let i = 0; i < fakeProviderIds.length; i += batchSize) {
      const batch = fakeProviderIds.slice(i, i + batchSize)

      // Delete provider_skills associations first
      const { error: skillsError } = await supabase
        .from('provider_skills')
        .delete()
        .in('provider_id', batch)

      if (skillsError) {
        errors.push(`Error deleting provider skills: ${skillsError.message}`)
      }

      // Delete providers
      const { error: deleteError, count } = await supabase
        .from('service_providers')
        .delete()
        .in('id', batch)

      if (deleteError) {
        errors.push(`Error deleting providers: ${deleteError.message}`)
      } else if (count !== null) {
        deletedCount += count
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    errors.push(`Failed to delete fake providers: ${message}`)
  }

  return { deleted: deletedCount, errors }
}

/**
 * Delete fake users
 */
export async function deleteFakeUsers(): Promise<{ deleted: number; errors: string[] }> {
  const errors: string[] = []
  let deletedCount = 0

  try {
    const fakeUsers = await findFakeUsers()
    const fakeUserIds = fakeUsers.map((u) => u.id)

    if (fakeUserIds.length === 0) {
      return { deleted: 0, errors: [] }
    }

    // Delete in batches
    const batchSize = 50
    for (let i = 0; i < fakeUserIds.length; i += batchSize) {
      const batch = fakeUserIds.slice(i, i + batchSize)

      // First, delete associated providers
      const { error: providerError } = await supabase
        .from('service_providers')
        .delete()
        .in('user_id', batch)

      if (providerError) {
        errors.push(`Error deleting providers for users: ${providerError.message}`)
      }

      // Delete bookings
      const { error: bookingError } = await supabase
        .from('bookings')
        .delete()
        .in('customer_id', batch)

      if (bookingError) {
        errors.push(`Error deleting bookings: ${bookingError.message}`)
      }

      // Delete users
      const { error: deleteError, count } = await supabase
        .from('users')
        .delete()
        .in('id', batch)

      if (deleteError) {
        errors.push(`Error deleting users: ${deleteError.message}`)
      } else if (count !== null) {
        deletedCount += count
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    errors.push(`Failed to delete fake users: ${message}`)
  }

  return { deleted: deletedCount, errors }
}

/**
 * Complete cleanup of all fake data
 */
export async function cleanupFakeData(): Promise<{
  summary: string
  results: {
    fakeProvidersDeleted: number
    fakeUsersDeleted: number
  }
  errors: string[]
}> {
  console.log('Starting database cleanup...')
  const allErrors: string[] = []

  // Delete providers first (they reference users)
  console.log('Deleting fake providers...')
  const { deleted: providersDeleted, errors: providerErrors } =
    await deleteFakeProviders()
  allErrors.push(...providerErrors)
  console.log(`Deleted ${providersDeleted} fake providers`)

  // Then delete users
  console.log('Deleting fake users...')
  const { deleted: usersDeleted, errors: userErrors } = await deleteFakeUsers()
  allErrors.push(...userErrors)
  console.log(`Deleted ${usersDeleted} fake users`)

  const summary = `Cleanup completed: ${providersDeleted} providers and ${usersDeleted} users removed`

  return {
    summary,
    results: {
      fakeProvidersDeleted: providersDeleted,
      fakeUsersDeleted: usersDeleted,
    },
    errors: allErrors,
  }
}

/**
 * Get a report of fake data without deleting
 */
export async function getFakeDataReport(): Promise<{
  fakeUsersCount: number
  fakeProvidersCount: number
  sampleFakeUsers: Array<{ id: string; email: string; full_name: string }>
  sampleFakeProviders: Array<{ id: string; bio: string | null }>
}> {
  const fakeUsers = await findFakeUsers()

  // Get providers with fake bios
  const { data: providers } = await supabase.from('service_providers').select('id, bio')

  const fakeProviders = (providers || []).filter((p) => isFakeBio(p.bio))

  return {
    fakeUsersCount: fakeUsers.length,
    fakeProvidersCount: fakeProviders.length,
    sampleFakeUsers: fakeUsers.slice(0, 5).map((u) => ({
      id: u.id,
      email: u.email,
      full_name: u.full_name,
    })),
    sampleFakeProviders: fakeProviders.slice(0, 5),
  }
}