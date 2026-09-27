import { CheckCircle, TrendingUp, Clock, Users, Shield, DollarSign, Award, Target, Zap, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import Layout from '@/components/Layout'

export default function JoinAsProviderPage() {
  const benefits = [
    {
      icon: TrendingUp,
      title: 'Grow Your Business',
      description: 'Access a steady stream of verified customers without expensive marketing or advertising costs.'
    },
    {
      icon: DollarSign,
      title: 'Better Earnings',
      description: 'Earn 40-50% more than traditional employment models with transparent, fair commission structure.'
    },
    {
      icon: Clock,
      title: 'Flexible Schedule',
      description: 'Work when you want, where you want. Complete control over your availability and service areas.'
    },
    {
      icon: Users,
      title: 'Direct Communication',
      description: 'Connect directly with customers, build relationships, and grow your reputation independently.'
    },
    {
      icon: Shield,
      title: 'Protected & Secure',
      description: 'Secure payment processing, dispute resolution support, and professional insurance coverage.'
    },
    {
      icon: Award,
      title: 'Recognition & Growth',
      description: 'Build your professional profile, earn badges, and unlock priority access as you grow.'
    }
  ]

  const eligibilityRequirements = [
    {
      category: 'Basic Requirements',
      items: [
        'Must be 18 years or older',
        'Valid government-issued ID',
        'Active mobile number and email',
        'Reliable transportation (where applicable)',
        'Fluent communication in local language'
      ]
    },
    {
      category: 'Professional Requirements',
      items: [
        '2+ years of relevant experience',
        'Relevant professional certifications',
        'Clean background check',
        'Verified work history',
        'Professional references available'
      ]
    },
    {
      category: 'Service Requirements',
      items: [
        'Proper tools and equipment',
        'Professional appearance and conduct',
        'Reliable availability (minimum 4 hours/week)',
        'Commitment to quality and punctuality',
        'Willingness to learn and improve'
      ]
    }
  ]

  const verificationSteps = [
    {
      step: 1,
      title: 'Application Submission',
      description: 'Complete detailed application with personal info, services, and experience details.',
      time: '10-15 minutes',
      icon: Target
    },
    {
      step: 2,
      title: 'Identity & Background Check',
      description: 'Government ID verification and background check for safety and trust.',
      time: '24-48 hours',
      icon: Shield
    },
    {
      step: 3,
      title: 'Skills Assessment',
      description: 'Complete hands-on skills test and verification of certifications.',
      time: '2-5 days',
      icon: Award
    },
    {
      step: 4,
      title: 'Reference Verification',
      description: 'We contact your professional references to validate experience.',
      time: '2-3 days',
      icon: Users
    },
    {
      step: 5,
      title: 'Profile Activation',
      description: 'Your profile goes live on Sahaay and you start receiving service requests.',
      time: '1-2 days',
      icon: Zap
    }
  ]

  const faqItems = [
    {
      q: 'How much commission does Sahaay take?',
      a: 'Sahaay takes a flat 15% commission on each completed service. This is significantly lower than traditional employment models or other platforms. There are no hidden fees. You receive the full payment minus the commission within 24 hours of service completion.'
    },
    {
      q: 'How do I get service requests?',
      a: 'Once your profile is verified and active, you\'ll receive service requests based on your location, service type, availability, and ratings. Customers search and filter providers, and you can accept or decline requests. You can also be booked directly by repeat customers.'
    },
    {
      q: 'What happens if a customer cancels?',
      a: 'Cancellation policies depend on timing. Cancellations within 2 hours of scheduled service may incur a 50% cancellation fee that goes to you. Cancellations beyond 2 hours have no fee. You\'re protected in all scenarios.'
    },
    {
      q: 'How are payments processed?',
      a: 'Payments are automatically processed every Wednesday to your registered bank account via direct transfer. You can track all earnings, invoices, and payment history in your dashboard. No minimum withdrawal required.'
    },
    {
      q: 'What if there\'s a dispute with a customer?',
      a: 'Sahaay has a professional dispute resolution team. We investigate all disputes fairly and protect both customers and providers. Most disputes are resolved within 24-48 hours. You can also appeal decisions.'
    },
    {
      q: 'Can I work on multiple platforms?',
      a: 'Yes, you\'re free to work on other platforms. However, we ask that you maintain good service standards and availability on Sahaay. Your schedule and availability on Sahaay are completely under your control.'
    },
    {
      q: 'What tools and equipment do I need?',
      a: 'Requirements vary by service. Most services require basic tools you likely already have. Sahaay doesn\'t provide tools, but we do offer discounts on professional equipment through our partner vendors.'
    },
    {
      q: 'How long does the verification process take?',
      a: 'The entire verification process typically takes 7-10 business days. The most variable part is the skills assessment, which depends on the service category. We prioritize applications and try to complete them faster when possible.'
    }
  ]

  const stats = [
    { number: '5000+', label: 'Active Providers' },
    { number: '100K+', label: 'Services Completed' },
    { number: '₹250cr+', label: 'Provider Earnings' },
    { number: '4.8★', label: 'Avg Provider Rating' }
  ]

  return (
    <Layout>
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-blue-50 to-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              {/* Left Content */}
              <div className="space-y-8">
                <div>
                  <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
                    Grow Your Business with Sahaay
                  </h1>
                  <p className="text-xl text-gray-600 leading-relaxed">
                    Join thousands of verified service professionals earning better income, building their brand,
                    and serving customers on their own terms.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold text-gray-900">40-50% Higher Earnings</p>
                      <p className="text-gray-600 text-sm">Fair commission with transparent pricing</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold text-gray-900">Complete Flexibility</p>
                      <p className="text-gray-600 text-sm">Control your own schedule and availability</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold text-gray-900">Verified Customers</p>
                      <p className="text-gray-600 text-sm">Safe, secure payments and customer vetting</p>
                    </div>
                  </div>
                </div>

                <Link to="/provider-onboarding" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg px-10 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all inline-flex items-center gap-2">
                  Join Sahaay <ArrowRight className="h-5 w-5" />
                </Link>
                <p className="text-gray-600 text-sm">Takes less than 15 minutes. Verification typically completes in 7-10 days.</p>
              </div>

              {/* Right Stats */}
              <div className="grid grid-cols-2 gap-6">
                {stats.map((stat, index) => (
                  <div key={index} className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 p-8 text-center">
                    <p className="text-3xl md:text-4xl font-bold text-blue-600 mb-2">{stat.number}</p>
                    <p className="text-gray-600">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Join Sahaay?</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Benefits designed to help you grow your business and achieve financial independence
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon
              return (
                <div key={index} className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 p-8 hover:shadow-md transition-all">
                  <Icon className="h-10 w-10 text-blue-600 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{benefit.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{benefit.description}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Eligibility Section */}
        <div className="bg-gray-50 border-t border-gray-200 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Who Can Join?</h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                We're looking for skilled, reliable professionals committed to quality service
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {eligibilityRequirements.map((section, index) => (
                <div key={index} className="bg-white rounded-xl border border-gray-200 p-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">{section.category}</h3>
                  <ul className="space-y-4">
                    {section.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-12 bg-blue-50 border border-blue-200 rounded-xl p-8">
              <p className="text-center text-gray-700">
                Don't meet all requirements? Don't worry! We evaluate each application individually.
                <span className="block font-semibold text-blue-600 mt-2">
                  Apply and let us review your profile.
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Verification Process */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Simple Verification Process</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Get verified and start earning in just 7-10 business days
            </p>
          </div>

          {/* Desktop Timeline */}
          <div className="hidden lg:block">
            <div className="relative">
              {/* Connecting Line */}
              <div className="absolute left-0 right-0 top-1/4 h-0.5 bg-gray-300 z-0" />

              <div className="grid grid-cols-5 gap-8 relative z-10">
                {verificationSteps.map((item, index) => {
                  const Icon = item.icon
                  return (
                    <div key={index} className="text-center">
                      {/* Step Circle */}
                      <div className="mb-6 flex justify-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                          <Icon className="h-8 w-8 text-white" />
                        </div>
                      </div>

                      {/* Step Content */}
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                      <p className="text-gray-600 text-sm mb-3">{item.description}</p>
                      <div className="bg-gray-100 rounded-lg px-3 py-1 inline-block">
                        <p className="text-xs font-medium text-gray-700">{item.time}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Mobile Timeline */}
          <div className="lg:hidden space-y-6">
            {verificationSteps.map((item, index) => {
              const Icon = item.icon
              return (
                <div key={index} className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-bold text-gray-900">Step {item.step}: {item.title}</h3>
                        <span className="bg-gray-100 rounded px-2 py-1 text-xs font-medium text-gray-700">{item.time}</span>
                      </div>
                      <p className="text-gray-600">{item.description}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* How Service Requests Work */}
        <div className="bg-gray-50 border-t border-gray-200 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">How You Get Service Requests</h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                A simple, transparent process that puts you in control
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-12">
              {/* Left - Process */}
              <div className="space-y-6">
                {[
                  {
                    number: '1',
                    title: 'Customer Searches',
                    desc: 'Customers search for services matching your expertise, location, and availability'
                  },
                  {
                    number: '2',
                    title: 'You Get Notified',
                    desc: 'You receive real-time notifications on your phone and dashboard of matching requests'
                  },
                  {
                    number: '3',
                    title: 'You Accept/Decline',
                    desc: 'Review the request details and accept only the jobs you want to take'
                  },
                  {
                    number: '4',
                    title: 'Complete & Earn',
                    desc: 'Deliver quality service and get paid automatically within 24 hours'
                  }
                ].map((item, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-lg">{item.number}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{item.title}</h3>
                      <p className="text-gray-600">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Right - Features */}
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Provider Dashboard</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      View all incoming requests in real-time
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      See customer ratings and reviews upfront
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Manage your schedule and availability
                    </li>
                  </ul>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Direct Bookings</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Regular customers can book you directly
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Build loyalty and recurring revenue
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      No extra fees for direct bookings
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Frequently Asked Questions</h2>
            <p className="text-gray-600">Common questions about joining Sahaay</p>
          </div>

          <div className="space-y-4">
            {faqItems.map((item, index) => (
              <details
                key={index}
                className="bg-white rounded-lg border border-gray-200 p-6 cursor-pointer group open:shadow-md transition-all"
              >
                <summary className="flex items-center justify-between font-semibold text-gray-900 list-none">
                  {item.q}
                  <span className="text-blue-600 ml-4 transition-transform group-open:rotate-180">
                    ▼
                  </span>
                </summary>
                <p className="text-gray-600 mt-4">{item.a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-12 md:p-16 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Grow Your Business?
            </h2>
            <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
              Join Sahaay today and start earning more with complete flexibility. The application takes just 15 minutes.
            </p>
            <Link to="/provider-onboarding" className="bg-white hover:bg-blue-50 text-blue-600 font-semibold text-lg px-10 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all inline-flex items-center gap-2">
              Join Sahaay Now <ArrowRight className="h-5 w-5" />
            </Link>
            <p className="text-blue-100 text-sm mt-6">
              Questions? <a href="#" className="underline hover:text-white">Contact our support team</a>
            </p>
          </div>
        </div>

        {/* Trust Section */}
        <div className="bg-gray-50 border-t border-gray-200 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-gray-600 mb-6">Trusted by thousands of service professionals across India</p>
            <div className="flex flex-wrap items-center justify-center gap-8 text-gray-600">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                <span>Secure Payments</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <span>Fair Treatment</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                <span>Professional Support</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
