import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from '@/components/Layout'
import { ShieldIcon, LockIcon, EyeIcon, UserIcon } from '@/components/Icons'

const PrivacyPage = () => {
  const { t } = useTranslation()

  const sections = [
    {
      icon: UserIcon,
      title: 'Information We Collect',
      content: `We collect information you provide directly to us, including:
• Account information (name, email, phone number)
• Profile information (profile photo, address, location)
• Service request details (problem description, scheduling preferences)
• Payment information (processed through secure third-party providers)
• Communication data (chat messages, customer support interactions)

We also automatically collect:
• Device information (device type, operating system, browser)
• Location data (GPS coordinates for service matching)
• Usage data (app interactions, service history)
• Communication data (notifications, preferences)`,
    },
    {
      icon: EyeIcon,
      title: 'How We Use Your Information',
      content: `We use the information we collect to:
• Provide, maintain, and improve our services
• Process transactions and send related information
• Match customers with nearby service providers
• Send technical notices, updates, and support messages
• Respond to your comments, questions, and requests
• Communicate with you about products, services, and events
• Monitor and analyze trends, usage, and activities
• Detect, investigate, and prevent fraudulent transactions
• Enforce our terms, conditions, and policies`,
    },
    {
      icon: ShieldIcon,
      title: 'Information Sharing & Disclosure',
      content: `We may share your information in the following circumstances:

With Service Providers: When you book a service, we share relevant details (name, phone, service address, problem description) with the assigned provider.

With Third-Party Service Providers: We share information with vendors who perform services on our behalf (payment processing, customer support, analytics).

For Legal Reasons: We may disclose information if required by law, regulation, or legal process, or to enforce our terms and policies.

Business Transfers: Information may be transferred as part of a merger, acquisition, or sale of company assets.

Aggregated/Anonymous Data: We may share anonymized, aggregated data that cannot identify you.`,
    },
    {
      icon: LockIcon,
      title: 'Data Security',
      content: `We implement appropriate technical and organizational measures to protect your personal information, including:
• Encryption of sensitive data during transmission
• Secure storage of personal information
• Regular security assessments and updates
• Access controls limiting employee access to personal data
• Secure payment processing through certified providers

While we strive to protect your personal information, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security.`,
    },
  ]

  const yourRights = [
    'Access your personal information',
    'Correct inaccurate or incomplete data',
    'Request deletion of your personal information',
    'Opt-out of marketing communications',
    'Control location sharing preferences',
    'Request data portability',
    'Object to certain processing activities',
  ]

  return (
    <Layout>
      {/* ── HERO ── */}
      <section style={{backgroundColor: '#f8fafc'}}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <Link to="/" className="text-sm font-medium mb-6 inline-flex items-center gap-1" style={{color: 'var(--color-primary)'}}>
            ← Back to home
          </Link>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4" style={{color: '#0f172a', fontFamily: 'Plus Jakarta Sans, sans-serif'}}>
            Privacy Policy
          </h1>
          <p className="text-lg max-w-2xl" style={{color: '#475569'}}>
            Your privacy is important to us. This policy explains how we collect, use, and protect your personal information.
          </p>
          <p className="text-sm mt-4" style={{color: '#64748b'}}>
            Last updated: September 27, 2026
          </p>
        </div>
      </section>

      {/* ── INTRODUCTION ── */}
      <section className="py-12 sm:py-16" style={{backgroundColor: '#ffffff'}}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="prose prose-slate max-w-none">
            <p className="text-lg" style={{color: '#334155'}}>
              Sahaay ("we," "our," or "us") operates the Sahaay mobile application and website (collectively, the "Service").
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service.
            </p>
            <p style={{color: '#334155'}}>
              By accessing or using our Service, you agree to this Privacy Policy. If you do not agree with the terms of this policy,
              please do not access the Service.
            </p>
          </div>
        </div>
      </section>

      {/* ── MAIN SECTIONS ── */}
      <section className="py-12 sm:py-16" style={{backgroundColor: '#f8fafc'}}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="space-y-12">
            {sections.map((section, index) => (
              <div key={index} className="bg-white rounded-xl p-6 sm:p-8 border" style={{borderColor: '#e2e8f0'}}>
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{backgroundColor: 'var(--color-primary-tint)'}}>
                      <section.icon className="w-5 h-5" style={{color: 'var(--color-primary)'}} />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold mb-3" style={{color: '#0f172a'}}>
                      {section.title}
                    </h2>
                    <div className="whitespace-pre-line text-sm leading-relaxed" style={{color: '#475569'}}>
                      {section.content}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── YOUR RIGHTS ── */}
      <section className="py-12 sm:py-16" style={{backgroundColor: '#ffffff'}}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-bold mb-6" style={{color: '#0f172a', fontFamily: 'Plus Jakarta Sans, sans-serif'}}>
            Your Rights & Choices
          </h2>
          <p className="text-sm mb-6" style={{color: '#475569'}}>
            Under applicable data protection laws, you have the following rights:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {yourRights.map((right, index) => (
              <div key={index} className="flex items-center gap-3 p-3 rounded-lg" style={{backgroundColor: '#f1f5f9'}}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor: 'var(--color-primary)'}} />
                <span className="text-sm font-medium" style={{color: '#334155'}}>{right}</span>
              </div>
            ))}
          </div>
          <p className="text-sm mt-6" style={{color: '#64748b'}}>
            To exercise these rights, please contact us using the information provided below.
          </p>
        </div>
      </section>

      {/* ── DATA RETENTION & CHILDREN ── */}
      <section className="py-12 sm:py-16" style={{backgroundColor: '#f8fafc'}}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl p-6 border" style={{borderColor: '#e2e8f0'}}>
              <h3 className="text-lg font-semibold mb-3" style={{color: '#0f172a'}}>Data Retention</h3>
              <p className="text-sm" style={{color: '#475569'}}>
                We retain your personal information for as long as your account is active or as needed to provide you services.
                We will retain and use your information as necessary to comply with our legal obligations, resolve disputes,
                and enforce our agreements.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 border" style={{borderColor: '#e2e8f0'}}>
              <h3 className="text-lg font-semibold mb-3" style={{color: '#0f172a'}}>Children's Privacy</h3>
              <p className="text-sm" style={{color: '#475569'}}>
                Our Service is not intended for children under 18 years of age. We do not knowingly collect personal
                information from children under 18. If you are a parent or guardian and believe your child has provided
                us with personal information, please contact us.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── THIRD PARTY ── */}
      <section className="py-12 sm:py-16" style={{backgroundColor: '#ffffff'}}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-bold mb-4" style={{color: '#0f172a', fontFamily: 'Plus Jakarta Sans, sans-serif'}}>
            Third-Party Services
          </h2>
          <p className="text-sm mb-4" style={{color: '#475569'}}>
            Our Service may contain links to third-party websites, services, or applications that are not operated by us.
            We are not responsible for the privacy practices of these third parties. We encourage you to review the privacy
            policies of any third-party sites or services you access.
          </p>
          <p className="text-sm" style={{color: '#475569'}}>
            We use third-party service providers for:
          </p>
          <ul className="list-disc list-inside text-sm mt-2 space-y-1" style={{color: '#475569'}}>
            <li>Payment processing (Razorpay, Cashfree)</li>
            <li>Cloud infrastructure (Supabase)</li>
            <li>Analytics (privacy-friendly, anonymized)</li>
            <li>Customer support</li>
          </ul>
        </div>
      </section>

      {/* ── CHANGES ── */}
      <section className="py-12 sm:py-16" style={{backgroundColor: '#f8fafc'}}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-bold mb-4" style={{color: '#0f172a', fontFamily: 'Plus Jakarta Sans, sans-serif'}}>
            Changes to This Policy
          </h2>
          <p className="text-sm" style={{color: '#475569'}}>
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new
            Privacy Policy on this page and updating the "Last updated" date at the top. You are advised to review
            this Privacy Policy periodically for any changes.
          </p>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section className="py-12 sm:py-16" style={{backgroundColor: '#ffffff'}}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-bold mb-4" style={{color: '#0f172a', fontFamily: 'Plus Jakarta Sans, sans-serif'}}>
            Contact Us
          </h2>
          <p className="text-sm mb-4" style={{color: '#475569'}}>
            If you have any questions about this Privacy Policy, please contact us:
          </p>
          <div className="bg-slate-50 rounded-xl p-6 border" style={{borderColor: '#e2e8f0'}}>
            <p className="text-sm font-semibold mb-2" style={{color: '#0f172a'}}>Sahaay</p>
            <p className="text-sm" style={{color: '#475569'}}>
              Email: privacy@sahaay.app<br />
              Website: www.sahaay.app
            </p>
          </div>
        </div>
      </section>

      {/* ── FOOTER LINK ── */}
      <section className="py-8" style={{backgroundColor: '#f8fafc'}}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-sm" style={{color: '#64748b'}}>
            By using Sahaay, you agree to the collection and use of information in accordance with this policy.
          </p>
        </div>
      </section>
    </Layout>
  )
}

export default PrivacyPage