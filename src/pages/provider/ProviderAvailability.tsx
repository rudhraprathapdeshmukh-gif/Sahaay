import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useTranslation } from 'react-i18next'
import DashboardLayout from '@/components/DashboardLayout'
import { supabase } from '@/lib/supabase'
import { ClockIcon, CheckCircleIcon } from '@/components/Icons'

interface AvailabilityData {
  availability: string[]
  service_radius_km: number
  is_available: boolean
}

const ProviderAvailability = () => {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [availability, setAvailability] = useState<AvailabilityData>({
    availability: [],
    service_radius_km: 10,
    is_available: true,
  })
  const [saving, setSaving] = useState(false)

  const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const TIME_SLOTS = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00']

  const loadData = async () => {
    if (!user?.id) return

    try {
      setLoading(true)

      const { data: provider } = await supabase
        .from('service_providers')
        .select('availability, service_radius_km, is_available')
        .eq('user_id', user.id)
        .single()

      if (provider) {
        setAvailability({
          availability: provider.availability || [],
          service_radius_km: provider.service_radius_km || 10,
          is_available: provider.is_available !== false,
        })
      }
    } catch (err) {
      console.error('Failed to load availability:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user?.id])

  const handleSave = async () => {
    if (!user?.id) return

    try {
      setSaving(true)

      const { error } = await supabase
        .from('service_providers')
        .update({
          availability: availability.availability,
          service_radius_km: availability.service_radius_km,
          is_available: availability.is_available,
        })
        .eq('user_id', user.id)

      if (error) throw error

      alert(t('profile_saved', 'Availability updated successfully!'))
    } catch (err) {
      console.error('Failed to save availability:', err)
      alert('Failed to save availability. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout
      role="provider"
      pageTitle={t('availability', 'Availability')}
      pageSubtitle={t('set_when_you_can_take_jobs', 'Configure your working hours and service radius')}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600">{t('loading', 'Loading...')}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Status Toggle */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
                {t('status', 'Status')}
              </h2>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <p className="font-semibold text-slate-900">{t('go_live', 'Go Live')}</p>
                  <p className="text-sm text-slate-500 mt-1">
                    {availability.is_available
                      ? 'You are currently available to accept new jobs'
                      : 'You are currently offline. Turn on to receive requests.'}
                  </p>
                </div>
                <button
                  onClick={() => setAvailability({ ...availability, is_available: !availability.is_available })}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                    availability.is_available ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      availability.is_available ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Service Radius */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-4">{t('service_radius_km', 'Service Radius (km)')}</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={availability.service_radius_km}
                    onChange={(e) =>
                      setAvailability({ ...availability, service_radius_km: parseInt(e.target.value) })
                    }
                    className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="text-2xl font-bold text-blue-600 w-16 text-right">
                    {availability.service_radius_km} km
                  </div>
                </div>
                <p className="text-sm text-slate-500">
                  You will receive requests from customers within {availability.service_radius_km} km of your location.
                </p>
              </div>
            </div>

            {/* Working Hours */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <ClockIcon className="w-5 h-5 text-orange-600" />
                {t('availability_hours', 'Availability Hours')}
              </h2>
              <p className="text-sm text-slate-600 mb-4">
                Select the days and hours you are available to work. (Currently supports basic on/off - extended scheduling coming soon)
              </p>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {DAYS_OF_WEEK.map((day) => (
                  <label
                    key={day}
                    className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={availability.availability.includes(day)}
                      onChange={(e) => {
                        const updated = e.target.checked
                          ? [...availability.availability, day]
                          : availability.availability.filter((d) => d !== day)
                        setAvailability({ ...availability, availability: updated })
                      }}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span className="font-medium text-slate-700">{day}</span>
                  </label>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                <strong>💡 Tip:</strong> Advanced scheduling with specific time slots coming soon. For now, toggle entire days on/off.
              </div>
            </div>

            {/* Save Button */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-sm transition-colors"
              >
                {saving ? t('saving', 'Saving...') : t('save_profile', 'Save Changes')}
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default ProviderAvailability
