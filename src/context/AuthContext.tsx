import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { upsertUser } from '@/lib/providers'
import type { User as DbUser } from '@/types/database'

type UserRole = 'customer' | 'provider' | 'admin' | null

interface AuthUser {
  id: string
  name: string
  email: string
  role: Exclude<UserRole, null>
}

interface AuthContextType {
  user: AuthUser | null
  signIn: (email: string, password: string) => Promise<AuthUser | null>
  signUp: (name: string, email: string, password: string, mobileNumber: string | null, role: Exclude<UserRole, null>) => Promise<AuthUser | null>
  signOut: () => Promise<void>
  isAuthenticated: boolean
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const rowToAuthUser = (u: DbUser): AuthUser => ({
  id: u.id,
  name: u.full_name,
  email: u.email,
  role: u.role,
})

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Restore session on mount + listen for auth changes
  useEffect(() => {
    let mounted = true

    const loadSession = async (sessionUserId: string) => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', sessionUserId)
        .maybeSingle()
      if (!mounted) return
      if (!error && data) {
        setUser(rowToAuthUser(data))
      } else if (error) {
        console.warn('Failed to load user profile:', error)
      }
    }

    // Initial session
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!mounted) return
        if (session?.user) {
          await loadSession(session.user.id)
        }
      } catch (err) {
        console.error('Failed to restore session:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    initSession()

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadSession(session.user.id)
      } else {
        setUser(null)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // ── Sign in with Supabase Auth ───────────────────────────────────────
  const signIn = async (email: string, password: string): Promise<AuthUser | null> => {
    const cleanEmail = email.trim()
    const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password })
    if (error) throw new Error(error.message)
    if (!data.user) return null

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle()

    if (profileError) throw new Error(profileError.message)

    // If public.users record is missing (e.g. from prior failed upsert), auto-heal it
    if (!profile) {
      const fallbackName = (data.user.user_metadata?.full_name as string) || cleanEmail.split('@')[0] || 'User'
      const fallbackRole = (data.user.user_metadata?.role as Exclude<UserRole, null>) || 'customer'
      const newProfile = await upsertUser({
        id: data.user.id,
        email: cleanEmail,
        full_name: fallbackName,
        role: fallbackRole,
      })
      const authUser = rowToAuthUser(newProfile)
      setUser(authUser)
      return authUser
    }

    const authUser = rowToAuthUser(profile)
    setUser(authUser)
    return authUser
  }

  // ── Sign up via Supabase Auth + create public.users row ──────────────
  const signUp = async (
    name: string,
    email: string,
    password: string,
    mobileNumber: string | null,
    role: Exclude<UserRole, null>
  ): Promise<AuthUser | null> => {
    const cleanEmail = email.trim()
    const cleanName = name.trim()

    // Normalize mobile: strip non-digits, force +91 prefix
    let cleanMobile: string | null = null
    if (mobileNumber) {
      const digits = mobileNumber.replace(/\D/g, '')
      if (digits.length === 10) {
        cleanMobile = '+91' + digits
      } else if (digits.length === 12 && digits.startsWith('91')) {
        cleanMobile = '+' + digits
      } else {
        cleanMobile = mobileNumber.trim()
      }
    }

    // Check if phone number already exists
    if (cleanMobile) {
      const { data: phoneCheck } = await supabase
        .from('users')
        .select('id')
        .eq('phone', cleanMobile)
        .maybeSingle()

      if (phoneCheck) {
        throw new Error('Mobile number already registered.')
      }
    }

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: { data: { full_name: cleanName, role, phone: cleanMobile } },
    })

    // If user already registered in Supabase auth, throw error rather than auto sign-in
    if (error) {
      const msg = error.message?.toLowerCase() || ''
      if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('duplicate')) {
        throw new Error('Email already registered.')
      }
      throw new Error(error.message)
    }

    // Check anti-enumeration response (identities is empty array when email already exists)
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      throw new Error('Email already registered.')
    }

    if (!data.user) return null

    // Create the public.users row linked to the auth user
    // Note: This may fail if RLS blocks insert without an authenticated session
    // (e.g. when email confirmation is required). The signIn auto-heal will
    // create the profile on first successful login.
    let profile: DbUser | null = null
    try {
      profile = await upsertUser({
        id: data.user.id,
        email: cleanEmail,
        full_name: cleanName,
        phone: cleanMobile ?? undefined,
        role,
      })
    } catch (err) {
      // Non-fatal: profile will be created during signIn auto-heal
      const errMsg = err instanceof Error ? err.message : String(err)
      console.warn('Profile creation deferred:', errMsg)
    }

    const authUser: AuthUser = {
      id: data.user.id,
      name: cleanName,
      email: cleanEmail,
      role,
    }
    setUser(authUser)
    return authUser
  }

  const signOut = async (): Promise<void> => {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, signIn, signUp, signOut, isAuthenticated: !!user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
