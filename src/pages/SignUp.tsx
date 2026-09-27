import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import AuthLayout from '@/components/AuthLayout'
import { useAuth } from '@/context/AuthContext'

const SignUp = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { signUp } = useAuth()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mobileNumber, setMobileNumber] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Validation functions inside component or using translated strings
  const validateFirstName = (firstName: string): string | null => {
    if (!firstName.trim()) return t('first_name_required', 'First name is required')
    if (firstName.trim().length > 20) return t('first_name_max', 'First name must be 20 characters or less')
    if (!/^[a-zA-Z\s'-]+$/.test(firstName.trim())) return t('first_name_chars', "First name can only contain letters, spaces, hyphens, and apostrophes")
    return null
  }

  const validateLastName = (lastName: string): string | null => {
    if (!lastName.trim()) return t('last_name_required', 'Last name is required')
    if (lastName.trim().length > 10) return t('last_name_max', 'Last name must be 10 characters or less')
    if (!/^[a-zA-Z\s'-]+$/.test(lastName.trim())) return t('last_name_chars', "Last name can only contain letters, spaces, hyphens, and apostrophes")
    return null
  }

  const validateEmail = (email: string): string | null => {
    if (!email.trim()) return t('email_required', 'Email is required')
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!emailRegex.test(email.trim())) return t('valid_email_prompt', 'Please enter a valid email address')
    return null
  }

  const validatePassword = (password: string): string | null => {
    if (!password) return t('password_required', 'Password is required')
    if (password.length < 8) return t('password_min', 'Password must be at least 8 characters')
    if (!/[A-Z]/.test(password)) return t('password_uppercase', 'Password must contain at least one uppercase letter')
    if (!/[a-z]/.test(password)) return t('password_lowercase', 'Password must contain at least one lowercase letter')
    if (!/[0-9]/.test(password)) return t('password_number', 'Password must contain at least one number')
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return t('password_special', 'Password must contain at least one special character')
    return null
  }

  const validateMobileNumber = (mobile: string): string | null => {
    if (!mobile.trim()) return t('mobile_required', 'Mobile number is required')
    const indianMobileRegex = /^\+91[ ]?[6-9]\d{9}$/
    if (!indianMobileRegex.test(mobile.trim())) {
      return t('mobile_invalid', 'Please enter a valid Indian mobile number (+91 followed by 10 digits starting with 6-9)')
    }
    return null
  }

  const formatMobileDisplay = (value: string): string => {
    let digits = value.replace(/\D/g, '')
    if (digits.startsWith('91')) {
      digits = digits.slice(2)
    }
    digits = digits.slice(0, 10)
    if (digits.length > 0) {
      return '+91 ' + digits
    }
    return '+91 '
  }

  interface FieldErrors {
    firstName: string | null
    lastName: string | null
    email: string | null
    password: string | null
    mobileNumber: string | null
  }

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({
    firstName: null,
    lastName: null,
    email: null,
    password: null,
    mobileNumber: null,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const validateField = (name: keyof FieldErrors, value: string): string | null => {
    switch (name) {
      case 'firstName':
        return validateFirstName(value)
      case 'lastName':
        return validateLastName(value)
      case 'email':
        return validateEmail(value)
      case 'password':
        return validatePassword(value)
      case 'mobileNumber':
        return validateMobileNumber(value)
      default:
        return null
    }
  }

  const handleBlur = (name: keyof FieldErrors, value: string) => {
    const errorMessage = validateField(name, value)
    setFieldErrors(prev => ({ ...prev, [name]: errorMessage }))
  }

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatMobileDisplay(e.target.value)
    setMobileNumber(formatted)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const errors: FieldErrors = {
      firstName: validateFirstName(firstName),
      lastName: validateLastName(lastName),
      email: validateEmail(email),
      password: validatePassword(password),
      mobileNumber: validateMobileNumber(mobileNumber),
    }

    setFieldErrors(errors)

    if (Object.values(errors).some(error => error !== null)) {
      return
    }

    setError('')
    setLoading(true)

    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim()
      const newUser = await signUp(fullName, email, password, mobileNumber.trim(), 'customer')
      if (newUser) {
        navigate('/')
      } else {
        setError(t('account_created_sign_in', 'Account created but profile not found. Please sign in.'))
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('signup_failed', 'Sign up failed. Please try again.')
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title={t('create_your_account', 'Create your account')} subtitle={t('join_sahaay_subtitle', 'Join Sahaay to find and book local services')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* First Name */}
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium mb-1.5" style={{ color: '#0f172a' }}>
            {t('first_name', 'First name')}
          </label>
          <input
            id="firstName"
            type="text"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            onBlur={() => handleBlur('firstName', firstName)}
            className="input-field"
            placeholder="John"
            maxLength={23}
          />
          {fieldErrors.firstName && (
            <p className="mt-1 text-xs flex items-center gap-1" style={{ color: '#dc2626' }}>
              <span>⚠</span>
              {fieldErrors.firstName}
            </p>
          )}
        </div>

        {/* Last Name */}
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium mb-1.5" style={{ color: '#0f172a' }}>
            {t('last_name', 'Last name')}
          </label>
          <input
            id="lastName"
            type="text"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            onBlur={() => handleBlur('lastName', lastName)}
            className="input-field"
            placeholder="Doe"
            maxLength={13}
          />
          {fieldErrors.lastName && (
            <p className="mt-1 text-xs flex items-center gap-1" style={{ color: '#dc2626' }}>
              <span>⚠</span>
              {fieldErrors.lastName}
            </p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1.5" style={{ color: '#0f172a' }}>
            {t('email', 'Email')}
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onBlur={() => handleBlur('email', email)}
            className="input-field"
            placeholder={t('email_placeholder', 'you@example.com')}
          />
          {fieldErrors.email && (
            <p className="mt-1 text-xs flex items-center gap-1" style={{ color: '#dc2626' }}>
              <span>⚠</span>
              {fieldErrors.email}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="relative">
          <label htmlFor="password" className="block text-sm font-medium mb-1.5" style={{ color: '#0f172a' }}>
            {t('password', 'Password')}
          </label>
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            onBlur={() => handleBlur('password', password)}
            className="input-field pr-10"
            placeholder={t('password_placeholder', 'At least 8 characters')}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-9 text-gray-500 hover:text-gray-700 transition-colors"
            tabIndex={-1}
          >
            {showPassword ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
          {fieldErrors.password && (
            <p className="mt-1 text-xs flex items-center gap-1" style={{ color: '#dc2626' }}>
              <span>⚠</span>
              {fieldErrors.password}
            </p>
          )}
          {/* Password requirements hint */}
          {!fieldErrors.password && password && (
            <div className="mt-1 space-y-0.5">
              <p className={`text-xs ${password.length >= 8 ? 'text-green-600' : 'text-gray-400'}`}>• {t('password_min', 'At least 8 characters')}</p>
              <p className={`text-xs ${/[A-Z]/.test(password) ? 'text-green-600' : 'text-gray-400'}`}>• {t('password_uppercase', 'One uppercase letter')}</p>
              <p className={`text-xs ${/[a-z]/.test(password) ? 'text-green-600' : 'text-gray-400'}`}>• {t('password_lowercase', 'One lowercase letter')}</p>
              <p className={`text-xs ${/[0-9]/.test(password) ? 'text-green-600' : 'text-gray-400'}`}>• {t('password_number', 'One number')}</p>
              <p className={`text-xs ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? 'text-green-600' : 'text-gray-400'}`}>• {t('password_special', 'One special character')}</p>
            </div>
          )}
        </div>

        {/* Mobile Number */}
        <div>
          <label htmlFor="mobileNumber" className="block text-sm font-medium mb-1.5" style={{ color: '#0f172a' }}>
            {t('mobile_number', 'Mobile number')}
          </label>
          <input
            id="mobileNumber"
            type="tel"
            value={mobileNumber}
            onChange={handleMobileChange}
            onBlur={() => handleBlur('mobileNumber', mobileNumber)}
            className="input-field"
            placeholder="+91 9876543210"
          />
          {fieldErrors.mobileNumber && (
            <p className="mt-1 text-xs flex items-center gap-1" style={{ color: '#dc2626' }}>
              <span>⚠</span>
              {fieldErrors.mobileNumber}
            </p>
          )}
        </div>

        {/* General Error */}
        {error && (
          <div className="p-3 rounded-lg text-sm flex flex-col gap-1 border" style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca', color: '#dc2626' }}>
            <span>{error}</span>
            {error.toLowerCase().includes('already') && (
              <Link to="/signin" className="font-semibold underline mt-0.5 text-xs" style={{ color: 'var(--color-primary)' }}>
                {t('click_here_to_signin', 'Click here to Sign In with your existing password →')}
              </Link>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full disabled:opacity-50"
        >
          {loading ? t('creating_account', 'Creating account...') : t('create_account', 'Create account')}
        </button>
      </form>

      <div className="mt-6 text-center text-sm" style={{ color: '#475569' }}>
        {t('already_have_account', 'Already have an account?')}{' '}
        <Link to="/signin" className="font-medium" style={{ color: 'var(--color-primary)' }}>
          {t('sign_in', 'Sign in')}
        </Link>
      </div>
    </AuthLayout>
  )
}

export default SignUp

