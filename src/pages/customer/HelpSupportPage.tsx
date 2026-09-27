import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import DashboardLayout from '@/components/DashboardLayout'
import {
  ChevronRightIcon,
  SearchIcon,
  PhoneIcon,
  MailIcon,
  HelpCircleIcon,
  ClockIcon,
  ShieldCheckIcon,
  WrenchIcon,
  StarIcon,
  CalendarIcon,
} from '@/components/Icons'

interface FaqItem {
  question: string
  answer: string
  category: string
}

const FAQ_DATA: FaqItem[] = [
  // General
  {
    question: 'What is Sahaay?',
    answer: 'Sahaay is a hyperlocal home services platform that connects you with verified professionals like electricians, plumbers, carpenters, painters, and more — all based on real-time GPS proximity so you find trusted help nearby.',
    category: 'general',
  },
  {
    question: 'Is Sahaay free to use?',
    answer: 'Yes, searching and browsing providers on Sahaay is completely free. You only pay for the services you book, with no hidden middleman fees.',
    category: 'general',
  },
  {
    question: 'In which cities is Sahaay available?',
    answer: 'Sahaay is expanding across India. Currently live in several cities and towns — search for providers in your area to check availability.',
    category: 'general',
  },

  // How It Works
  {
    question: 'How do I book a service?',
    answer: '1) Search for the service you need (e.g. "fan repair" or "plumber"). 2) Browse verified providers near you with ratings and distance. 3) Click "Book" on a provider and fill in your preferred date, time, and address. 4) The provider confirms — you get real-time status updates.',
    category: 'how-it-works',
  },
  {
    question: 'How does GPS matching work?',
    answer: 'Sahaay uses your device\'s real-time GPS location to calculate the exact distance to each verified provider. Providers within 7 km are shown first (no extra travel charge). If none are nearby, providers up to 15 km are displayed with a travel surcharge clearly shown before booking.',
    category: 'how-it-works',
  },
  {
    question: 'How do I search for a service?',
    answer: 'Use the search bar on the homepage. You can type a service name (e.g. "electrician") or a keyword (e.g. "bulb fitting", "fan repair", "tap leak"). Smart suggestions appear as you type to help you find what you need faster.',
    category: 'how-it-works',
  },
  {
    question: 'Can I schedule a service for later?',
    answer: 'Yes. When booking, you can choose your preferred date and time. The provider receives the request and confirms availability. You\'ll be notified once it\'s confirmed.',
    category: 'how-it-works',
  },

  // Bookings & Payments
  {
    question: 'How many active bookings can I have?',
    answer: 'You can have a maximum of 2 active service bookings at any time. You\'ll need to complete or cancel an existing booking before starting a new one.',
    category: 'bookings',
  },
  {
    question: 'How do I pay for a service?',
    answer: 'Payment is handled directly with the provider after the service is completed. Sahaay ensures transparent pricing — any extra travel charges beyond 7 km are shown upfront before you confirm the booking.',
    category: 'bookings',
  },
  {
    question: 'Can I cancel a booking?',
    answer: 'Yes, you can cancel a pending or confirmed booking from your "My Bookings" page. Cancellation before the scheduled time is free. If the provider has already started travelling, a small cancellation fee may apply.',
    category: 'bookings',
  },
  {
    question: 'What if the provider doesn\'t show up?',
    answer: 'In the rare case a provider doesn\'t arrive, you can report the issue from your booking history. Our support team will investigate and may offer a rebooking at no extra cost or a full refund of any advance paid.',
    category: 'bookings',
  },

  // Providers
  {
    question: 'How are providers verified?',
    answer: 'Every provider undergoes a multi-step verification: Aadhaar/ID verification, background check, skill assessment, and review of past work history. Only providers who pass all checks are marked "Verified" on the platform.',
    category: 'providers',
  },
  {
    question: 'How do ratings and reviews work?',
    answer: 'After a service is completed, you can rate the provider from 1 to 5 stars and leave a written review. These reviews are visible to other customers and help maintain quality across the platform.',
    category: 'providers',
  },
  {
    question: 'Can I choose the same provider again?',
    answer: 'Yes! If you had a good experience, you can book the same provider again from your booking history or by searching for them on the homepage.',
    category: 'providers',
  },

  // Account & Support
  {
    question: 'How do I update my profile information?',
    answer: 'Go to Profile from the top-right corner of the header or the sidebar. You can update your full name and phone number. Your email address cannot be changed after registration.',
    category: 'account',
  },
  {
    question: 'How do I contact customer support?',
    answer: 'You can reach us 24/7:\n📞 Phone: 1800-000-000 (toll-free)\n📧 Email: support@sahaay.in\nOr use the Help & Support section in your profile sidebar.',
    category: 'account',
  },
  {
    question: 'Is my personal data safe?',
    answer: 'Absolutely. Sahaay uses Supabase with Row Level Security (RLS) to ensure your data is encrypted and accessible only to you. We never share personal information with third parties without your consent.',
    category: 'account',
  },
]

const CATEGORIES = [
  { key: 'all', label: 'All Questions', icon: HelpCircleIcon },
  { key: 'general', label: 'General', icon: HelpCircleIcon },
  { key: 'how-it-works', label: 'How It Works', icon: WrenchIcon },
  { key: 'bookings', label: 'Bookings & Payments', icon: CalendarIcon },
  { key: 'providers', label: 'Providers & Reviews', icon: StarIcon },
  { key: 'account', label: 'Account & Support', icon: ShieldCheckIcon },
]

const HelpSupportPage = () => {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const filteredFaq = FAQ_DATA.filter((item) => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory
    const q = searchQuery.toLowerCase().trim()
    const matchesSearch = !q || item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q)
    return matchesCategory && matchesSearch
  })

  return (
    <DashboardLayout
      role="customer"
      pageTitle={t('help_support', 'Help & Support')}
      pageSubtitle={t('help_support_sub', 'Find answers or get in touch with our team')}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Search */}
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('search_faq', 'Search your question...')}
            className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 shadow-sm"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon
            const isActive = activeCategory === cat.key
            return (
              <button
                key={cat.key}
                onClick={() => { setActiveCategory(cat.key); setOpenIndex(null) }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all border ${
                  isActive
                    ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300 hover:text-teal-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                {cat.label}
              </button>
            )
          })}
        </div>

        {/* FAQ List */}
        <div className="space-y-3">
          {filteredFaq.length > 0 ? (
            filteredFaq.map((item, idx) => {
              const isOpen = openIndex === idx
              return (
                <div
                  key={idx}
                  className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                  >
                    <span className="text-sm font-bold text-slate-900">{item.question}</span>
                    <ChevronRightIcon
                      className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 pt-0">
                      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{item.answer}</p>
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <SearchIcon className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-700 mb-1">No matching questions found</p>
              <p className="text-xs text-slate-500">Try a different search term or browse categories above</p>
            </div>
          )}
        </div>

        {/* Contact Cards */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
            {t('still_need_help', "Still need help? Contact us")}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <a
              href="tel:+911800000000"
              className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 hover:bg-teal-50 transition-colors group"
            >
              <span className="w-10 h-10 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center flex-shrink-0 group-hover:bg-teal-200 transition-colors">
                <PhoneIcon className="w-5 h-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-900">{t('support_phone', 'Call Support')}</p>
                <p className="text-[11px] text-slate-500">1800-000-000</p>
                <p className="text-[11px] text-teal-600 font-medium flex items-center gap-1"><ClockIcon className="w-3 h-3" /> 24/7</p>
              </div>
            </a>

            <a
              href="mailto:support@sahaay.in"
              className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 hover:bg-teal-50 transition-colors group"
            >
              <span className="w-10 h-10 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center flex-shrink-0 group-hover:bg-teal-200 transition-colors">
                <MailIcon className="w-5 h-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-900">{t('support_email', 'Email Support')}</p>
                <p className="text-[11px] text-slate-500">support@sahaay.in</p>
                <p className="text-[11px] text-teal-600 font-medium">{t('response_24h', 'Reply within 24h')}</p>
              </div>
            </a>

            <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50">
              <span className="w-10 h-10 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center flex-shrink-0">
                <HelpCircleIcon className="w-5 h-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-900">{t('live_chat', 'Live Chat')}</p>
                <p className="text-[11px] text-slate-500">{t('coming_soon', 'Coming soon')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default HelpSupportPage