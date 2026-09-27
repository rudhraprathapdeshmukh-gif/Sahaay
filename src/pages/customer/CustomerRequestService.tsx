import ServiceRequestForm from '@/components/ServiceRequestForm'
import { Link } from 'react-router-dom'
import { ArrowLeftIcon } from '@/components/Icons'

const CustomerRequestServicePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <ServiceRequestForm />
      </div>
    </div>
  )
}

export default CustomerRequestServicePage