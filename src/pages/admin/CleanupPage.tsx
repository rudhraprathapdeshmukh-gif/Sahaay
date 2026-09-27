/**
 * Admin Database Cleanup Page
 * Access at /admin/cleanup
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/context/AuthContext'
import { cleanupFakeData, getFakeDataReport } from '@/lib/database-cleanup'

interface CleanupReport {
  fakeUsersCount: number
  fakeProvidersCount: number
  sampleFakeUsers: Array<{ id: string; email: string; full_name: string }>
  sampleFakeProviders: Array<{ id: string; bio: string | null }>
}

interface CleanupResult {
  summary: string
  results: {
    fakeProvidersDeleted: number
    fakeUsersDeleted: number
  }
  errors: string[]
}

export default function AdminCleanupPage() {
  const { t } = useTranslation()
  const { user, isAuthenticated, loading } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<'idle' | 'loading' | 'report' | 'cleaning' | 'complete'>('idle')
  const [report, setReport] = useState<CleanupReport | null>(null)
  const [result, setResult] = useState<CleanupResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Redirect if not admin
  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== 'admin')) {
      navigate('/admin-login', { replace: true })
    }
  }, [isAuthenticated, user, loading, navigate])

  if (loading || !isAuthenticated || user?.role !== 'admin') {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 text-gray-500">{t('loading', 'Loading...')}</div>
  }

  const handleGenerateReport = async () => {
    setStep('loading')
    setError(null)

    try {
      const data = await getFakeDataReport()
      setReport(data)
      setStep('report')
    } catch (err) {
      const message = err instanceof Error ? err.message : t('failed_to_generate_report', 'Failed to generate report')
      setError(message)
      setStep('idle')
    }
  }

  const handleRunCleanup = async () => {
    if (!report) return

    setStep('cleaning')
    setError(null)

    try {
      const cleanupResult = await cleanupFakeData()
      setResult(cleanupResult)
      setStep('complete')
    } catch (err) {
      const message = err instanceof Error ? err.message : t('cleanup_failed', 'Cleanup failed')
      setError(message)
      setStep('report')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-8 text-white">
            <h1 className="text-2xl font-bold">{t('database_cleanup', 'Database Cleanup')}</h1>
            <p className="mt-2 text-red-100">{t('database_cleanup_desc', 'Remove fake and placeholder data from Sahaay database')}</p>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Idle State - Initial */}
            {step === 'idle' && (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800">
                    ⚠️ {t('cleanup_warning', 'This will permanently delete test/placeholder data from your database. Make sure you have a backup first.')}
                  </p>
                </div>

                <button
                  onClick={handleGenerateReport}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition"
                >
                  {t('generate_cleanup_report', 'Generate Cleanup Report')}
                </button>
              </div>
            )}

            {/* Loading State */}
            {step === 'loading' && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-gray-600">{t('analyzing_database', 'Analyzing database for fake data...')}</p>
                </div>
              </div>
            )}

            {/* Report State */}
            {step === 'report' && report && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-3">{t('fake_data_found', 'Fake Data Found:')}</h3>
                  <div className="space-y-2 text-sm text-blue-800">
                    <p>
                      <span className="font-medium">{report.fakeUsersCount}</span> {t('fake_user_accounts', 'fake user accounts')}
                    </p>
                    <p>
                      <span className="font-medium">{report.fakeProvidersCount}</span> {t('fake_provider_profiles', 'fake provider profiles')}
                    </p>
                  </div>
                </div>

                {/* Sample fake users */}
                {report.sampleFakeUsers.length > 0 && (
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2 text-gray-900">{t('sample_fake_users', 'Sample Fake Users:')}</h4>
                    <ul className="space-y-1 text-sm text-gray-700">
                      {report.sampleFakeUsers.map((user) => (
                        <li key={user.id} className="flex items-start">
                          <span className="mr-2">•</span>
                          <span>
                            <strong>{user.full_name}</strong> ({user.email})
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Sample fake providers */}
                {report.sampleFakeProviders.length > 0 && (
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2 text-gray-900">{t('sample_fake_providers', 'Sample Fake Providers:')}</h4>
                    <ul className="space-y-1 text-sm text-gray-700">
                      {report.sampleFakeProviders.map((provider) => (
                        <li key={provider.id} className="flex items-start">
                          <span className="mr-2">•</span>
                          <span>{provider.bio?.substring(0, 50)}...</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setStep('idle')}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 rounded-lg transition"
                  >
                    {t('cancel', 'Cancel')}
                  </button>
                  <button
                    onClick={handleRunCleanup}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-3 rounded-lg transition"
                  >
                    {t('delete_fake_data', 'Delete Fake Data')}
                  </button>
                </div>
              </div>
            )}

            {/* Cleaning State */}
            {step === 'cleaning' && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-gray-600">{t('deleting_fake_data', 'Deleting fake data from database...')}</p>
                  <p className="text-xs text-gray-500 mt-2">{t('this_may_take_a_moment', 'This may take a moment')}</p>
                </div>
              </div>
            )}

            {/* Complete State */}
            {step === 'complete' && result && (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-900 mb-3">✅ {t('cleanup_complete', 'Cleanup Complete!')}</h3>
                  <div className="space-y-2 text-sm text-green-800">
                    <p>
                      {t('deleted_count', 'Deleted')} <span className="font-medium">{result.results.fakeProvidersDeleted}</span> {t('fake_providers', 'fake providers')}
                    </p>
                    <p>
                      {t('deleted_count', 'Deleted')} <span className="font-medium">{result.results.fakeUsersDeleted}</span> {t('fake_users', 'fake users')}
                    </p>
                  </div>
                </div>

                {result.errors.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h4 className="font-semibold text-amber-900 mb-2">⚠️ {t('warnings', 'Warnings:')}</h4>
                    <ul className="space-y-1 text-xs text-amber-800">
                      {result.errors.map((error, idx) => (
                        <li key={idx}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">{result.summary}</p>
                </div>

                <button
                  onClick={() => {
                    setStep('idle')
                    setReport(null)
                    setResult(null)
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition"
                >
                  {t('done', 'Done')}
                </button>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-900 mb-2">❌ {t('error', 'Error')}</h4>
                <p className="text-sm text-red-800 mb-4">{error}</p>
                <button
                  onClick={() => {
                    setError(null)
                    setStep('idle')
                  }}
                  className="text-sm font-medium text-red-700 hover:text-red-900"
                >
                  {t('try_again', 'Try again')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Info section */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-3">{t('what_gets_deleted', 'What gets deleted?')}</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start">
              <span className="mr-3 text-gray-400">•</span>
              <span>{t('cleanup_info_1', 'User accounts with fake emails (test@, demo@, fake@, etc.)')}</span>
            </li>
            <li className="flex items-start">
              <span className="mr-3 text-gray-400">•</span>
              <span>{t('cleanup_info_2', 'Provider profiles with placeholder or test data')}</span>
            </li>
            <li className="flex items-start">
              <span className="mr-3 text-gray-400">•</span>
              <span>{t('cleanup_info_3', 'Associated bookings and skill links')}</span>
            </li>
            <li className="flex items-start">
              <span className="mr-3 text-gray-400">•</span>
              <span>{t('cleanup_info_4', 'Any data matching common fake patterns')}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
