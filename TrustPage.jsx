import React, { useState } from 'react';
import { CheckCircle, Shield, Users, DollarSign, Lock, Star, Award, Zap } from 'lucide-react';

export default function TrustPage() {
  const [activeTab, setActiveTab] = useState('workers');

  const trustPillars = [
    {
      id: 'workers',
      icon: CheckCircle,
      title: 'Verified Workers',
      shortDesc: 'Every professional is vetted',
      fullDesc: 'All service providers on Sahaay undergo comprehensive background checks, identity verification, and skill assessment. We verify work history and conduct reference checks to ensure only qualified professionals join our platform.',
      features: [
        'Background verification for all workers',
        'Government ID authentication',
        'Work history validation',
        'Reference checks from previous clients',
        'Ongoing compliance monitoring'
      ],
      color: 'blue'
    },
    {
      id: 'cooperative',
      icon: Users,
      title: 'Cooperative Membership',
      shortDesc: 'Supporting worker communities',
      fullDesc: 'Sahaay operates as a worker cooperative, ensuring fair treatment and equitable benefits. Workers have a voice in platform decisions and share in the success of the business.',
      features: [
        'Fair commission structure',
        'Worker ownership stake',
        'Transparent fee breakdown',
        'Community decision-making',
        'Profit sharing model'
      ],
      color: 'green'
    },
    {
      id: 'skills',
      icon: Award,
      title: 'Skill Verification',
      shortDesc: 'Certified expertise',
      fullDesc: 'We verify professional certifications and conduct skill assessments for each service category. Workers must demonstrate proficiency before appearing on Sahaay.',
      features: [
        'Professional certification checks',
        'Hands-on skill assessment',
        'Category-specific qualifications',
        'Periodic competency reviews',
        'Specialized training validation'
      ],
      color: 'purple'
    },
    {
      id: 'pricing',
      icon: DollarSign,
      title: 'Transparent Pricing',
      shortDesc: 'No hidden charges',
      fullDesc: 'All pricing is upfront and transparent. You see exactly what you\'ll pay before booking. No surprise fees or hidden charges ever.',
      features: [
        'Fixed upfront pricing',
        'Detailed cost breakdown',
        'No hidden platform fees',
        'Price comparison tools',
        'Money-back guarantee'
      ],
      color: 'amber'
    },
    {
      id: 'security',
      icon: Lock,
      title: 'Secure Service Requests',
      shortDesc: 'Your data is protected',
      fullDesc: 'Industry-leading encryption and security protocols protect your personal information and payment details. We comply with all data protection regulations.',
      features: [
        'End-to-end encrypted messaging',
        'Secure payment processing',
        'Data encryption at rest',
        'GDPR & compliance compliant',
        'Regular security audits'
      ],
      color: 'red'
    },
    {
      id: 'reviews',
      icon: Star,
      title: 'Customer Reviews',
      shortDesc: 'Authentic feedback system',
      fullDesc: 'Real, verified reviews from actual customers. We moderate for authenticity and prevent fake ratings to give you honest insights.',
      features: [
        'Verified purchase reviews only',
        'Rating authenticity checks',
        'Response from service providers',
        'Photo/video review support',
        'Community rating influence'
      ],
      color: 'yellow'
    }
  ];

  const stats = [
    { number: '100K+', label: 'Service Requests Completed', icon: Zap },
    { number: '500+', label: 'Verified Service Providers', icon: CheckCircle },
    { number: '4.8★', label: 'Average Rating', icon: Star },
    { number: '99.2%', label: 'Customer Satisfaction', icon: Shield }
  ];

  const currentPillar = trustPillars.find(p => p.id === activeTab);
  const CurrentIcon = currentPillar?.icon;

  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    amber: 'from-amber-500 to-amber-600',
    red: 'from-red-500 to-red-600',
    yellow: 'from-yellow-500 to-yellow-600'
  };

  const colorBgClasses = {
    blue: 'bg-blue-50',
    green: 'bg-green-50',
    purple: 'bg-purple-50',
    amber: 'bg-amber-50',
    red: 'bg-red-50',
    yellow: 'bg-yellow-50'
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-gray-50 to-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full">
              <Shield className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-600">Trust & Safety</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
              Trust is our foundation
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Sahaay is built on transparency, security, and fair practices. We verify every
              professional and protect every customer to create a trustworthy marketplace.
            </p>
          </div>
        </div>
      </div>

      {/* Trust Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200 p-6 text-center">
                <Icon className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                <p className="text-3xl md:text-4xl font-bold text-gray-900">{stat.number}</p>
                <p className="text-sm text-gray-600 mt-2">{stat.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Six Pillars of Trust */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Six Pillars of Trust</h2>
          <p className="text-lg text-gray-600">How we build and maintain trust on Sahaay</p>
        </div>

        {/* Pillar Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-12">
          {trustPillars.map((pillar) => {
            const Icon = pillar.icon;
            const isActive = activeTab === pillar.id;
            return (
              <button
                key={pillar.id}
                onClick={() => setActiveTab(pillar.id)}
                className={`p-4 rounded-lg transition-all text-left ${
                  isActive
                    ? `bg-gradient-to-br ${colorClasses[pillar.color]} text-white shadow-lg`
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <Icon className="h-6 w-6 mb-2" />
                <p className="font-semibold text-sm">{pillar.title}</p>
              </button>
            );
          })}
        </div>

        {/* Pillar Detail */}
        {currentPillar && (
          <div className={`${colorBgClasses[currentPillar.color]} rounded-2xl border border-gray-200 p-8 md:p-12`}>
            <div className="grid md:grid-cols-2 gap-12 items-start">
              {/* Left - Description */}
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className={`bg-gradient-to-br ${colorClasses[currentPillar.color]} rounded-lg p-3 flex-shrink-0`}>
                    <CurrentIcon className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold text-gray-900">{currentPillar.title}</h3>
                    <p className="text-gray-600 mt-2">{currentPillar.shortDesc}</p>
                  </div>
                </div>
                <p className="text-lg text-gray-700 leading-relaxed">
                  {currentPillar.fullDesc}
                </p>
              </div>

              {/* Right - Features */}
              <div className="space-y-3">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Key Features</h4>
                {currentPillar.features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3 bg-white rounded-lg p-3">
                    <div className={`bg-gradient-to-br ${colorClasses[currentPillar.color]} rounded-full p-1 flex-shrink-0 mt-1`}>
                      <CheckCircle className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* How We Verify Section */}
      <div className="bg-gray-50 border-t border-gray-200 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Verification Process</h2>
            <p className="text-lg text-gray-600">Every service provider goes through rigorous checks</p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                step: '01',
                title: 'Identity Verification',
                desc: 'Government-issued ID and background check'
              },
              {
                step: '02',
                title: 'Skill Assessment',
                desc: 'Hands-on testing and certification review'
              },
              {
                step: '03',
                title: 'Reference Check',
                desc: 'Verification from previous clients'
              },
              {
                step: '04',
                title: 'Ongoing Monitoring',
                desc: 'Regular compliance and rating reviews'
              }
            ].map((item, index) => (
              <div key={index} className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <div className="text-4xl font-bold text-blue-600 mb-4">{item.step}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Customer Protection Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">We Protect You</h2>
          <p className="text-lg text-gray-600">Multiple layers of protection for every booking</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: Lock,
              title: 'Secure Payments',
              items: [
                'Multiple payment methods',
                'Encrypted transactions',
                'Money-back guarantee',
                'Fraud protection'
              ]
            },
            {
              icon: Shield,
              title: 'Service Guarantee',
              items: [
                'Quality assurance checks',
                'Customer satisfaction guarantee',
                'Dispute resolution support',
                'Service insurance coverage'
              ]
            },
            {
              icon: Users,
              title: 'Community Standards',
              items: [
                'Code of conduct enforcement',
                'Rating transparency',
                'Review authenticity checks',
                'Quick action on violations'
              ]
            }
          ].map((section, index) => {
            const Icon = section.icon;
            return (
              <div key={index} className="bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200 p-8">
                <Icon className="h-10 w-10 text-blue-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-4">{section.title}</h3>
                <ul className="space-y-3">
                  {section.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-gray-700">
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-gray-50 border-t border-gray-200 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: 'How are service providers verified?',
                a: 'All providers undergo background checks, identity verification, skill assessment, and reference checks. We also conduct ongoing monitoring to ensure quality standards.'
              },
              {
                q: 'What happens if I\'m not satisfied with the service?',
                a: 'If you\'re unsatisfied, we offer a full refund within 24 hours. We also have a dispute resolution team to help address any issues.'
              },
              {
                q: 'How is my payment information protected?',
                a: 'We use industry-leading encryption and comply with PCI DSS standards. Your payment details are never shared with service providers.'
              },
              {
                q: 'Can I trust the reviews on Sahaay?',
                a: 'Yes. We only display reviews from verified customers who have completed services. We moderate for authenticity and prevent fake ratings.'
              },
              {
                q: 'What if a provider doesn\'t show up?',
                a: 'If a provider cancels or doesn\'t show, you get a full refund immediately. We also block providers who repeatedly fail to show.'
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
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-12 md:p-16 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Join thousands who trust Sahaay
          </h2>
          <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
            Experience reliable, verified local services with complete peace of mind
          </p>
          <button className="bg-white hover:bg-blue-50 text-blue-600 font-semibold px-8 py-4 rounded-lg transition-colors shadow-lg hover:shadow-xl">
            Get Started Today
          </button>
        </div>
      </div>
    </div>
  );
}
