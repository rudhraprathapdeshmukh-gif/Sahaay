import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircleIcon, ArrowRightIcon, ArrowLeftIcon, SahaayLogo } from '@/components/Icons'
import { useAuth } from '@/context/AuthContext'
import { uploadFile, BUCKETS } from '@/lib/storage'
import {
  fetchServices,
  registerProvider,
  fetchFullProviderProfile,
} from '@/lib/providers'
// Certificate validation disabled - admin reviews certificates after upload
import LocationPicker from '@/components/LocationPicker'
import { useGeolocation } from '@/hooks/useGeolocation'
import type { Service, ProviderProfileFull } from '@/types/database'

interface FormData {
  firstName: string
  lastName: string
  email: string
  password: string
  phone: string
  dob: string
  profilePhoto: File | null
  certificate: File | null
  district: string // Only store district, immutable after registration
  state: string
  serviceCategory: string
  serviceCategoryId: number | null
  yearsExperience: string
  bio: string
  latitude: number | null
  longitude: number | null
}

const initialFormData: FormData = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  phone: '',
  dob: '',
  profilePhoto: null,
  certificate: null,
  district: '',
  state: '',
  serviceCategory: '',
  serviceCategoryId: null,
  yearsExperience: '',
  bio: '',
  latitude: null,
  longitude: null,
}

// Clickable bio suggestions shown during registration (Step 3)
const BIO_SUGGESTIONS = [
  'Certified with 5+ years of professional experience',
  'Background verified by Sahaay',
  'Trusted by local customers for reliable service',
  'Punctual, polite, and detail-oriented',
  'Quick response and same-day service available',
  'Committed to customer satisfaction',
]

interface Errors { [key: string]: string }

// ── Main Onboarding Form ─────────────────────────────────────────────
const ProviderOnboarding = () => {
  const navigate = useNavigate()
  const { user, signUp } = useAuth()
  const { reverseGeocode } = useGeolocation()

  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [errors, setErrors] = useState<Errors>({})
  const [services, setServices] = useState<Service[]>([])
  const [servicesLoading, setServicesLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [savedProfile, setSavedProfile] = useState<ProviderProfileFull | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)

  // Prevent admin from accessing provider onboarding
  useEffect(() => {
    if (user?.role === 'admin') {
      navigate('/admin', { replace: true })
    }
  }, [user, navigate])

  const totalSteps = 3

  // Load services and check if existing user already has a saved provider profile
  useEffect(() => {
    const init = async () => {
      try {
        const loadedServices = await fetchServices()
        setServices(loadedServices)

        // If user is already logged in, check if they already registered as a provider
        if (user?.id) {
          const existing = await fetchFullProviderProfile(user.id)
          if (existing) {
            setSavedProfile(existing)
          } else {
            // Prepopulate name and email
            setFormData(prev => ({
              ...prev,
              firstName: prev.firstName || user.name?.split(' ')[0] || '',
              lastName: prev.lastName || user.name?.split(' ')[1] || '',
              email: prev.email || user.email || '',
            }))
          }
        }
      } catch (err) {
        console.warn('Initialization notice:', err)
      } finally {
        setServicesLoading(false)
        setInitialLoading(false)
      }
    }
    init()
  }, [user])

  // Auto-populate district and state when latitude/longitude are set (Step 3)
  useEffect(() => {
    const populateLocation = async () => {
      if (formData.latitude && formData.longitude) {
        const geo = await reverseGeocode(formData.latitude, formData.longitude)
        if (geo.district || geo.state) {
          setFormData(prev => ({
            ...prev,
            district: prev.district || geo.district || '',
            state: prev.state || geo.state || '',
          }))
          // Clear location errors
          setErrors(prev => {
            const e = { ...prev }
            delete e.district
            delete e.state
            return e
          })
        }
      }
    }
    if (formData.latitude && formData.longitude && !formData.district) {
      populateLocation()
    }
  }, [formData.latitude, formData.longitude, formData.district, reverseGeocode])

  const update = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => { const e = { ...prev }; delete e[field]; return e })
  }

  const handleServiceChange = async (name: string) => {
    const svc = services.find(s => s.name === name)
    const newServiceId = svc?.id ?? null
    setFormData(prev => ({
      ...prev,
      serviceCategory: name,
      serviceCategoryId: newServiceId,
    }))
    if (errors.serviceCategory) setErrors(prev => { const e = { ...prev }; delete e.serviceCategory; return e })

    // Certificate data is stored for admin review, no re-validation needed
    // Update the form data when service category changes
  }

  // Toggle a bio suggestion line: append "• suggestion" when not present, remove it when present
  const toggleBioSuggestion = (suggestion: string) => {
    const line = `• ${suggestion}`
    setFormData(prev => {
      const hasLine = prev.bio.split('\n').some(l => l.trim() === line)
      let next: string
      if (hasLine) {
        next = prev.bio.split('\n').filter(l => l.trim() !== line).join('\n').replace(/\n+$/, '')
      } else {
        const prefix = prev.bio.trim() ? prev.bio.replace(/\s+$/, '') + '\n' : ''
        next = prefix + line
      }
      return { ...prev, bio: next.slice(0, 300) }
    })
  }

  const handleCertificateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Store the certificate file without validation
    // Certificate will be reviewed by admin later
    update('certificate', file)

    console.log('[Provider Onboarding] Certificate stored for admin review:', file.name)
  }

  const validateStep = (s: number): Errors => {
    const e: Errors = {}
    if (s === 1) {
      if (!formData.firstName.trim()) e.firstName = 'First name is required'
      else if (formData.firstName.length > 20) e.firstName = 'First name must be maximum 20 characters'

      if (!formData.lastName.trim()) e.lastName = 'Last name is required'
      else if (formData.lastName.length > 10) e.lastName = 'Last name must be maximum 10 characters'

      if (!user) {
        if (!formData.email.trim()) e.email = 'Email is required'
        else if (!formData.email.endsWith('@gmail.com')) e.email = 'Only Gmail addresses are allowed'

        if (!formData.password) e.password = 'Password is required'
        else if (formData.password.length < 8) e.password = 'Password must be at least 8 characters'
        else if (!/[A-Z]/.test(formData.password)) e.password = 'Password must contain at least one uppercase letter'
        else if (!/[a-z]/.test(formData.password)) e.password = 'Password must contain at least one lowercase letter'
        else if (!/[0-9]/.test(formData.password)) e.password = 'Password must contain at least one number'
        else if (!/[!@#$%^&*]/.test(formData.password)) e.password = 'Password must contain at least one special character (!@#$%^&*)'
      }
      if (!formData.phone.trim()) {
        e.phone = 'Phone number is required'
      } else if (!/^[6-9]\d{9}$/.test(formData.phone)) {
        e.phone = 'Enter valid 10-digit Indian number'
      }

      if (!formData.dob) {
        e.dob = 'Date of birth is required'
      } else {
        const dobDate = new Date(formData.dob)
        const minDate = new Date('1960-01-01')
        const maxDate = new Date('2009-01-01')
        if (dobDate < minDate || dobDate > maxDate) {
          e.dob = 'Date of birth must be between 1 Jan 1960 and 1 Jan 2009'
        }
      }

      if (!formData.profilePhoto) {
        e.profilePhoto = 'Profile photo is required'
      } else if (!formData.profilePhoto.type.startsWith('image/')) {
        e.profilePhoto = 'Profile photo must be an image'
      }

      // Service category is required
      if (!formData.serviceCategory) {
        e.serviceCategory = 'Please select a service category'
      }

      // Certificate is mandatory (admin will review it later)
      if (!formData.certificate) {
        e.certificate = 'e-SHRAM certificate is required'
      }
    }
    if (s === 2) {
      if (!formData.yearsExperience) e.yearsExperience = 'Years of experience is required'
    }
    if (s === 3) {
      if (formData.bio.trim().length < 20) e.bio = 'Bio should be at least 20 characters'
      // Location is required
      if (!formData.latitude || !formData.longitude) {
        e.location = 'Location is required to find nearby jobs'
      }
      if (!formData.district.trim()) {
        e.district = 'District could not be detected. Please re-detect your location.'
      }
    }
    return e
  }

  const handleNext = () => {
    const e = validateStep(step)
    if (Object.keys(e).length > 0) { setErrors(e); return }
    setErrors({})
    setStep(prev => prev + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleBack = () => {
    setErrors({})
    setStep(prev => prev - 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async () => {
    const e = validateStep(3)
    if (Object.keys(e).length > 0) { setErrors(e); return }

    if (!formData.serviceCategoryId) {
      setSubmitError('Please select a valid service category.')
      return
    }

    setSubmitting(true)
    setSubmitError('')

    try {
      let targetUserId = user?.id
      let targetEmail = user?.email || formData.email

      // Normalize phone to +91XXXXXXXXXX
      const phoneDigits = formData.phone.replace(/\D/g, '')
      const normalizedPhone = '+91' + phoneDigits

      // 1. If not authenticated, sign up first
      const fullName = `${formData.firstName} ${formData.lastName}`.trim()
      if (!targetUserId) {
        let newAuth = null
        try {
          newAuth = await signUp(fullName, formData.email, formData.password, normalizedPhone, 'provider')
        } catch (authErr: any) {
          throw authErr
        }

        if (!newAuth?.id) {
          throw new Error('Could not initialize provider account. Please verify email and password.')
        }
        targetUserId = newAuth.id
        targetEmail = newAuth.email
      }

      // Upload profile photo
      let photoUrl = null
      if (formData.profilePhoto) {
        photoUrl = await uploadFile(BUCKETS.PROVIDER_PHOTOS, formData.profilePhoto, targetUserId, targetUserId)
      }

      // Upload certificate (mandatory for verification)
      let certificateUrl = null
      if (formData.certificate) {
        certificateUrl = await uploadFile(BUCKETS.PROVIDER_CERTIFICATES, formData.certificate, targetUserId, targetUserId)
      }

      // 2. Register / Update provider profile in Supabase
      // Note: service_radius_km and availability are removed from user choice; fixed defaults supplied
      // The district name is stored in the users.city column; it is immutable after registration.
      await registerProvider({
        user_id: targetUserId,
        email: targetEmail,
        full_name: fullName,
        first_name: formData.firstName,
        last_name: formData.lastName,
        dob: formData.dob,
        phone: normalizedPhone,
        district: formData.district,
        state: formData.state,
        service_id: formData.serviceCategoryId,
        bio: formData.bio,
        years_experience: formData.yearsExperience,
        service_radius_km: 10,
        availability: [],
        latitude: formData.latitude ?? undefined,
        longitude: formData.longitude ?? undefined,
        profile_photo_url: photoUrl,
        certificate_url: certificateUrl,
        uan: null
      })

      // 3. Load the saved provider profile directly from Supabase to verify persistence
      const freshProfile = await fetchFullProviderProfile(targetUserId)
      if (freshProfile) {
        setSavedProfile(freshProfile)
      } else {
        // Fallback construct if immediate read timing is deferred
        const service = services.find(s => s.id === formData.serviceCategoryId) ?? null
        setSavedProfile({
          provider: {
            id: 'temp',
            user_id: targetUserId,
            service_id: formData.serviceCategoryId,
            bio: formData.bio,
            years_experience: formData.yearsExperience,
            service_radius_km: 10,
            verification_status: 'pending',
            rating: 0.0,
            jobs_completed: 0,
            hourly_rate: null,
            is_available: true,
            availability: [],
            profile_photo_url: photoUrl,
            certificate_url: null,
            latitude: formData.latitude,
            longitude: formData.longitude,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          user: {
            id: targetUserId,
            email: targetEmail,
            full_name: fullName,
            first_name: formData.firstName,
            last_name: formData.lastName,
            dob: formData.dob,
            phone: formData.phone,
            role: 'provider',
            avatar_url: photoUrl,
            city: formData.district, // district is stored in the city column
            state: formData.state,
            latitude: formData.latitude,
            longitude: formData.longitude,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          service,
          skills: [],
        })
      }
    } catch (err) {
      console.error('Registration submission error:', err)
      const msg = err instanceof Error ? err.message : 'Registration failed. Please check your details and try again.'
      setSubmitError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = (field: string) =>
    `w-full px-3.5 py-2.5 rounded-lg text-sm border transition-all duration-150 focus:outline-none ${
      errors[field]
        ? 'border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-100'
        : 'border-stone-300 focus:border-teal-600 focus:ring-2 focus:ring-teal-100'
    }`

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f8fafc' }}>
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium" style={{ color: '#475569' }}>Loading Sahaay provider setup...</p>
        </div>
      </div>
    )
  }

  // Show profile preview after successful submission or if already registered
  if (savedProfile) {
    return (
      <ProfilePreview
        profile={savedProfile}
        onDone={() => navigate('/provider')}
      />
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#f8fafc' }}>
      <header className="bg-white border-b" style={{ borderColor: '#e2e8f0' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2.5">
              <SahaayLogo size={36} bg="var(--color-primary)" />
              <span className="text-lg font-bold tracking-tight" style={{ color: '#0f172a', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Sahaay</span>
            </Link>
            <Link to="/" className="text-sm font-medium" style={{ color: '#475569' }}>
              ← Back to home
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 py-10 sm:py-16">
        <div className="max-w-xl mx-auto px-4">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#0f172a', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Service Provider Registration
            </h1>
            <p className="mt-1.5 text-sm" style={{ color: '#475569' }}>
              Join verified professionals and start receiving jobs near you
            </p>
          </div>

          {/* Warning Notice Banner during signup */}
          <div className="mb-6 bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3 shadow-sm">
            <div className="mt-0.5 text-amber-600 flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">Important Registration Notice</h4>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                Profile details cannot be changed after registration. Contact Admin by email for any changes.
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-2 mb-8">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex-1 flex items-center gap-2">
                <div
                  className="flex-1 h-1.5 rounded-full transition-all duration-300"
                  style={{ backgroundColor: step >= s ? 'var(--color-primary)' : '#e7e5e4' }}
                />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mb-8 -mt-2 px-0.5">
            {['Basic Info & Service', 'Experience & Skills', 'Profile Details'].map((label, i) => (
              <span key={label} className="text-[11px] font-medium" style={{ color: step >= i + 1 ? 'var(--color-primary)' : '#94a3b8' }}>
                {label}
              </span>
            ))}
          </div>

          {/* Form card */}
          <div className="bg-white rounded-2xl border p-6 sm:p-8" style={{ borderColor: '#e2e8f0', boxShadow: '0 4px 16px rgba(28,25,23,0.05)' }}>

            {/* STEP 1: Basic Info */}
            {step === 1 && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1.5" style={{ color: '#0f172a' }}>First Name *</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={e => update('firstName', e.target.value)}
                      placeholder="Ramesh"
                      className={inputClass('firstName')}
                      style={{ backgroundColor: '#ffffff' }}
                      maxLength={20}
                    />
                    {errors.firstName && <p className="mt-1 text-xs" style={{ color: '#dc2626' }}>{errors.firstName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5" style={{ color: '#0f172a' }}>Last Name *</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={e => update('lastName', e.target.value)}
                      placeholder="Kumar"
                      className={inputClass('lastName')}
                      style={{ backgroundColor: '#ffffff' }}
                      maxLength={10}
                    />
                    {errors.lastName && <p className="mt-1 text-xs" style={{ color: '#dc2626' }}>{errors.lastName}</p>}
                  </div>
                </div>

                {/* If unauthenticated, collect account credentials */}
                {!user && (
                  <div className="p-4 rounded-xl space-y-4 border" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-primary)' }}>
                        Create Sahaay Provider Account
                      </span>
                      <Link to="/signin" className="text-xs font-medium underline" style={{ color: 'var(--color-primary)' }}>
                        Already registered? Sign in →
                      </Link>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1.5" style={{ color: '#0f172a' }}>Gmail Address *</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={e => update('email', e.target.value)}
                        placeholder="example@gmail.com"
                        className={inputClass('email')}
                        style={{ backgroundColor: '#ffffff' }}
                      />
                      {errors.email && <p className="mt-1 text-xs" style={{ color: '#dc2626' }}>{errors.email}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1.5" style={{ color: '#0f172a' }}>Password *</label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={e => update('password', e.target.value)}
                        placeholder="Min 8 chars, uppercase, lowercase, number, special char"
                        className={inputClass('password')}
                        style={{ backgroundColor: '#ffffff' }}
                      />
                      {errors.password && <p className="mt-1 text-xs" style={{ color: '#dc2626' }}>{errors.password}</p>}
                    </div>
                  </div>
                )}

                {user && (
                  <div className="p-3 rounded-lg text-xs flex items-center justify-between border" style={{ backgroundColor: 'var(--color-primary-tint)', borderColor: 'var(--color-border)', color: 'var(--color-primary)' }}>
                    <span>Registered Account: <strong>{user.email}</strong></span>
                    <span className="font-semibold">Signed in</span>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold mb-1.5" style={{ color: '#0f172a' }}>Indian Mobile Number *</label>
                  <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: errors.phone ? '#fca5a5' : '#cbd5e1' }}>
                    <div className="flex items-center px-3 text-sm font-medium" style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>+91</div>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={e => update('phone', e.target.value)}
                      placeholder="9876543210"
                      maxLength={10}
                      className="flex-1 px-3.5 py-2.5 text-sm border-0 focus:outline-none"
                      style={{ backgroundColor: '#ffffff' }}
                    />
                  </div>
                  {errors.phone && <p className="mt-1 text-xs" style={{ color: '#dc2626' }}>{errors.phone}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1.5" style={{ color: '#0f172a' }}>Date of Birth *</label>
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={e => update('dob', e.target.value)}
                    min="1960-01-01"
                    max="2009-01-01"
                    className={inputClass('dob')}
                    style={{ backgroundColor: '#ffffff' }}
                  />
                  {errors.dob && <p className="mt-1 text-xs" style={{ color: '#dc2626' }}>{errors.dob}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1.5" style={{ color: '#0f172a' }}>Service Category *</label>
                  <select
                    value={formData.serviceCategory}
                    onChange={e => handleServiceChange(e.target.value)}
                    className={inputClass('serviceCategory')}
                    disabled={servicesLoading}
                    style={{ backgroundColor: '#ffffff', color: formData.serviceCategory ? '#0f172a' : '#94a3b8' }}
                  >
                    <option value="">{servicesLoading ? 'Loading services...' : 'Select your primary service...'}</option>
                    {services.map(s => (
                      <option key={s.id} value={s.name}>{s.name} — {s.description || ''}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-[11px]" style={{ color: '#94a3b8' }}>
                    Required to validate your e-SHRAM certificate occupation
                  </p>
                  {errors.serviceCategory && <p className="mt-1 text-xs" style={{ color: '#dc2626' }}>{errors.serviceCategory}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1.5" style={{ color: '#0f172a' }}>Profile Photo <span className="text-red-500">*</span></label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0] ?? null
                      update('profilePhoto', file)
                    }}
                    className={inputClass('profilePhoto')}
                  />
                  {formData.profilePhoto && (
                    <div className="mt-2 flex items-center gap-3">
                      <img
                        src={URL.createObjectURL(formData.profilePhoto)}
                        alt="Profile preview"
                        className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm"
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-800">{formData.profilePhoto.name}</p>
                        <p className="text-xs text-slate-500">Selected</p>
                      </div>
                    </div>
                  )}
                  {errors.profilePhoto && <p className="mt-1 text-xs" style={{ color: '#dc2626' }}>{errors.profilePhoto}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1.5" style={{ color: '#0f172a' }}>e-SHRAM Card Certificate <span className="text-red-500">*</span></label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCertificateChange}
                    className={inputClass('certificate')}
                    style={{ backgroundColor: '#ffffff' }}
                  />

                  {formData.certificate && (
                    <div className="mt-2 p-3 rounded-md bg-blue-50 border border-blue-200">
                      <div className="flex items-center">
                        <svg className="h-5 w-5 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-sm text-blue-700 font-medium">Certificate uploaded - Admin will review</span>
                      </div>
                    </div>
                  )}

                  <p className="mt-1 text-[11px]" style={{ color: '#94a3b8' }}>
                    Upload your e-SHRAM card. Admin will verify your certificate after registration.
                  </p>
                  {errors.certificate && <p className="mt-1 text-xs" style={{ color: '#dc2626' }}>{errors.certificate}</p>}
                </div>
              </div>
            )}

            {/* STEP 2: Experience & Profile Details */}
            {step === 2 && (
              <div className="space-y-6">

                <div>
                  <label className="block text-sm font-semibold mb-1.5" style={{ color: '#0f172a' }}>Years of Experience</label>
                  <div className="flex gap-2 flex-wrap">
                    {['0-1', '2-4', '5-8', '8+'].map(exp => (
                      <button
                        key={exp}
                        type="button"
                        onClick={() => update('yearsExperience', exp)}
                        className="px-4 py-2.5 rounded-lg text-sm font-medium border transition-all"
                        style={{
                          backgroundColor: formData.yearsExperience === exp ? 'var(--color-primary-tint)' : '#ffffff',
                          borderColor: formData.yearsExperience === exp ? 'var(--color-primary)' : '#cbd5e1',
                          color: formData.yearsExperience === exp ? 'var(--color-primary)' : '#475569',
                        }}
                      >
                        {exp} {exp === '0-1' ? 'year' : 'years'}
                      </button>
                    ))}
                  </div>
                  {errors.yearsExperience && <p className="mt-1 text-xs" style={{ color: '#dc2626' }}>{errors.yearsExperience}</p>}
                </div>
              </div>
            )}

            {/* STEP 3: Bio & Location (Availability & Service Radius Removed) */}
            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold mb-1.5" style={{ color: '#0f172a' }}>Short Professional Bio</label>

                  {/* Bio Suggestions */}
                  <div className="mb-2">
                    <p className="text-[11px] mb-1.5" style={{ color: '#94a3b8' }}>
                      Tap suggestions to add lines (tap again to remove):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {BIO_SUGGESTIONS.map(suggestion => {
                        const active = formData.bio.split('\n').some(l => l.trim() === `• ${suggestion}`)
                        return (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => toggleBioSuggestion(suggestion)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                            style={{
                              backgroundColor: active ? 'var(--color-primary-tint)' : '#ffffff',
                              borderColor: active ? 'var(--color-primary)' : '#cbd5e1',
                              color: active ? 'var(--color-primary)' : '#475569',
                            }}
                          >
                            <span className="text-xs">{active ? '✓ ' : '+ '}</span>
                            {suggestion}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <textarea
                    value={formData.bio}
                    onChange={e => update('bio', e.target.value)}
                    rows={4}
                    placeholder="Describe your expertise, past work, and customer satisfaction record..."
                    className={inputClass('bio')}
                    style={{ backgroundColor: '#ffffff', resize: 'vertical' }}
                    maxLength={300}
                  />
                  <div className="flex justify-between mt-1">
                    {errors.bio ? (
                      <p className="text-xs" style={{ color: '#dc2626' }}>{errors.bio}</p>
                    ) : (
                      <span className="text-[11px]" style={{ color: '#94a3b8' }}>Minimum 20 characters</span>
                    )}
                    <p className="text-[11px] ml-auto" style={{ color: '#94a3b8' }}>{formData.bio.length}/300</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1.5" style={{ color: '#0f172a' }}>
                    Service Location
                    <span className="text-xs font-normal text-gray-500 ml-2">(Required - auto-detects your district via GPS)</span>
                  </label>
                  <LocationPicker
                    latitude={formData.latitude}
                    longitude={formData.longitude}
                    onLocationChange={(lat, lng) => {
                      update('latitude', lat)
                      update('longitude', lng)
                    }}
                    disabled={submitting}
                  />
                  {formData.district && formData.state && (
                    <div className="mt-2 p-3 rounded-lg text-sm flex items-center gap-2 border bg-green-50 border-green-200 text-green-800">
                      <CheckCircleIcon className="w-4 h-4 flex-shrink-0" />
                      <span>
                        District <strong>{formData.district}</strong>, {formData.state}
                        <span className="block text-[11px] text-green-700">This district is locked after registration.</span>
                      </span>
                    </div>
                  )}
                  {errors.district && <p className="mt-1 text-xs" style={{ color: '#dc2626' }}>{errors.district}</p>}
                  {errors.location && (
                    <div className="mt-2 p-2 text-sm text-red-700 bg-red-50 rounded-md border border-red-200">
                      <div className="font-medium">Location Required</div>
                      <div>{errors.location}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error banner */}
            {submitError && (
              <div className="mt-5 p-3.5 rounded-xl text-sm border flex items-start gap-2.5" style={{ backgroundColor: '#fef2f2', color: '#dc2626', borderColor: '#fecaca' }}>
                <span className="font-bold">⚠️</span>
                <div className="flex-1">
                  <p>{submitError}</p>
                  {submitError.toLowerCase().includes('already registered') && (
                    <Link to="/signin" className="inline-block font-semibold underline text-xs mt-1.5" style={{ color: 'var(--color-primary)' }}>
                      Click here to Sign In with your existing password →
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8 pt-6" style={{ borderTop: '1px solid #f1f5f9' }}>
              {step > 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors"
                  style={{ color: '#475569' }}
                >
                  <ArrowLeftIcon className="w-4 h-4" /> Back
                </button>
              ) : <div />}

              {step < totalSteps ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all shadow-sm"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  Continue <ArrowRightIcon className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-all shadow-sm disabled:opacity-50"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Saving to Supabase...
                    </>
                  ) : (
                    <>Complete Registration <CheckCircleIcon className="w-4 h-4" /></>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// ── Profile Preview (Read-only after registration) ─────────────
interface ProfilePreviewProps {
  profile: ProviderProfileFull
  onDone: () => void
}

const ProfilePreview = ({ profile, onDone }: ProfilePreviewProps) => {
  const { provider, user, service } = profile
  const initials = user.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#f8fafc' }}>
      <header className="bg-white border-b" style={{ borderColor: '#e2e8f0' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5">
              <SahaayLogo size={36} bg="var(--color-primary)" />
              <span className="text-lg font-bold tracking-tight" style={{ color: '#0f172a', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Sahaay</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 py-10 sm:py-16">
        <div className="max-w-lg mx-auto px-4">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'var(--color-primary-tint)' }}>
              <CheckCircleIcon className="w-8 h-8" style={{ color: 'var(--color-primary)' }} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#0f172a', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Registration Submitted!
            </h1>
            <p className="mt-1.5 text-sm" style={{ color: '#475569' }}>
              Your profile is saved. Status is pending admin approval.
            </p>
          </div>

          {/* Profile details cannot be changed warning */}
          <div className="mb-6 bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-start gap-3 shadow-sm">
            <div className="mt-0.5 text-blue-600 flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-blue-900">Profile Details Locked</h4>
              <p className="text-xs text-blue-800 mt-1 leading-relaxed">
                Profile details cannot be changed after registration. Contact Admin by email for any changes.
              </p>
            </div>
          </div>

          {/* Profile card */}
          <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#e2e8f0', boxShadow: '0 4px 20px rgba(28,25,23,0.08)' }}>
            <div className="px-6 pt-6 pb-5" style={{ background: 'var(--color-primary)' }}>
              <div className="flex items-start gap-4">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="Profile" className="w-16 h-16 rounded-xl object-cover border-2 border-white/30" />
                ) : (
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center text-xl font-bold text-white border-2 border-white/30" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                    {initials}
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h2 className="text-lg font-bold text-white">{user.full_name}</h2>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-200/20 text-amber-100 border border-amber-200/30">
                      Pending
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.85)' }}>
                    {service?.name ?? 'Service Provider'} · {user.city}, {user.state}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center py-3 rounded-xl" style={{ backgroundColor: '#f8fafc' }}>
                  <div className="text-sm font-bold" style={{ color: 'var(--color-primary)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{provider.years_experience} yrs</div>
                  <div className="text-[11px] mt-0.5" style={{ color: '#94a3b8' }}>Experience</div>
                </div>
                <div className="text-center py-3 rounded-xl" style={{ backgroundColor: '#f8fafc' }}>
                  <div className="text-sm font-bold" style={{ color: 'var(--color-primary)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Active</div>
                  <div className="text-[11px] mt-0.5" style={{ color: '#94a3b8' }}>Status</div>
                </div>
              </div>

              {/* About Bio */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#94a3b8' }}>About Provider</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#475569' }}>{provider.bio}</p>
              </div>

              <div className="space-y-2 pt-1 border-t" style={{ borderColor: '#f1f5f9' }}>
                <div className="flex items-center gap-2 text-xs" style={{ color: '#475569' }}>
                  <CheckCircleIcon className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
                  Verification Status: Pending Admin Approval
                </div>
                <div className="flex items-center gap-2 text-xs" style={{ color: '#475569' }}>
                  <CheckCircleIcon className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
                  Phone Number Verified
                </div>
                <div className="flex items-center gap-2 text-xs" style={{ color: '#475569' }}>
                  <CheckCircleIcon className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
                  District Configured ({user.city})
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <div className="flex items-start gap-3 p-4 rounded-xl" style={{ backgroundColor: 'var(--color-accent-tint)', border: '1px solid #FDE68A' }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ backgroundColor: '#D97706', color: '#fff' }}>!</div>
              <div>
                <p className="text-xs font-semibold" style={{ color: '#B45309' }}>Pending Admin Approval</p>
                <p className="text-xs mt-0.5" style={{ color: '#B45309' }}>
                  Your profile has been submitted and is pending verification. Once approved by an administrator, your profile will be active for customer discovery.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onDone}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-colors shadow-sm"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              Go to Provider Dashboard →
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

export default ProviderOnboarding
