import { Link } from 'react-router-dom'
import DashboardLayout from '@/components/DashboardLayout'
import { ArrowRightIcon } from '@/components/Icons'

interface PlaceholderPageProps {
  role: 'customer' | 'provider' | 'admin'
  title: string
  subtitle?: string
  description: string
  pageTitle: string
  pageSubtitle?: string
  icon?: React.FC<{ className?: string; style?: React.CSSProperties }>
}

const PlaceholderPage = ({ role, title, subtitle, description, pageTitle, pageSubtitle, icon: Icon }: PlaceholderPageProps) => {
  return (
    <DashboardLayout role={role} pageTitle={pageTitle} pageSubtitle={pageSubtitle}>
      <div className="bg-white rounded-xl border p-8 sm:p-12" style={{borderColor: '#e8e4df'}}>
        <div className="max-w-md mx-auto text-center">
          {Icon && (
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{backgroundColor: role === 'admin' ? '#ECFEFF' : '#ECFEFF'}}
            >
              <Icon className="w-7 h-7" style={{color: '#0E7490'}} />
            </div>
          )}
          <h2 className="text-xl font-bold mb-2" style={{color: '#1c1917', fontFamily: 'Plus Jakarta Sans, sans-serif'}}>
            {title}
          </h2>
          {subtitle && <p className="text-sm font-medium mb-2" style={{color: '#57534e'}}>{subtitle}</p>}
          <p className="text-sm leading-relaxed mb-6" style={{color: '#57534e'}}>{description}</p>
          <Link
            to={`/${role}`}
            className="inline-flex items-center gap-2 text-sm font-semibold"
            style={{color: '#0E7490'}}
          >
            Back to dashboard <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default PlaceholderPage