import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from '@/components/Layout'
import { useAuth } from '@/context/AuthContext'
import {
  BoltIcon,
  WrenchIcon,
  HammerIcon,
  PaintBrushIcon,
  BroomIcon,
  TruckIcon,
  HeartIcon,
  ChipIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  StarIcon,
} from '@/components/Icons'

// Service categories with icons
const services = [
  {
    id: 'electrician',
    name: 'Electrician',
    Icon: BoltIcon,
    description: 'Fan, switch, wiring & light repairs',
    startingPrice: 199,
    color: '#D97706',
    bgColor: '#FEF3C7',
    subServices: [
      { id: 'fan_repair', name: 'Fan Repair', description: 'Ceiling & exhaust fan repair & maintenance', startingPrice: 249 },
      { id: 'switch_socket', name: 'Switch & Socket Repair', description: 'Switchboard, socket & plug repairs', startingPrice: 199 },
      { id: 'light_installation', name: 'Light Installation', description: 'Lights, LEDs & decorative lighting setup', startingPrice: 349 },
      { id: 'wiring_repair', name: 'Wiring Repair', description: 'Complete wiring & electrical repairs', startingPrice: 499 },
    ],
  },
  {
    id: 'plumber',
    name: 'Plumber',
    Icon: WrenchIcon,
    description: 'Tap, pipe, drain & bathroom plumbing',
    startingPrice: 199,
    color: '#0E7490',
    bgColor: '#ECFEFF',
    subServices: [
      { id: 'tap_repair', name: 'Tap Repair', description: 'Leaking tap, mixer & faucet fix', startingPrice: 249 },
      { id: 'pipe_leakage', name: 'Pipe Leakage', description: 'Pipe burst, leakage & waterproofing', startingPrice: 399 },
      { id: 'drain_blockage', name: 'Drain Blockage', description: 'Blocked drain & pipe cleaning', startingPrice: 299 },
      { id: 'bathroom_plumbing', name: 'Bathroom Plumbing', description: 'Complete bathroom fitments & repairs', startingPrice: 599 },
    ],
  },
  {
    id: 'carpenter',
    name: 'Carpenter',
    Icon: HammerIcon,
    description: 'Door, furniture, lock & shelf work',
    startingPrice: 299,
    color: '#475569',
    bgColor: '#F1F5F9',
    subServices: [
      { id: 'door_repair', name: 'Door Repair', description: 'Door hinge, lock & frame repairs', startingPrice: 349 },
      { id: 'furniture_repair', name: 'Furniture Repair', description: 'Wooden furniture repair & restoration', startingPrice: 499 },
      { id: 'lock_repair', name: 'Lock Repair', description: 'Lock replacement & key services', startingPrice: 299 },
      { id: 'shelf_installation', name: 'Shelf Installation', description: 'Shelves, cabinets & storage solutions', startingPrice: 449 },
    ],
  },
  {
    id: 'painter',
    name: 'Painter',
    Icon: PaintBrushIcon,
    description: 'Wall, room & exterior painting',
    startingPrice: 999,
    color: '#0E7490',
    bgColor: '#ECFEFF',
    subServices: [
      { id: 'wall_painting', name: 'Wall Painting', description: 'Interior wall painting & finishing', startingPrice: 12 },
      { id: 'room_painting', name: 'Room Painting', description: 'Complete room painting service', startingPrice: 2999 },
      { id: 'touch_up', name: 'Touch-up', description: 'Patch repairs & paint touch-ups', startingPrice: 499 },
      { id: 'exterior_painting', name: 'Exterior Painting', description: 'Outside walls & facade painting', startingPrice: 18 },
    ],
  },
  {
    id: 'cleaner',
    name: 'Cleaner',
    Icon: BroomIcon,
    description: 'Home, kitchen, bathroom & deep cleaning',
    startingPrice: 349,
    color: '#0E7490',
    bgColor: '#ECFEFF',
    subServices: [
      { id: 'home_cleaning', name: 'Home Cleaning', description: 'Regular home cleaning service', startingPrice: 349 },
      { id: 'bathroom_cleaning', name: 'Bathroom Cleaning', description: 'Deep bathroom sanitization', startingPrice: 399 },
      { id: 'kitchen_cleaning', name: 'Kitchen Cleaning', description: 'Kitchen degreasing & cleaning', startingPrice: 499 },
      { id: 'deep_cleaning', name: 'Deep Cleaning', description: 'Full home deep cleaning package', startingPrice: 1499 },
    ],
  },
  {
    id: 'driver',
    name: 'Driver',
    Icon: TruckIcon,
    description: 'Local, outstation & full-day driving',
    startingPrice: 499,
    color: '#475569',
    bgColor: '#F1F5F9',
    subServices: [
      { id: 'local_driver', name: 'Local Driver', description: 'Within city driving & errands', startingPrice: 499 },
      { id: 'outstation_driver', name: 'Outstation Driver', description: 'Long distance & intercity trips', startingPrice: 2999 },
      { id: 'full_day_driver', name: 'Full-Day Driver', description: '8-12 hour dedicated driver', startingPrice: 1499 },
    ],
  },
  {
    id: 'caregiver',
    name: 'Caregiver',
    Icon: HeartIcon,
    description: 'Elder care, patient care & daily assistance',
    startingPrice: 999,
    color: '#0E7490',
    bgColor: '#ECFEFF',
    subServices: [
      { id: 'elder_care', name: 'Elder Care', description: 'Companionship & senior care', startingPrice: 999 },
      { id: 'patient_care', name: 'Patient Care', description: 'Post-hospitalization & medical support', startingPrice: 1499 },
      { id: 'daily_assistance', name: 'Daily Assistance', description: 'Daily living & household help', startingPrice: 999 },
    ],
  },
  {
    id: 'technician',
    name: 'Technician',
    Icon: ChipIcon,
    description: 'AC, fridge, washing machine & TV repair',
    startingPrice: 349,
    color: '#0E7490',
    bgColor: '#ECFEFF',
    subServices: [
      { id: 'ac_repair', name: 'AC Repair', description: 'AC service, gas fill & repairs', startingPrice: 499 },
      { id: 'refrigerator_repair', name: 'Refrigerator Repair', description: 'Fridge cooling & repair services', startingPrice: 499 },
      { id: 'washing_machine_repair', name: 'Washing Machine Repair', description: 'Washing machine servicing', startingPrice: 499 },
      { id: 'tv_repair', name: 'TV Repair', description: 'TV screen & hardware repairs', startingPrice: 599 },
    ],
  },
]

type ServiceCategory = typeof services[0]

const CategoryCard = ({
  service,
  isSelected,
  onClick,
}: {
  service: ServiceCategory
  isSelected: boolean
  onClick: () => void
}) => {
  const Icon = service.Icon

  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col items-center p-6 rounded-card border transition-all duration-200 cursor-pointer text-left bg-white ${
        isSelected
          ? 'border-brand-500 shadow-card ring-1 ring-brand-500'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-card-hover hover:-translate-y-0.5'
      }`}
    >
      {/* Active indicator */}
      {isSelected && (
        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center shadow-sm bg-brand-500 z-10">
          <CheckCircleIcon className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Icon */}
      <div
        className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-all duration-200 ${
          isSelected ? 'scale-105' : 'group-hover:scale-105'
        }`}
        style={{ backgroundColor: service.bgColor }}
      >
        <Icon className="w-7 h-7" style={{ color: service.color }} />
      </div>

      {/* Name */}
      <h3 className={`text-lg font-bold mb-1 text-center transition-colors ${isSelected ? 'text-brand-600' : 'text-slate-900'}`}>
        {service.name}
      </h3>

      {/* Description */}
      <p className="text-sm text-center mb-4 text-slate-500 leading-relaxed">
        {service.description}
      </p>

      {/* Price */}
      <div className="mt-auto pt-4 w-full border-t border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">From</span>
            <div className="text-lg font-bold text-slate-900">₹{service.startingPrice}</div>
          </div>
          <span
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              isSelected ? 'bg-brand-50 text-brand-600' : 'bg-brand-500 text-white opacity-0 group-hover:opacity-100'
            }`}
          >
            {isSelected ? 'Selected' : 'View All'}
          </span>
        </div>
      </div>
    </button>
  )
}

const SubServiceCard = ({
  subService,
  categoryColor,
  onBook,
}: {
  subService: ServiceCategory['subServices'][0]
  categoryColor: string
  onBook: () => void
}) => {
  return (
    <div className="card card-hover p-5 flex flex-col justify-between">
      <div className="mb-4">
        <h4 className="text-base font-bold text-slate-900 mb-1">
          {subService.name}
        </h4>
        <p className="text-sm text-slate-500 leading-relaxed">
          {subService.description}
        </p>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Starts at</span>
          <div className="text-lg font-bold" style={{ color: categoryColor }}>
            ₹{subService.startingPrice}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onBook()
          }}
          className="btn-primary px-4 py-2 text-sm"
        >
          Book Now
          <ArrowRightIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

const ServicesPage = () => {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null)

  const handleBook = (categoryId: string, subServiceId: string) => {
    if (!isAuthenticated) {
      alert('Please login to book a service')
      return
    }
    navigate(`/request`)
  }

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50">
        {/* Hero Section */}
        <section className="bg-white border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-6"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {t('back_to_home', 'Back to home')}
            </Link>

            <div className="max-w-2xl">
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                {t('our_services', 'Professional Home Services')}
              </h1>
              <p className="text-lg text-slate-600 leading-relaxed max-w-xl">
                {t(
                  'services_subtitle',
                  'Book verified professionals for all your home needs. Quality service at fair prices.'
                )}
              </p>
            </div>

            {/* Stats */}
            <div className="mt-8 flex flex-wrap gap-8 sm:gap-12">
              {[
                { value: '50K+', label: 'Services Done' },
                { value: '4.8', label: 'Avg Rating' },
                { value: '2hrs', label: 'Avg Response' },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-2xl sm:text-3xl font-bold text-slate-900">{stat.value}</div>
                  <div className="text-sm font-medium text-slate-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          {selectedCategory ? (
            /* Sub-services view */
            <div>
              {/* Back & Title */}
              <div className="flex flex-wrap items-center gap-4 mb-8">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg font-semibold text-slate-500 hover:text-slate-900 hover:bg-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  All Services
                </button>
                <div className="h-6 w-px bg-slate-200 hidden sm:block" />
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: selectedCategory.bgColor }}
                  >
                    <selectedCategory.Icon className="w-5 h-5" style={{ color: selectedCategory.color }} />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                      {selectedCategory.name}
                    </h2>
                    <p className="text-sm text-slate-500">
                      {selectedCategory.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sub-services grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {selectedCategory.subServices.map((subService) => (
                  <SubServiceCard
                    key={subService.id}
                    subService={subService}
                    categoryColor={selectedCategory.color}
                    onBook={() => handleBook(selectedCategory.id, subService.id)}
                  />
                ))}
              </div>
            </div>
          ) : (
            /* Categories grid */
            <div>
              <div className="text-center mb-10">
                <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-slate-900">
                  {t('what_you_need', 'What do you need today?')}
                </h2>
                <p className="text-lg max-w-xl mx-auto text-slate-500">
                  {t('choose_category', 'Select a category to see available services and prices')}
                </p>
              </div>

              {/* 8 Category Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {services.map((service) => (
                  <CategoryCard
                    key={service.id}
                    service={service}
                    isSelected={false}
                    onClick={() => setSelectedCategory(service)}
                  />
                ))}
              </div>

              {/* Trust indicators */}
              <div className="mt-12 card p-6 sm:p-8">
                <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
                  {[
                    { icon: '✓', text: 'Verified Professionals' },
                    { icon: '🛡️', text: 'Quality Guarantee' },
                    { icon: '⚡', text: 'Same-Day Service' },
                    { icon: '💬', text: '24/7 Support' },
                  ].map((item) => (
                    <div key={item.text} className="flex items-center gap-2.5">
                      <span className="text-lg">{item.icon}</span>
                      <span className="text-sm font-medium text-slate-600">
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* CTA Section */}
        {!isAuthenticated && (
          <section className="py-16 bg-white border-t border-slate-200">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
              <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-slate-900">
                {t('need_something_specific', 'Need something specific?')}
              </h2>
              <p className="text-lg mb-8 max-w-xl mx-auto text-slate-500">
                {t('cant_find_service', "Can't find what you're looking for? Let us know and we'll help.")}
              </p>
              <button className="btn-primary px-8 py-3.5 text-base">
                {t('request_service_btn', 'Request a Service')}
              </button>
            </div>
          </section>
        )}

        {/* Footer spacing */}
        <div className="h-16" />
      </div>
    </Layout>
  )
}

export default ServicesPage
