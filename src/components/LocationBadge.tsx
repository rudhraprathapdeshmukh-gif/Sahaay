import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LocationIcon } from './Icons'
import { getCurrentLocation, Location } from '@/lib/geolocation'

/**
 * Small location pill shown near the profile / dashboard area.
 * Detects the customer's location once on mount (cached by geolocation util)
 * and lets them tap to re-detect.
 */
const LocationBadge = () => {
  const { t } = useTranslation()
  const [location, setLocation] = useState<Location | null>(null)
  const [status, setStatus] = useState<'detecting' | 'ready' | 'error'>('detecting')

  const detect = async (forceRefresh = false) => {
    setStatus('detecting')
    try {
      console.log('LocationBadge: Starting detection...')
      const loc = await getCurrentLocation(forceRefresh)
      console.log('LocationBadge: Got location:', loc)
      if (loc && (loc.latitude || loc.longitude)) {
        setLocation(loc)
        setStatus('ready')
        console.log('LocationBadge: Location set successfully:', loc.city, loc.state)
      } else {
        console.warn('LocationBadge: Invalid location data')
        setStatus('error')
      }
    } catch (e) {
      console.warn('Location detection failed in LocationBadge:', e)
      setStatus('error')
    }
  }

  useEffect(() => {
    detect(false)
    // Refresh after a short delay to pick up any high‑accuracy upgrade
    const timer = setTimeout(() => {
      detect(true)
    }, 3000)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const city = location?.city || location?.district || location?.state

  let label: string
  if (status === 'detecting') {
    label = t('detecting_location', 'Detecting location…')
  } else if (status === 'error') {
    label = t('location_unavailable', 'Location unavailable')
  } else {
    label = [t('near', 'Near:'), city].filter(Boolean).join(' ')
  }

  return (
    <button
      onClick={() => detect(true)}
      disabled={status === 'detecting'}
      title={t('re_detect_location', 'Re-detect location')}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors hover:bg-[var(--color-bg)]"
      style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-muted)' }}
    >
      <LocationIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
      <span className="max-w-[160px] sm:max-w-[220px] truncate">{label}</span>
    </button>
  )
}

export default LocationBadge