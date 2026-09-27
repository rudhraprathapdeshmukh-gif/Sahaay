import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { LocationIcon, ClockIcon, CalendarIcon, StarIcon } from '@/components/Icons'

export interface Provider {
  id: string; user_id: string; service_id: number
  bio: string | null; years_experience: string | null; service_radius_km: number
  verification_status: 'unverified' | 'pending' | 'verified' | 'rejected'
  rating: number; jobs_completed: number; hourly_rate: number | null; is_available: boolean
  latitude?: number | null; longitude?: number | null; profile_photo_url?: string | null
  distance?: number; estimated_minutes?: number
  user?: { full_name: string; city: string | null; state: string | null; avatar_url?: string | null }
}

interface BookingModalProps {
  provider: Provider
  customerLocation: { latitude: number; longitude: number; city: string; state: string }
  serviceName?: string
  initialProblem?: string
  onSubmit: (data: {
    address: string
    scheduledDate: string | null
    scheduledTime: string | null
    notes: string
    isEmergency: boolean
  }) => Promise<void>
  onClose: () => void
  isSubmitting: boolean
}

const generateTimeSlots = (filterPast: boolean = false): { label: string; value: string }[] => {
  const slots = []
  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()

  for (let hour = 9; hour < 18; hour++) {
    for (let minute of [0, 30]) {
      const hh = String(hour).padStart(2, '0')
      const mm = String(minute).padStart(2, '0')
      const label = `${hour > 12 ? hour - 12 : hour}:${mm} ${hour >= 12 ? 'PM' : 'AM'}`

      // Skip past time slots if filtering is enabled
      if (filterPast) {
        if (hour < currentHour) continue
        if (hour === currentHour && minute <= currentMinute) continue
      }

      slots.push({ label, value: `${hh}:${mm}` })
    }
  }
  return slots
}

const getMinDate = (): string => {
  const today = new Date()
  return today.toISOString().split('T')[0]
}

const getMaxDate = (): string => {
  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() + 7)
  return maxDate.toISOString().split('T')[0]
}

const BookingModal = ({
  provider,
  customerLocation,
  serviceName,
  initialProblem,
  onSubmit,
  onClose,
  isSubmitting,
}: BookingModalProps) => {
  const { t } = useTranslation()

  // Problem options based on service category
  const problemOptions: Record<string, { value: string; label: string }[]> = {
    electrician: [
      { value: 'fan_repair', label: 'Fan Repair' },
      { value: 'switch_socket', label: 'Switch & Socket Repair' },
      { value: 'light_installation', label: 'Light Installation' },
      { value: 'wiring_repair', label: 'Wiring Repair' },
    ],
    plumber: [
      { value: 'tap_repair', label: 'Tap Repair' },
      { value: 'pipe_leakage', label: 'Pipe Leakage' },
      { value: 'drain_blockage', label: 'Drain Blockage' },
      { value: 'bathroom_plumbing', label: 'Bathroom Plumbing' },
    ],
    carpenter: [
      { value: 'door_repair', label: 'Door Repair' },
      { value: 'furniture_repair', label: 'Furniture Repair' },
      { value: 'lock_repair', label: 'Lock Repair' },
      { value: 'shelf_installation', label: 'Shelf Installation' },
    ],
    painter: [
      { value: 'wall_painting', label: 'Wall Painting' },
      { value: 'room_painting', label: 'Room Painting' },
      { value: 'touch_up', label: 'Touch-up' },
      { value: 'exterior_painting', label: 'Exterior Painting' },
    ],
    driver: [
      { value: 'local_driver', label: 'Local Driver' },
      { value: 'outstation_driver', label: 'Outstation Driver' },
      { value: 'full_day_driver', label: 'Full-Day Driver' },
    ],
    cleaner: [
      { value: 'home_cleaning', label: 'Home Cleaning' },
      { value: 'bathroom_cleaning', label: 'Bathroom Cleaning' },
      { value: 'kitchen_cleaning', label: 'Kitchen Cleaning' },
      { value: 'deep_cleaning', label: 'Deep Cleaning' },
    ],
    caregiver: [
      { value: 'elder_care', label: 'Elder Care' },
      { value: 'patient_care', label: 'Patient Care' },
      { value: 'daily_assistance', label: 'Daily Assistance' },
    ],
    technician: [
      { value: 'ac_repair', label: 'AC Repair' },
      { value: 'refrigerator_repair', label: 'Refrigerator Repair' },
      { value: 'washing_machine_repair', label: 'Washing Machine Repair' },
      { value: 'tv_repair', label: 'TV Repair' },
    ],
  }

  // Get problems based on service name
  const getProblemsForService = () => {
    const serviceLower = (serviceName || '').toLowerCase()
    console.log('DEBUG [BookingModal]: serviceName:', serviceName, 'serviceLower:', serviceLower)

    for (const [key, options] of Object.entries(problemOptions)) {
      if (serviceLower.includes(key)) {
        console.log('DEBUG [BookingModal]: matched category:', key)
        return options
      }
    }
    // Default generic options
    console.log('DEBUG [BookingModal]: using default generic options')
    return [
      { value: 'repair', label: 'Repair/Maintenance' },
      { value: 'installation', label: 'Installation' },
      { value: 'service', label: 'Regular Service' },
      { value: 'emergency', label: 'Emergency Repair' },
      { value: 'inspection', label: 'Inspection/Diagnosis' },
      { value: 'other', label: 'Other Issue' },
    ]
  }

  const availableProblems = useMemo(() => getProblemsForService(), [serviceName])

  const [selectedProblems, setSelectedProblems] = useState<string[]>(() => {
    if (initialProblem) {
      // Find case-insensitive or close match if exact not found, but exact is mostly expected
      const matched = availableProblems.find(p => p.value.toLowerCase() === initialProblem.toLowerCase())
      if (matched) return [matched.value]
      return [initialProblem] // fallback to use as it is
    }
    return []
  })
  const [scheduledDate, setScheduledDate] = useState<string | null>(null)
  const [scheduledTime, setScheduledTime] = useState<string | null>(null)
  const [additionalNotes, setAdditionalNotes] = useState('')
  const [isEmergency, setIsEmergency] = useState(false)

  // Automatically use GPS location as address
  const autoAddress = useMemo(() => {
    if (!customerLocation) return 'Location not available'
    const parts = [customerLocation.city].filter(Boolean)
    if (customerLocation.state) parts.push(customerLocation.state)
    return parts.join(', ') || 'Current Location'
  }, [customerLocation])

  // Generate time slots - filter past slots if today is selected
  const today = new Date().toISOString().split('T')[0]
  const timeSlots = useMemo(() => {
    return scheduledDate === today
      ? generateTimeSlots(true) // filter past slots
      : generateTimeSlots(false)
  }, [scheduledDate])
  const minDate = useMemo(() => getMinDate(), [])
  const maxDate = useMemo(() => getMaxDate(), [])

  const toggleProblem = (value: string) => {
    setSelectedProblems(prev =>
      prev.includes(value)
        ? prev.filter(p => p !== value)
        : [...prev, value]
    )
  }

  const resetDateTime = () => {
    setScheduledDate(null)
    setScheduledTime(null)
  }

  const toggleEmergency = () => {
    setIsEmergency((prev) => {
      if (!prev) resetDateTime()
      return !prev
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedProblems.length === 0) {
      alert(t('select_problem', 'Please select at least one problem type.'))
      return
    }
    if (isEmergency && !scheduledDate) {
      alert(t('emergency_date_required', 'Emergency services require a preferred date.'))
      return
    }
    if (scheduledDate && !scheduledTime) {
      alert(t('time_required', 'Please select a time slot for your chosen date.'))
      return
    }

    // Validate date and time are in the future
    if (scheduledDate && scheduledTime) {
      const now = new Date()
      const selectedDateTime = new Date(`${scheduledDate}T${scheduledTime}:00`)

      // Check if date is today or in the future
      const today = new Date().toISOString().split('T')[0]
      if (scheduledDate < today) {
        alert(t('past_date_invalid', 'Cannot select a past date. Please choose a future or today\'s date.'))
        return
      }

      // Check if time is valid for today (must be in the future)
      if (scheduledDate === today && selectedDateTime <= now) {
        alert(t('past_time_invalid', 'Cannot select a past time. Please choose a future time slot.'))
        return
      }

      // Validate date is within 7 days
      const maxDate = new Date()
      maxDate.setDate(maxDate.getDate() + 7)
      if (selectedDateTime > maxDate) {
        alert(t('booking_window_invalid', 'Services can only be booked within 7 days from now. Please select an earlier date.'))
        return
      }
    }

    if (isEmergency) {
      const confirmed = window.confirm(
        t(
          'emergency_charge_disclaimer',
          'Emergency services are charged 25% extra. Do you want to proceed?'
        )
      )
      if (!confirmed) return
    }
    // Build notes from selected problems + additional notes
    const problemsLabel = selectedProblems
      .map(p => availableProblems.find(opt => opt.value === p)?.label || p)
      .join(', ')
    const notesText = additionalNotes.trim()
      ? `${problemsLabel}. ${additionalNotes.trim()}`
      : problemsLabel

    await onSubmit({
      address: autoAddress, // Use GPS location automatically
      scheduledDate,
      scheduledTime,
      notes: notesText,
      isEmergency,
    })
  }

  const formattedDate = scheduledDate
    ? new Date(scheduledDate + 'T00:00:00').toLocaleDateString('en-IN', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : null

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl relative animate-in zoom-in-95 duration-200 border border-slate-200">
        {/* Header (non-scrollable) */}
        <div className="flex-shrink-0 p-6 pb-0 sm:p-7 sm:pb-0">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>

          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1 font-display tracking-tight">
            {t('request_service', 'Request Service')}
          </h2>
          <p className="text-sm text-slate-500 mb-5">
            {t('booking_with', 'Booking with')}{' '}
            <span className="font-semibold text-slate-800">{provider.user?.full_name}</span>
          </p>

          {/* Provider Quick Info */}
          <div className="mb-5 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
            <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl overflow-hidden bg-teal-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-lg shadow-sm">
              {provider.profile_photo_url || provider.user?.avatar_url ? (
                <img
                  src={provider.profile_photo_url || provider.user?.avatar_url || ''}
                  alt={provider.user?.full_name || 'Provider'}
                  className="w-full h-full object-cover"
                />
              ) : (
                provider.user?.full_name?.charAt(0) || 'P'
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-900 text-sm truncate">
                {provider.user?.full_name || 'Verified Provider'}
              </p>
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-600">
                {provider.rating > 0 && (
                  <span className="flex items-center gap-1 font-semibold text-amber-600">
                    <StarIcon className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    {provider.rating.toFixed(1)}
                  </span>
                )}
                {provider.user?.city && (
                  <span className="flex items-center gap-1">
                    <LocationIcon className="w-3 h-3" />
                    {provider.user.city}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable form area */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-7 pb-6 sm:pb-7">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Auto-detected GPS Location */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                    <LocationIcon className="w-3.5 h-3.5" />
                    {t('service_location', 'Service Location')}
                  </div>
                  <p className="text-sm font-bold text-slate-900">{autoAddress}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">📍 Auto-detected from your GPS</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0 border border-teal-100">
                  <LocationIcon className="w-5 h-5 text-teal-600" />
                </div>
              </div>
            </div>

            {/* Problem Type Selector */}
            <div>
              <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
                {t('select_problem', 'Select Problem Type')} *
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {availableProblems.map((problem) => (
                  <button
                    key={problem.value}
                    type="button"
                    onClick={() => toggleProblem(problem.value)}
                    className={`py-3 px-3.5 text-xs font-semibold rounded-xl border transition-all duration-200 text-left flex items-center gap-2.5 ${
                      selectedProblems.includes(problem.value)
                        ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-500/20'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-teal-300 hover:bg-teal-50 hover:shadow-sm'
                    }`}
                  >
                    <span className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      selectedProblems.includes(problem.value)
                        ? 'border-white bg-white/30'
                        : 'border-slate-300 bg-white'
                    }`}>
                      {selectedProblems.includes(problem.value) && (
                        <span className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </span>
                    {problem.label}
                  </button>
                ))}
              </div>
              {selectedProblems.length > 0 && (
                <p className="text-[11px] text-teal-600 mt-2 font-medium">
                  ✓ {selectedProblems.length} problem{selectedProblems.length > 1 ? 's' : ''} selected
                </p>
              )}
            </div>

            {/* Additional Notes (Optional) */}
            <div>
              <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                {t('additional_notes', 'Additional Notes')} <span className="text-slate-400 font-normal normal-case">(Optional)</span>
              </label>
              <textarea
                rows={2}
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder={t('notes_hint', 'Any specific details or preferences...')}
                className="input-field resize-none !py-3"
              />
            </div>

            {/* Emergency Service Toggle */}
            <div>
              <button
                type="button"
                onClick={toggleEmergency}
                className={`w-full py-3 px-4 text-xs font-semibold rounded-xl border transition-all duration-200 text-left flex items-center justify-between ${
                  isEmergency
                    ? 'bg-red-50 text-red-700 border-red-200 shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  🚨 {t('emergency_service', 'Emergency Service')}
                </span>
                <span
                  className={`w-10 h-5.5 rounded-full relative transition-colors duration-300 ${
                    isEmergency ? 'bg-red-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform duration-300 ${
                      isEmergency ? 'translate-x-4.5' : ''
                    }`}
                  />
                </span>
              </button>
              {isEmergency && (
                <p className="text-[11px] text-red-600 mt-2 flex items-center gap-1 font-medium">
                  ⚠️ {t('emergency_charge_note', 'Emergency services are charged 25% extra.')}
                </p>
              )}
            </div>

            {/* Date & Time Selection */}
            <div className="grid grid-cols-1 gap-3">
              {/* Date Picker */}
              <div>
                <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                  {t('preferred_date', 'Preferred Date')} {isEmergency && '*'}
                </label>
                <div className="relative">
                  <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="date"
                    value={scheduledDate || ''}
                    onChange={(e) => {
                      const selectedDate = e.target.value || null

                      if (selectedDate) {
                        const today = new Date().toISOString().split('T')[0]

                        // Validate date is not in the past
                        if (selectedDate < today) {
                          alert(t('past_date_invalid', 'Cannot select a past date. Please choose today or a future date.'))
                          return
                        }

                        // Validate date is within 7 days
                        if (selectedDate > maxDate) {
                          alert(t('booking_window_invalid', 'Services can only be booked within 7 days from now.'))
                          return
                        }
                      }

                      setScheduledDate(selectedDate)
                      if (selectedDate && !scheduledTime) {
                        // keep time empty so they pick it
                      }
                    }}
                    disabled={isEmergency === false && false}
                    min={minDate}
                    max={maxDate}
                    className="input-field !pl-11"
                  />
                </div>
                {scheduledDate && (
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    {formattedDate}
                  </p>
                )}
              </div>

              {/* Time Slot Selector */}
              {scheduledDate && (
                <div>
                  <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                    {t('preferred_time', 'Preferred Time')} *
                  </label>
                  <div className="relative">
                    <ClockIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
                    <select
                      value={scheduledTime || ''}
                      onChange={(e) => setScheduledTime(e.target.value || null)}
                      className="input-field !pl-11 appearance-none"
                    >
                      <option value="">
                        {t('select_time_slot', 'Select a time slot')}
                      </option>
                      {timeSlots.map((slot) => (
                        <option key={slot.value} value={slot.value}>
                          {slot.label}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400">
                      ▼
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Helper Text */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600">
              <p className="font-bold mb-1.5 text-slate-900">💡 {t('booking_tips', 'Booking Tips')}:</p>
              <ul className="space-y-1 list-disc list-inside text-slate-500">
                <li>{t('tip_7_days', 'Book up to 7 days in advance')}</li>
                <li>{t('tip_30_min_slots', 'Time slots are in 30-minute intervals')}</li>
                <li>{t('tip_double_book', "We'll prevent double-bookings automatically")}</li>
              </ul>
            </div>

            {/* Form Actions */}
            <div className="pt-2 flex items-center justify-end gap-3 sticky bottom-0 bg-white pb-1 -mb-1">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                {t('cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm transition-colors shadow-lg shadow-teal-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting
                  ? t('sending_request', 'Sending Request...')
                  : t('confirm_request', 'Confirm Request')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default BookingModal
