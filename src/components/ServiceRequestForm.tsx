import React, { useState, useMemo, useEffect } from 'react'
import { CATEGORY_PRICING, formatPrice, calculatePricingBreakdown } from '@/lib/pricing'
import { requestService } from '@/lib/bookings'
import type { CategoryPricing, CategorySubcategory, DurationPricing } from '@/lib/pricing'
import { useAuth } from '@/context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { CalendarIcon, ClockIcon, LocationIcon } from '@/components/Icons'
import { useGeolocation } from '@/hooks/useGeolocation'
import type { PaymentMethod, PaymentTiming } from '@/types/payments'
import { PaymentMethodSelector } from '@/components/payments/PaymentMethodSelector'
import { createPayment, processPayment } from '@/lib/payments'
import { supabase } from '@/lib/supabase'

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
  maxDate.setDate(maxDate.getDate() + 7) // Limited to 1 week from today
  return maxDate.toISOString().split('T')[0]
}

const ServiceRequestForm: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<'category' | 'subcategory' | 'duration' | 'problem' | 'details'>('category')
  const [selectedCategory, setSelectedCategory] = useState<CategoryPricing | null>(null)
  const [selectedSubcategory, setSelectedSubcategory] = useState<CategorySubcategory | null>(null)
  const [selectedDuration, setSelectedDuration] = useState<DurationPricing | null>(null)

  // Request details
  const [scheduledDate, setScheduledDate] = useState<string>('')
  const [scheduledTime, setScheduledTime] = useState<string>('')
  const [address, setAddress] = useState<string>('')
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)

  const [selectedProblems, setSelectedProblems] = useState<string[]>([])
  const [additionalNotes, setAdditionalNotes] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [locationLoading, setLocationLoading] = useState<boolean>(false)
  const [locationName, setLocationName] = useState<string>('')

  // Payment state
  const [paymentTiming, setPaymentTiming] = useState<PaymentTiming>('post_service')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [paymentId, setPaymentId] = useState<string | null>(null)

  const { requestLocation, location: geoLocation } = useGeolocation()

  // Auto-request location when component mounts
  useEffect(() => {
    if (latitude === null && longitude === null && !locationLoading) {
      handleRequestLocation()
    }
  }, [])

  // Generate time slots - filter past slots if today is selected
  const today = new Date().toISOString().split('T')[0]
  const timeSlots = useMemo(() => {
    return scheduledDate === today
      ? generateTimeSlots(true) // filter past slots
      : generateTimeSlots(false)
  }, [scheduledDate])
  const minDate = useMemo(() => getMinDate(), [])
  const maxDate = useMemo(() => getMaxDate(), [])

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

  const availableProblems = useMemo(() => {
    if (!selectedCategory) return []
    return problemOptions[selectedCategory.slug] || [
      { value: 'repair', label: 'Repair/Maintenance' },
      { value: 'installation', label: 'Installation' },
      { value: 'service', label: 'Regular Service' },
      { value: 'emergency', label: 'Emergency Repair' },
      { value: 'inspection', label: 'Inspection/Diagnosis' },
      { value: 'other', label: 'Other Issue' },
    ]
  }, [selectedCategory])

  const finalAmount = useMemo(() => {
    if (selectedDuration) return selectedDuration.customerPrice
    if (selectedSubcategory?.startingPrice) return selectedSubcategory.startingPrice
    return selectedCategory?.startingPrice ?? 0
  }, [selectedCategory, selectedSubcategory, selectedDuration])

  const pricingBreakdown = useMemo(() => {
    if (!selectedCategory) return null
    return calculatePricingBreakdown(finalAmount, selectedCategory.slug)
  }, [finalAmount, selectedCategory])

  const handleCategorySelect = (cat: CategoryPricing) => {
    setSelectedCategory(cat)
    if (cat.subcategories && cat.subcategories.length > 0) {
      setStep('subcategory')
    } else {
      setStep('details')
    }
  }

  const handleSubcategorySelect = (sub: CategorySubcategory) => {
    setSelectedSubcategory(sub)
    if (sub.durationOptions && sub.durationOptions.length > 0) {
      setStep('duration')
    } else {
      setStep('problem')
    }
  }

  const handleDurationSelect = (dur: DurationPricing) => {
    setSelectedDuration(dur)
    setStep('problem')
  }

  const toggleProblem = (value: string) => {
    setSelectedProblems(prev =>
      prev.includes(value)
        ? prev.filter(p => p !== value)
        : [...prev, value]
    )
  }

  const handleRequestLocation = async () => {
    setLocationLoading(true)
    try {
      await requestLocation()
      if (geoLocation?.latitude && geoLocation?.longitude) {
        setLatitude(geoLocation.latitude)
        setLongitude(geoLocation.longitude)
        // Build location name from available details (most specific to general)
        const parts = []
        if (geoLocation.district) parts.push(geoLocation.district)
        if (geoLocation.city) parts.push(geoLocation.city)
        if (geoLocation.state) parts.push(geoLocation.state)
        setLocationName(parts.join(', ') || 'Current Location')
      }
    } catch (err: any) {
      setError('Could not access your location. Please enable location access and try again.')
    } finally {
      setLocationLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!user || !selectedCategory) return

    if (!scheduledDate || !scheduledTime) {
      setError('Please select a date and time for your service request')
      return
    }

    // Validate payment selection for upfront payment
    if (paymentTiming === 'upfront' && !paymentMethod) {
      setError('Please select a payment method')
      return
    }

    // Validate date and time are in the future
    const now = new Date()
    const selectedDateTime = new Date(`${scheduledDate}T${scheduledTime}:00`)

    // Check if date is today or in the future
    const today = new Date().toISOString().split('T')[0]
    if (scheduledDate < today) {
      setError('Cannot select a past date. Please choose a future or today\'s date.')
      return
    }

    // Check if time is valid for today (must be in the future)
    if (scheduledDate === today && selectedDateTime <= now) {
      setError('Cannot select a past time. Please choose a future time slot.')
      return
    }

    // Validate date is within 7 days
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + 7)
    if (selectedDateTime > maxDate) {
      setError('Services can only be booked within 7 days from now. Please select an earlier date.')
      return
    }

    // Location is auto-detected - no manual address entry needed
    if (latitude === null || longitude === null) {
      setError('Please enable location access to submit your request')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setPaymentError(null)

    try {
      // Map category slug to service_id from services table
      const categoryToServiceId: Record<string, number> = {
        electrician: 1,
        plumber: 2,
        carpenter: 3,
        painter: 4,
        driver: 5,
        cleaner: 6,
        caregiver: 7,
        technician: 8,
      }

      const problemsLabel = selectedProblems
        .map(p => availableProblems.find(opt => opt.value === p)?.label || p)
        .join(', ')
      const notesText = additionalNotes.trim()
        ? `${problemsLabel}. ${additionalNotes.trim()}`
        : problemsLabel

      // If upfront payment, process payment first
      if (paymentTiming === 'upfront' && paymentMethod) {
        setIsProcessingPayment(true)

        try {
          // Create booking first to get booking_id, then process payment
          const booking = await requestService({
            customer_id: user.id,
            provider_id: null,
            service_id: categoryToServiceId[selectedCategory.slug] || 1,
            scheduled_at: `${scheduledDate}T${scheduledTime}:00`,
            address: address.trim(),
            notes: notesText || undefined,
            amount: finalAmount,
            latitude,
            longitude,
            payment_timing: paymentTiming,
          })

          // Create payment record and process through gateway
          const payment = await createPayment(booking, user.id, paymentMethod!)

          // Get user email - handle different possible formats
          const customerEmail = user.email || user.user_metadata?.email || 'customer@example.com'
          const customerPhone = user.phone || user.user_metadata?.phone

          // Process payment through mock gateway
          const processedPayment = await processPayment(
            payment,
            customerEmail,
            customerPhone
          )

          if (processedPayment.status !== 'paid') {
            setPaymentError('Payment failed. Please try again.')
            setError('Payment failed. Please try again.')

            // Delete the booking since payment failed
            try {
              await supabase.from('bookings').delete().eq('id', booking.id)
            } catch (deleteErr) {
              console.error('Error deleting booking after failed payment:', deleteErr)
            }

            setIsProcessingPayment(false)
            setIsSubmitting(false)
            return
          }

          // Payment successful
          setPaymentId(payment.id)
          setIsProcessingPayment(false)
          navigate('/bookings')
          return
        } catch (paymentErr: any) {
          console.error('Payment processing error:', paymentErr)
          setPaymentError(paymentErr.message || 'Payment processing failed. Please try again.')
          setError(paymentErr.message || 'Payment processing failed. Please try again.')
          setIsProcessingPayment(false)
          setIsSubmitting(false)
          return
        }
      }

      // For post-service payment, just create booking
      await requestService({
        customer_id: user.id,
        provider_id: null,
        service_id: categoryToServiceId[selectedCategory.slug] || 1,
        scheduled_at: `${scheduledDate}T${scheduledTime}:00`,
        address: address.trim(),
        notes: notesText || undefined,
        amount: finalAmount,
        latitude,
        longitude,
        payment_timing: paymentTiming,
      })

      navigate('/bookings')
    } catch (err: any) {
      console.error('Submit error:', err)
      setError(err.message || 'Failed to submit request')
    } finally {
      setIsSubmitting(false)
      setIsProcessingPayment(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6">
      {/* Progress indicator */}
      <div className="mb-6 flex items-center justify-center gap-2">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
          step === 'category' ? 'bg-teal-600 text-white' : 'bg-teal-100 text-teal-700'
        }`}>1</div>
        <div className="w-12 h-0.5 bg-slate-200"></div>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
          step === 'subcategory' || step === 'duration' || step === 'problem' ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-400'
        }`}>2</div>
        <div className="w-12 h-0.5 bg-slate-200"></div>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
          step === 'details' ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-400'
        }`}>3</div>
      </div>

      <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6 sm:p-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* STEP 1: Category Selection */}
        {step === 'category' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Select Service Category</h2>
              <p className="text-sm text-slate-500">Choose the type of service you need</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {CATEGORY_PRICING.map(cat => (
                <button
                  key={cat.slug}
                  onClick={() => handleCategorySelect(cat)}
                  className="p-4 border-2 border-slate-200 rounded-2xl hover:border-teal-500 hover:bg-teal-50 transition-all text-left group"
                >
                  <div className="text-3xl mb-2">{cat.icon}</div>
                  <div className="font-bold text-sm text-slate-900 mb-1">{cat.categoryName}</div>
                  <div className="text-xs text-teal-600 font-semibold">
                    From {formatPrice(cat.startingPrice)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: Subcategory Selection */}
        {step === 'subcategory' && selectedCategory && (
          <div className="space-y-6">
            <div>
              <button
                onClick={() => setStep('category')}
                className="text-sm text-slate-500 hover:text-slate-700 mb-2 flex items-center gap-1"
              >
                ← Back
              </button>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                {selectedCategory.categoryName} Services
              </h2>
              <p className="text-sm text-slate-500">Select the specific service you need</p>
            </div>

            <div className="space-y-3">
              {selectedCategory.subcategories?.map(sub => (
                <button
                  key={sub.slug}
                  onClick={() => handleSubcategorySelect(sub)}
                  className="w-full p-4 border-2 border-slate-200 rounded-xl hover:border-teal-500 hover:bg-teal-50 transition-all text-left flex justify-between items-center group"
                >
                  <div className="flex-1">
                    <div className="font-bold text-slate-900 mb-1">{sub.name}</div>
                    <div className="text-xs text-slate-500">{sub.description}</div>
                  </div>
                  {sub.startingPrice && (
                    <div className="text-sm font-bold text-teal-600 ml-4">
                      {formatPrice(sub.startingPrice)}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2.5: Duration Selection (for care services) */}
        {step === 'duration' && selectedSubcategory?.durationOptions && (
          <div className="space-y-6">
            <div>
              <button
                onClick={() => setStep('subcategory')}
                className="text-sm text-slate-500 hover:text-slate-700 mb-2 flex items-center gap-1"
              >
                ← Back
              </button>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Select Duration
              </h2>
              <p className="text-sm text-slate-500">Choose how long you need the service</p>
            </div>

            <div className="space-y-3">
              {selectedSubcategory.durationOptions.map((dur, idx) => (
                <button
                  key={idx}
                  onClick={() => handleDurationSelect(dur)}
                  className="w-full p-4 border-2 border-slate-200 rounded-xl hover:border-teal-500 hover:bg-teal-50 transition-all text-left"
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-bold text-slate-900">
                      {dur.durationHours} {dur.durationHours === 1 ? 'Hour' : 'Hours'}
                    </div>
                    <div className="text-lg font-bold text-teal-600">
                      {formatPrice(dur.customerPrice)}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">
                    Provider earns: {formatPrice(dur.providerEarning)} • Platform fee: {formatPrice(dur.platformFee)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2.5: Problem Selection */}
        {step === 'problem' && selectedCategory && (
          <div className="space-y-6">
            <div>
              <button
                onClick={() => {
                  if (selectedSubcategory?.durationOptions) {
                    setStep('duration')
                  } else if (selectedCategory.subcategories) {
                    setStep('subcategory')
                  } else {
                    setStep('category')
                  }
                }}
                className="text-sm text-slate-500 hover:text-slate-700 mb-2 flex items-center gap-1"
              >
                ← Back
              </button>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Select Problem Type</h2>
              <p className="text-sm text-slate-500">Choose the issues you need help with</p>
            </div>

            <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl">
              <div className="text-sm font-semibold text-teal-900">
                Selected Service: {selectedCategory.categoryName}
                {selectedSubcategory && ` - ${selectedSubcategory.name}`}
                {selectedDuration && ` (${selectedDuration.durationHours}h)`}
              </div>
            </div>

            {/* Problem Type Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Select Problem Type *
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
                <p className="text-xs text-teal-600 mt-2 font-medium">
                  ✓ {selectedProblems.length} problem{selectedProblems.length > 1 ? 's' : ''} selected
                </p>
              )}
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Additional Notes <span className="text-slate-400 font-normal normal-case">(Optional)</span>
              </label>
              <textarea
                rows={3}
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Any specific details or preferences... For example: 'Need it done by evening', 'Prefer eco-friendly materials', etc."
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-teal-500 focus:outline-none resize-none"
              />
            </div>

            <button
              onClick={() => setStep('details')}
              disabled={selectedProblems.length === 0}
              className="w-full py-4 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg transition-colors shadow-lg shadow-teal-900/20"
            >
              Continue
            </button>
          </div>
        )}

        {/* STEP 3: Details & Pricing */}
        {step === 'details' && selectedCategory && (
          <div className="space-y-6">
            <div>
              <button
                onClick={() => setStep('problem')}
                className="text-sm text-slate-500 hover:text-slate-700 mb-2 flex items-center gap-1"
              >
                ← Back
              </button>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Request Details</h2>
              <p className="text-sm text-slate-500">Provide service details and schedule</p>
            </div>

            {/* Pricing Summary */}
            <div className="p-5 bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-200 rounded-2xl">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <div className="text-sm font-semibold text-teal-900">
                    {selectedCategory.categoryName}
                    {selectedSubcategory && ` - ${selectedSubcategory.name}`}
                    {selectedDuration && ` (${selectedDuration.durationHours}h)`}
                  </div>
                  {pricingBreakdown && (
                    <div className="text-xs text-teal-700 mt-1">
                      Provider earns {pricingBreakdown.providerEarningPercentage}% • Platform fee {pricingBreakdown.platformFeePercentage}%
                    </div>
                  )}
                </div>
                <div className="text-2xl font-bold text-teal-900">
                  {formatPrice(finalAmount)}
                </div>
              </div>
            </div>

            {/* Date & Time Selection */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Preferred Date *
                </label>
                {/* Quick Date Selection Buttons */}
                <div className="flex gap-2 mb-3">
                  {[
                    { label: 'Today', days: 0 },
                    { label: 'Tomorrow', days: 1 },
                    { label: 'In 2 Days', days: 2 },
                  ].map(({ label, days }) => {
                    const date = new Date()
                    date.setDate(date.getDate() + days)
                    const dateValue = date.toISOString().split('T')[0]
                    const isSelected = scheduledDate === dateValue
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => {
                          setScheduledDate(dateValue)
                          setScheduledTime('')
                          setError(null)
                        }}
                        className={`flex-1 py-2.5 px-3 text-xs font-semibold rounded-lg border-2 transition-all ${
                          isSelected
                            ? 'bg-teal-600 text-white border-teal-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300 hover:bg-teal-50'
                        }`}
                      >
                        {label}
                        <div className="text-[10px] opacity-75 font-normal">
                          {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Calendar Input */}
                <div className="relative">
                  <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => {
                      const selectedDate = e.target.value
                      const today = new Date().toISOString().split('T')[0]
                      const maxDateStr = maxDate

                      // Validate date is not in the past
                      if (selectedDate < today) {
                        setError('Cannot select a past date. Please choose today or a future date.')
                        return
                      }

                      // Validate date is within 7 days
                      if (selectedDate > maxDateStr) {
                        setError('Services can only be booked within 7 days from now.')
                        return
                      }

                      setScheduledDate(selectedDate)
                      setScheduledTime('') // Reset time when date changes
                      setError(null)
                    }}
                    min={minDate}
                    max={maxDate}
                    className="w-full pl-11 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:border-teal-500 focus:outline-none"
                  />
                </div>
                {scheduledDate && (
                  <p className="text-xs text-teal-600 mt-2 font-medium">
                    📅 {new Date(scheduledDate + 'T00:00:00').toLocaleDateString('en-IN', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                )}
              </div>

              {/* Time Selection */}
              {scheduledDate && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                    Preferred Time *
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {timeSlots.map((slot) => (
                      <button
                        key={slot.value}
                        type="button"
                        onClick={() => setScheduledTime(slot.value)}
                        className={`py-2.5 px-2 text-xs font-semibold rounded-lg border-2 transition-all ${
                          scheduledTime === slot.value
                            ? 'bg-teal-600 text-white border-teal-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300 hover:bg-teal-50'
                        }`}
                      >
                        {slot.label}
                      </button>
                    ))}
                  </div>
                  {scheduledTime && (
                    <p className="text-xs text-teal-600 mt-2 font-medium">
                      🕐 {scheduledTime}
                    </p>
                  )}
                </div>
              )}
            </div>

            
            {/* Payment Method Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Payment Timing *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentTiming('upfront')
                    setError(null)
                  }}
                  className={`p-4 border-2 rounded-xl transition-all text-left ${
                    paymentTiming === 'upfront'
                      ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-500/20'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-teal-300 hover:bg-teal-50'
                  }`}
                >
                  <div className="font-bold text-sm mb-1">Pay Now</div>
                  <div className="text-xs opacity-90">Pay upfront, service after payment</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentTiming('post_service')
                    setError(null)
                  }}
                  className={`p-4 border-2 rounded-xl transition-all text-left ${
                    paymentTiming === 'post_service'
                      ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-500/20'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-teal-300 hover:bg-teal-50'
                  }`}
                >
                  <div className="font-bold text-sm mb-1">Pay Later</div>
                  <div className="text-xs opacity-90">Pay after service completion</div>
                </button>
              </div>
            </div>

            {/* Payment Method (only for upfront payment) */}
            {paymentTiming === 'upfront' && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Payment Method *
                </label>
                <PaymentMethodSelector
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                  showCashOption={false}
                />
              </div>
            )}

            {/* Auto-Location Capture */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  📍 Your Location (Auto-Detected)
                </label>
              </div>
              {latitude && longitude ? (
                <div className="p-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl">
                  <p className="text-sm font-bold text-emerald-900 mb-1">✓ Location Captured</p>
                  <p className="text-sm text-emerald-800 font-medium">
                    {locationName || 'Current Location'}
                  </p>
                  <p className="text-xs text-emerald-600 mt-2">
                    Providers within 10km of your location will see this request
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleRequestLocation}
                  disabled={locationLoading}
                  className="w-full px-4 py-3 bg-teal-100 hover:bg-teal-200 disabled:bg-slate-100 border-2 border-teal-300 disabled:border-slate-200 rounded-xl text-sm font-bold text-teal-700 disabled:text-slate-400 transition-colors flex items-center justify-center gap-2"
                >
                  {locationLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-teal-300 border-t-teal-700 rounded-full animate-spin" />
                      Detecting Location...
                    </>
                  ) : (
                    <>
                      📍 Detect My Location
                    </>
                  )}
                </button>
              )}
            </div>


            {/* Helper Info */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600">
              <p className="font-bold mb-2 text-slate-900">💡 What happens next?</p>
              <ul className="space-y-1 list-disc list-inside text-slate-600">
                <li>Your request goes to the provider pool</li>
                <li>Verified providers can claim your request</li>
                <li>You'll be notified when a provider accepts</li>
                <li>Maximum 1 active request at a time</li>
                {paymentTiming === 'upfront' && <li className="text-teal-700 font-medium">💳 Payment processed before service</li>}
                {paymentTiming === 'post_service' && <li className="text-slate-700">💵 Payment after service completion</li>}
              </ul>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                !scheduledDate ||
                !scheduledTime ||
                latitude === null ||
                longitude === null ||
                (paymentTiming === 'upfront' && !paymentMethod)
              }
              className="w-full py-4 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg transition-colors shadow-lg shadow-teal-900/20"
            >
              {isSubmitting
                ? (isProcessingPayment ? 'Processing Payment...' : 'Submitting Request...')
                : paymentTiming === 'upfront'
                  ? `Pay ${formatPrice(finalAmount)} & Submit`
                  : 'Submit Request'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ServiceRequestForm
