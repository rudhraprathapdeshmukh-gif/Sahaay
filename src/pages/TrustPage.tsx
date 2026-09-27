import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from '@/components/Layout'
import { ShieldIcon, StarIcon, UsersIcon, LockIcon } from '@/components/Icons'
import { useAuth } from '@/context/AuthContext'

const TrustPage = () => {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const trustPoints = [
    {
      title: t('background_verified', 'Background Verified'),
      description: t('background_verified_desc', 'Every provider undergoes thorough background checks and verification before joining the platform.'),
      icon: ShieldIcon,
    },
    {
      title: t('customer_reviews', 'Customer Reviews'),
      description: t('customer_reviews_desc', 'Real ratings and reviews from thousands of satisfied customers to help you make informed decisions.'),
      icon: StarIcon,
    },
    {
      title: t('secure_payments', 'Secure Payments'),
      description: t('secure_payments_desc', 'All payments are processed through secure gateways with multiple layers of protection.'),
      icon: LockIcon,
    },
    {
      title: t('community_trust', 'Community Trust'),
      description: t('community_trust_desc', 'Join a community of over 50,000 users who trust Sahaay for their service needs.'),
      icon: UsersIcon,
    },
  ]

  return (
    <Layout>
      {/* ── HERO ── */}
      <section style={{backgroundColor: '#f8fafc'}}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <Link to="/" className="text-sm font-medium mb-6 inline-flex items-center gap-1" style={{color: 'var(--color-primary)'}}>
            {t('back_to_home', '← Back to home')}
          </Link>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4" style={{color: '#0f172a', fontFamily: 'Plus Jakarta Sans, sans-serif'}}>
            {t('trust_and_safety', 'Trust & Safety')}
          </h1>
          <p className="text-lg max-w-2xl" style={{color: '#475569'}}>
            {t('trust_safety_subtitle', 'Your safety is our top priority. Learn how we ensure a secure and trustworthy experience for every user.')}
          </p>
        </div>
      </section>

      {/* ── TRUST POINTS ── */}
      <section className="py-16 sm:py-24" style={{backgroundColor: '#ffffff'}}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {trustPoints.map((point, index) => (
              <div key={index} className="flex gap-4 p-6 border rounded-lg" style={{backgroundColor: '#f8fafc', borderColor: '#e2e8f0'}}>
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{backgroundColor: 'var(--color-primary-tint)'}}>
                    <point.icon className="w-6 h-6" style={{color: 'var(--color-primary)'}} />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2" style={{color: '#0f172a'}}>
                    {point.title}
                  </h3>
                  <p style={{color: '#475569'}}>
                    {point.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── VERIFICATION PROCESS ── */}
      <section className="py-16 sm:py-24" style={{backgroundColor: '#f8fafc'}}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-bold mb-10" style={{color: '#0f172a', fontFamily: 'Plus Jakarta Sans, sans-serif'}}>
            {t('our_verification_process', 'Our Verification Process')}
          </h2>

          <div className="space-y-8">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{backgroundColor: 'var(--color-primary)', color: '#ffffff'}}>
                  1
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2" style={{color: '#0f172a'}}>{t('identity_verification', 'Identity Verification')}</h3>
                <p style={{color: '#475569'}}>{t('identity_verification_desc', 'Every provider must submit valid government ID proof to verify their identity.')}</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{backgroundColor: 'var(--color-primary)', color: '#ffffff'}}>
                  2
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2" style={{color: '#0f172a'}}>{t('skill_assessment', 'Skill Assessment')}</h3>
                <p style={{color: '#475569'}}>{t('skill_assessment_desc', 'Professionals undergo skill tests and provide certification for their trade.')}</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{backgroundColor: 'var(--color-primary)', color: '#ffffff'}}>
                  3
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2" style={{color: '#0f172a'}}>{t('background_check', 'Background Check')}</h3>
                <p style={{color: '#475569'}}>{t('background_check_desc', 'Comprehensive background verification including address proof and police clearance where applicable.')}</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{backgroundColor: 'var(--color-primary)', color: '#ffffff'}}>
                  4
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2" style={{color: '#0f172a'}}>{t('ongoing_monitoring', 'Ongoing Monitoring')}</h3>
                <p style={{color: '#475569'}}>{t('ongoing_monitoring_desc', 'Continuous monitoring of performance and customer feedback to maintain quality standards.')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      {!isAuthenticated && (
        <section className="py-16 sm:py-24" style={{backgroundColor: '#ffffff'}}>
          <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{color: '#0f172a', fontFamily: 'Plus Jakarta Sans, sans-serif'}}>
              {t('ready_book_confidence', 'Ready to book with confidence?')}
            </h2>
            <p className="text-lg mb-8 max-w-2xl mx-auto" style={{color: '#475569'}}>
              {t('join_thousands', 'Join thousands of customers who trust Sahaay for their service needs.')}
            </p>
            <Link to="/signup" className="inline-block px-8 py-3.5 rounded-lg font-semibold" style={{backgroundColor: 'var(--color-primary)', color: '#ffffff'}}>
              {t('get_started', 'Get Started')}
            </Link>
          </div>
        </section>
      )}
    </Layout>
  )
}

export default TrustPage
