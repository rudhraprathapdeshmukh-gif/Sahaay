import React, { useState } from 'react';
import { Search, User, Clock, CheckCircle, Star, Shield, DollarSign, Users, Calendar, MapPin, MessageSquare, Phone, CreditCard, Award } from 'lucide-react';

export default function HowItWorksPage() {
  const [activeFlow, setActiveFlow] = useState('customer');

  const customerSteps = [
    {
      number: '01',
      icon: Search,
      title: 'Search Service',
      description: 'Find the service you need using our search or browse categories',
      details: [
        'Browse 50+ service categories',
        'Search by specific need or location',
        'View provider ratings and pricing',
        'Check real-time availability'
      ],
      color: 'blue'
    },
    {
      number: '02',
      icon: Users,
      title: 'Choose Provider',
      description: 'Compare verified professionals and select the best match',
      details: [
        'Compare multiple providers side-by-side',
        'View detailed profiles and portfolios',
        'Check certifications and background',
        'Read authentic customer reviews'
      ],
      color: 'green'
    },
    {
      number: '03',
      icon: Calendar,
      title: 'Request Service',
      description: 'Schedule appointment and provide service details',
      details: [
        'Select preferred date and time',
        'Describe specific requirements',
        'Add location and contact details',
        'Receive instant booking confirmation'
      ],
      color: 'purple'
    },
    {
      number: '04',
      icon: CheckCircle,
      title: 'Complete Job',
      description: 'Professional service delivery with quality assurance',
      details: [
        'Provider arrives at scheduled time',
        'Transparent work process',
        'Real-time progress updates',
        'Quality check before completion'
      ],
      color: 'amber'
    },
    {
      number: '05',
      icon: Star,
      title: 'Review & Payment',
      description: 'Secure payment and share feedback for the community',
      details: [
        'Secure in-app payment processing',
        'Leave detailed feedback',
        'Rate service quality',
        'Receipt and service guarantee'
      ],
      color: 'red'
    }
  ];

  const providerSteps = [
    {
      number: '01',
      icon: User,
      title: 'Apply & Verify',
      description: 'Complete application and verification process',
      details: [
        'Submit professional details',
        'Background check verification',
        'Skill assessment test',
        'Certification validation'
      ],
      color: 'blue'
    },
    {
      number: '02',
      icon: Shield,
      title: 'Profile Setup',
      description: 'Create comprehensive service profile',
      details: [
        'Upload portfolio and certifications',
        'Set service areas and pricing',
        'Define availability calendar',
        'Configure service specialties'
      ],
      color: 'green'
    },
    {
      number: '03',
      icon: MessageSquare,
      title: 'Receive Requests',
      description: 'Get matched with customer requests',
      details: [
        'Real-time service notifications',
        'View customer requirements',
        'Accept or decline requests',
        'Direct messaging with customers'
      ],
      color: 'purple'
    },
    {
      number: '04',
      icon: Clock,
      title: 'Deliver Service',
      description: 'Professional service execution',
      details: [
        'Schedule management tools',
        'Route optimization',
        'In-app check-in system',
        'Service documentation tools'
      ],
      color: 'amber'
    },
    {
      number: '05',
      icon: DollarSign,
      title: 'Get Paid & Grow',
      description: 'Secure payment and reputation building',
      details: [
        'Automatic weekly payments',
        'Review and rating system',
        'Performance analytics',
        'Priority request access'
      ],
      color: 'red'
    }
  ];

  const currentSteps = activeFlow === 'customer' ? customerSteps : providerSteps;

  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    amber: 'from-amber-500 to-amber-600',
    red: 'from-red-500 to-red-600'
  };

  const colorBgClasses = {
    blue: 'bg-blue-50',
    green: 'bg-green-50',
    purple: 'bg-purple-50',
    amber: 'bg-amber-50',
    red: 'bg-red-50'
  };

  const customerBenefits = [
    { icon: MapPin, title: 'Local Professionals', desc: 'Verified providers in your area' },
    { icon: DollarSign, title: 'Transparent Pricing', desc: 'No hidden fees or surprises' },
    { icon: Shield, title: 'Service Guarantee', desc: 'Quality assurance on every job' },
    { icon: Clock, title: 'Quick Response', desc: 'Average 30-minute response time' }
  ];

  const providerBenefits = [
    { icon: User, title: 'Flexible Schedule', desc: 'Choose when and where to work' },
    { icon: DollarSign, title: 'Fair Earnings', desc: 'Higher income than traditional models' },
    { icon: Award, title: 'Reputation Building', desc: 'Grow your professional profile' },
    { icon: Phone, title: 'Direct Communication', desc: 'Connect directly with customers' }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-gray-50 to-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="text-center space-y-6">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
              How Sahaay works
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              A simple, transparent process connecting customers with trusted local service providers.
              Five steps to get any job done.
            </p>
          </div>
        </div>
      </div>

      {/* Flow Selector */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-gray-900">Choose your journey</h2>
            <p className="text-gray-600">Select how you want to use Sahaay</p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setActiveFlow('customer')}
              className={`px-8 py-4 rounded-lg font-medium transition-all ${
                activeFlow === 'customer'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              For Customers
            </button>
            <button
              onClick={() => setActiveFlow('provider')}
              className={`px-8 py-4 rounded-lg font-medium transition-all ${
                activeFlow === 'provider'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              For Service Providers
            </button>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid md:grid-cols-4 gap-6">
          {(activeFlow === 'customer' ? customerBenefits : providerBenefits).map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div key={index} className="bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200 p-6">
                <Icon className="h-8 w-8 text-blue-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                <p className="text-gray-600 text-sm">{benefit.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Process Steps */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Desktop Steps (Horizontal) */}
        <div className="hidden lg:block">
          <div className="relative">
            {/* Connecting Line */}
            <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-gray-300 -translate-y-1/2 z-0" />

            <div className="grid grid-cols-5 gap-8 relative z-10">
              {currentSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={index} className={`relative ${colorBgClasses[step.color]} rounded-2xl border border-gray-200 p-8 text-center group hover:shadow-lg transition-all`}>
                    {/* Step Number Badge */}
                    <div className={`absolute -top-5 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-gradient-to-br ${colorClasses[step.color]} flex items-center justify-center`}>
                      <span className="text-white font-bold text-lg">{step.number}</span>
                    </div>

                    {/* Step Icon */}
                    <div className={`mb-6 p-4 rounded-full bg-white inline-flex items-center justify-center`}>
                      <Icon className="h-12 w-12 text-gray-700" />
                    </div>

                    {/* Step Title */}
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>

                    {/* Step Description */}
                    <p className="text-gray-600 mb-6">{step.description}</p>

                    {/* Step Details */}
                    <div className="space-y-2 text-left">
                      {step.details.map((detail, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>{detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mobile Steps (Vertical) */}
        <div className="lg:hidden">
          <div className="space-y-8">
            {currentSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className={`relative ${colorBgClasses[step.color]} rounded-2xl border border-gray-200 p-6`}>
                  {/* Step Header */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${colorClasses[step.color]} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-white font-bold">{step.number}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <Icon className="h-6 w-6 text-gray-700" />
                        <h3 className="text-xl font-bold text-gray-900">{step.title}</h3>
                      </div>
                      <p className="text-gray-600">{step.description}</p>
                    </div>
                  </div>

                  {/* Step Details */}
                  <div className="space-y-2 pl-4 border-l border-gray-300">
                    {step.details.map((detail, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>{detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Key Features */}
      <div className="bg-gray-50 border-t border-gray-200 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why choose Sahaay {activeFlow === 'customer' ? 'as a customer' : 'as a provider'}
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Shield,
                title: 'Verified & Safe',
                description: 'Every provider is background-checked and certified. All transactions are secure and protected.'
              },
              {
                icon: Clock,
                title: 'Time Efficient',
                description: 'Quick response times and efficient matching reduce waiting and save time for everyone.'
              },
              {
                icon: DollarSign,
                title: 'Cost Effective',
                description: 'Competitive pricing with transparent costs. No hidden fees or surprise charges.'
              }
            ].map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="bg-white rounded-lg border border-gray-200 p-8">
                  <Icon className="h-10 w-10 text-blue-600 mb-6" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {activeFlow === 'customer' ? 'Customer' : 'Provider'} FAQs
          </h2>
          <p className="text-gray-600">Common questions about the Sahaay process</p>
        </div>

        <div className="space-y-4">
          {activeFlow === 'customer' ? [
            {
              q: 'How quickly will I get a response to my service request?',
              a: 'Most service requests receive responses within 30 minutes. You can filter providers by response time to find the fastest options.'
            },
            {
              q: 'What happens if I\'m not satisfied with the service?',
              a: 'We offer a satisfaction guarantee. If you\'re unsatisfied, contact our support team within 24 hours for a refund or re-service.'
            },
            {
              q: 'Can I schedule services in advance?',
              a: 'Yes, you can schedule services up to 30 days in advance. Providers will confirm their availability for the requested time slot.'
            },
            {
              q: 'How are service providers vetted on Sahaay?',
              a: 'All providers undergo background checks, identity verification, skill assessments, and reference checks before joining our platform.'
            }
          ] : [
            {
              q: 'How long does the application process take?',
              a: 'The verification process typically takes 3-5 business days after submitting all required documents and completing skill assessments.'
            },
            {
              q: 'How do I get paid for completed services?',
              a: 'Payments are automatically processed weekly via direct bank transfer. You can track earnings and payment status in your provider dashboard.'
            },
            {
              q: 'Can I set my own pricing and schedule?',
              a: 'Yes, you have full control over your pricing, service areas, and availability schedule. You can update these settings anytime.'
            },
            {
              q: 'How are customers matched with my services?',
              a: 'Customers find providers based on location, service type, availability, ratings, and pricing. You can also receive direct requests from customers.'
            }
          ].map((item, index) => (
            <details key={index} className="bg-white rounded-lg border border-gray-200 p-6">
              <summary className="flex items-center justify-between cursor-pointer font-semibold text-gray-900">
                {item.q}
                <span className="text-blue-600 ml-4">+</span>
              </summary>
              <p className="text-gray-600 mt-4">{item.a}</p>
            </details>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-12 md:p-16 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to {activeFlow === 'customer' ? 'get started' : 'join as a provider'}?
          </h2>
          <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
            {activeFlow === 'customer'
              ? 'Find trusted local service providers in minutes. Quality work, transparent pricing, complete peace of mind.'
              : 'Grow your business with Sahaay. Get more customers, fair earnings, and complete schedule control.'}
          </p>
          <button className="bg-white hover:bg-blue-50 text-blue-600 font-semibold px-8 py-4 rounded-lg transition-colors shadow-lg hover:shadow-xl">
            {activeFlow === 'customer' ? 'Find a Service' : 'Apply as Provider'}
          </button>
        </div>
      </div>
    </div>
  );
}
