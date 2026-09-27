import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from '@/components/Layout'
import { SearchIcon, CheckCircleIcon, ClipboardIcon, StarIcon } from '@/components/Icons'
import { useAuth } from '@/context/AuthContext'

const HowItWorksPage = () => {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const steps = [
    {
      number: '1',
      title: t('step1_title', 'Search for a service'),
      description: t('step1_desc', 'Browse through our wide range of services or search for exactly what you need.'),
      icon: SearchIcon,
    },
    {
      number: '2',
      title: t('step2_title', 'Find verified professionals'),
      description: t('step2_desc', 'View profiles, reviews, and ratings from real customers to choose the best fit.'),
      icon: StarIcon,
    },
    {
      number: '3',
      title: t('step3_title', 'Book instantly'),
      description: t('step3_desc', 'Schedule your service at a time that works best for you with just a few clicks.'),
      icon: ClipboardIcon,
    },
    {
      number: '4',
      title: t('step4_title', 'Pay securely'),
      description: t('step4_desc', 'Complete payment through our secure platform with multiple payment options.'),
      icon: CheckCircleIcon,
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
            {t('how_sahaay_works', 'How Sahaay Works')}
          </h1>
          <p className="text-lg max-w-2xl" style={{color: '#475569'}}>
            {t('how_it_works_subtitle', 'Booking trusted services has never been easier. Follow these simple steps to get started.')}
          </p>
        </div>
      </section>

      {/* ── STEPS ── */}
      <section className="py-16 sm:py-24" style={{backgroundColor: '#ffffff'}}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="flex gap-6">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-lg" style={{backgroundColor: 'var(--color-primary-tint)'}}>
                    <span className="text-lg font-bold" style={{color: 'var(--color-primary)'}}>{step.number}</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2" style={{color: '#0f172a'}}>
                    {step.title}
                  </h3>
                  <p style={{color: '#475569'}}>
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY US ── */}
      <section className="py-16 sm:py-24" style={{backgroundColor: '#f8fafc'}}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-bold mb-10 text-center" style={{color: '#0f172a', fontFamily: 'Plus Jakarta Sans, sans-serif'}}>
            {t('why_choose_sahaay', 'Why Choose Sahaay')}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-6 border rounded-lg" style={{backgroundColor: '#ffffff', borderColor: '#e2e8f0'}}>
              <h3 className="font-semibold mb-3 text-lg" style={{color: '#0f172a'}}>{t('background_verified', 'Verified Professionals')}</h3>
              <p className="text-sm" style={{color: '#475569'}}>{t('verified_professionals_desc', 'Every service provider on Sahaay is background checked and verified to ensure your safety and satisfaction.')}</p>
            </div>
            <div className="p-6 border rounded-lg" style={{backgroundColor: '#ffffff', borderColor: '#e2e8f0'}}>
              <h3 className="font-semibold mb-3 text-lg" style={{color: '#0f172a'}}>{t('real_reviews', 'Real Reviews')}</h3>
              <p className="text-sm" style={{color: '#475569'}}>{t('real_reviews_desc', 'Ratings and reviews from real customers help you make informed decisions about which professional to hire.')}</p>
            </div>
            <div className="p-6 border rounded-lg" style={{backgroundColor: '#ffffff', borderColor: '#e2e8f0'}}>
              <h3 className="font-semibold mb-3 text-lg" style={{color: '#0f172a'}}>{t('fair_prices', 'Fair Prices')}</h3>
              <p className="text-sm" style={{color: '#475569'}}>{t('fair_prices_desc', "Transparent pricing with no hidden charges. You know exactly what you'll pay before booking.")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      {!isAuthenticated && (
        <section className="py-16 sm:py-24" style={{backgroundColor: '#ffffff'}}>
          <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{color: '#0f172a', fontFamily: 'Plus Jakarta Sans, sans-serif'}}>
              {t('ready_to_get_started', 'Ready to get started?')}
            </h2>
            <p className="text-lg mb-8 max-w-2xl mx-auto" style={{color: '#475569'}}>
              {t('book_first_service', 'Book your first service today and experience the Sahaay difference.')}
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

export default HowItWorksPage
