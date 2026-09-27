import { useState, useEffect } from 'react'
import { Search, Filter, Star, MapPin, Clock, CheckCircle, ChevronDown, ChevronUp, Map } from 'lucide-react'
import Layout from '@/components/Layout'
import ProvidersMap from '@/components/ProvidersMap'
import { getCurrentLocation } from '@/lib/geolocation'
import type { Location } from '@/lib/geolocation'

// Mock data - replace with actual Supabase queries
const mockProviders = [
  {
    id: 1,
    name: 'Rajesh Kumar',
    service: 'Electrician',
    category: 'Electrical',
    rating: 4.9,
    reviewCount: 247,
    location: 'Pune, Maharashtra',
    distance: '2.5 km',
    availability: 'Available Now',
    hourlyRate: '₹450/hour',
    experience: '12 years',
    verified: true,
    description: 'Specialized in residential electrical repairs, installations, and maintenance with focus on safety standards.',
    services: ['Fan Repair', 'Switch & Socket Repair', 'Light Installation', 'Wiring Repair'],
    image: null
  },
  {
    id: 2,
    name: 'Priya Sharma',
    service: 'Plumber',
    category: 'Plumbing',
    rating: 4.8,
    reviewCount: 189,
    location: 'Pune, Maharashtra',
    distance: '3.2 km',
    availability: 'Available Today',
    hourlyRate: '₹380/hour',
    experience: '8 years',
    verified: true,
    description: 'Expert in pipe repairs, drainage solutions, water heater installations, and leak detection.',
    services: ['Tap Repair', 'Pipe Leakage', 'Drain Blockage', 'Bathroom Plumbing'],
    image: null
  },
  {
    id: 3,
    name: 'Vikram Singh',
    service: 'Carpenter',
    category: 'Woodwork',
    rating: 4.7,
    reviewCount: 156,
    location: 'Pune, Maharashtra',
    distance: '4.1 km',
    availability: 'Available Tomorrow',
    hourlyRate: '₹520/hour',
    experience: '15 years',
    verified: true,
    description: 'Master carpenter specializing in custom furniture, repairs, and home improvement woodworking.',
    services: ['Door Repair', 'Furniture Repair', 'Lock Repair', 'Shelf Installation'],
    image: null
  },
  {
    id: 4,
    name: 'Anjali Patel',
    service: 'Cleaning',
    category: 'Home Services',
    rating: 4.9,
    reviewCount: 312,
    location: 'Pune, Maharashtra',
    distance: '1.8 km',
    availability: 'Available Now',
    hourlyRate: '₹350/hour',
    experience: '6 years',
    verified: true,
    description: 'Professional deep cleaning services with eco-friendly products and attention to detail.',
    services: ['Home Cleaning', 'Bathroom Cleaning', 'Kitchen Cleaning', 'Deep Cleaning'],
    image: null
  },
  {
    id: 5,
    name: 'Arun Mehta',
    service: 'Driver',
    category: 'Transportation',
    rating: 4.8,
    reviewCount: 214,
    location: 'Pune, Maharashtra',
    distance: '5.3 km',
    availability: 'Available Today',
    hourlyRate: '₹480/hour',
    experience: '10 years',
    verified: true,
    description: 'Specialized in AC installation, maintenance, and repair with certified expertise.',
    services: ['Local Driver', 'Outstation Driver', 'Full-Day Driver'],
    image: null
  },
  {
    id: 6,
    name: 'Sunita Roy',
    service: 'Caregiver',
    category: 'Personal Care',
    rating: 4.9,
    reviewCount: 198,
    location: 'Pune, Maharashtra',
    distance: '2.9 km',
    availability: 'Available Now',
    hourlyRate: '₹550/hour',
    experience: '9 years',
    verified: true,
    description: 'Professional beauty services at home with premium products and personalized care.',
    services: ['Elder Care', 'Patient Care', 'Daily Assistance'],
    image: null
  },
  {
    id: 7,
    name: 'Kiran Desai',
    service: 'Driver',
    category: 'Transportation',
    rating: 4.7,
    reviewCount: 167,
    location: 'Pune, Maharashtra',
    distance: '3.7 km',
    availability: 'Available Now',
    hourlyRate: '₹300/hour',
    experience: '11 years',
    verified: true,
    description: 'Safe and reliable driver with extensive local knowledge and excellent driving record.',
    services: ['Airport transfers', 'Daily commute', 'Outstation trips', 'Events'],
    image: null
  },
  {
    id: 8,
    name: 'Rohan Verma',
    service: 'Technician',
    category: 'Landscaping',
    rating: 4.6,
    reviewCount: 98,
    location: 'Pune, Maharashtra',
    distance: '4.5 km',
    availability: 'Available Tomorrow',
    hourlyRate: '₹320/hour',
    experience: '7 years',
    verified: true,
    description: 'Expert in garden design, maintenance, and plant care with focus on sustainable practices.',
    services: ['AC Repair', 'Refrigerator Repair', 'Washing Machine Repair', 'TV Repair'],
    image: null
  }
]

const services = [
  'All Services', 'Electrician', 'Plumber', 'Carpenter', 'Painter',
  'Cleaner', 'Driver', 'Caregiver', 'Technician'
]

const locations = [
  'All Locations', 'Pune', 'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai'
]

const availabilityOptions = [
  'All Availability', 'Available Now', 'Available Today', 'Available This Week'
]

const ratingOptions = [
  'All Ratings', '4.5+', '4.0+', '3.5+', '3.0+'
]

export default function ProvidersPage() {
  const [providers, setProviders] = useState(mockProviders)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedService, setSelectedService] = useState('All Services')
  const [selectedLocation, setSelectedLocation] = useState('All Locations')
  const [selectedAvailability, setSelectedAvailability] = useState('All Availability')
  const [selectedRating, setSelectedRating] = useState('All Ratings')
  const [sortBy, setSortBy] = useState('rating')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<typeof mockProviders[0] | null>(null)
  const [showMap, setShowMap] = useState(false)
  const [customerLocation, setCustomerLocation] = useState<Location | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)

  // Get user location on mount
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        setLocationLoading(true)
        const location = await getCurrentLocation()
        setCustomerLocation(location)
      } catch (error) {
        console.log('Could not get location:', error)
        // Map will use default Pune coordinates
      } finally {
        setLocationLoading(false)
      }
    }

    fetchLocation()
  }, [])

  // Filter providers based on all criteria
  const filteredProviders = providers.filter(provider => {
    const matchesSearch = searchQuery === '' ||
      provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      provider.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
      provider.description.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesService = selectedService === 'All Services' || provider.service === selectedService
    const matchesLocation = selectedLocation === 'All Locations' || provider.location.includes(selectedLocation)
    const matchesAvailability = selectedAvailability === 'All Availability' ||
      provider.availability === selectedAvailability ||
      (selectedAvailability === 'Available This Week' && provider.availability !== 'Unavailable')

    let matchesRating = true
    if (selectedRating !== 'All Ratings') {
      const minRating = parseFloat(selectedRating)
      matchesRating = provider.rating >= minRating
    }

    return matchesSearch && matchesService && matchesLocation && matchesAvailability && matchesRating
  })

  // Sort providers
  const sortedProviders = [...filteredProviders].sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return b.rating - a.rating
      case 'distance':
        const distA = parseFloat(a.distance)
        const distB = parseFloat(b.distance)
        return distA - distB
      case 'price':
        const priceA = parseInt(a.hourlyRate.replace(/[^0-9]/g, ''))
        const priceB = parseInt(b.hourlyRate.replace(/[^0-9]/g, ''))
        return priceA - priceB
      case 'experience':
        return b.experience - a.experience
      default:
        return b.rating - a.rating
    }
  })

  const handleProviderClick = (provider: typeof mockProviders[0]) => {
    setSelectedProvider(provider)
  }

  const handleCloseProfile = () => {
    setSelectedProvider(null)
  }

  // This would be replaced with actual Supabase query
  useEffect(() => {
    // In real implementation, this would fetch from Supabase:
    // const { data, error } = await supabase
    //   .from('providers')
    //   .select('*')
    //   .eq('status', 'active')
    //   .order(sortBy)

    // For now, we're using mock data
    setProviders(mockProviders)
  }, [])

  return (
    <Layout>
      <div className="min-h-screen bg-white">
        {/* Header Section */}
        <div className="bg-gradient-to-br from-gray-50 to-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center space-y-6">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
                Find Trusted Service Providers
              </h1>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Browse verified professionals with transparent ratings, pricing, and availability.
                Quality work guaranteed.
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Search and Filter Section */}
          <div className="space-y-6 mb-8">
            {/* Main Search */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search providers by name, service, or location..."
                className="w-full pl-12 pr-4 py-4 text-gray-700 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            {/* Filter Controls */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium"
                >
                  <Filter className="h-5 w-5" />
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
                  {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-gray-600 text-sm">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  >
                    <option value="rating">Highest Rated</option>
                    <option value="distance">Nearest</option>
                    <option value="price">Price: Low to High</option>
                    <option value="experience">Most Experienced</option>
                  </select>
                </div>
              </div>

              {/* Expandable Filters */}
              {showFilters && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Service</label>
                    <select
                      value={selectedService}
                      onChange={(e) => setSelectedService(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                    >
                      {services.map(service => (
                        <option key={service} value={service}>{service}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                    <select
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                    >
                      {locations.map(location => (
                        <option key={location} value={location}>{location}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Availability</label>
                    <select
                      value={selectedAvailability}
                      onChange={(e) => setSelectedAvailability(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                    >
                      {availabilityOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Rating</label>
                    <select
                      value={selectedRating}
                      onChange={(e) => setSelectedRating(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                    >
                      {ratingOptions.map(rating => (
                        <option key={rating} value={rating}>{rating}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Results Info */}
            <div className="text-sm text-gray-600">
              Showing {sortedProviders.length} of {providers.length} providers
              {searchQuery && ` matching "${searchQuery}"`}
            </div>
          </div>

          {/* Providers Grid + Map */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Map View - Only show when actively searching or filtering */}
            {(searchQuery || selectedService !== 'All Services') && sortedProviders.length > 0 && (
              <div className="lg:col-span-1 h-96 lg:h-[600px] rounded-xl overflow-hidden sticky top-20">
                <div className="w-full h-full bg-gray-100 border border-gray-200 rounded-xl overflow-hidden">
                  <ProvidersMap
                    customerLocation={customerLocation}
                    providers={sortedProviders}
                    radius={10}
                  />
                </div>
              </div>
            )}

            {/* Providers List */}
            <div className={(searchQuery || selectedService !== 'All Services') && sortedProviders.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3'}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">
                  {sortedProviders.length === 0 ? 'Browse Providers' : `Found ${sortedProviders.length} Providers`}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                {sortedProviders.map((provider) => (
                  <div
                    key={provider.id}
                    onClick={() => handleProviderClick(provider)}
                    className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden group cursor-pointer"
                  >
                    <div className="p-6 space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{provider.name}</h3>
                          <p className="text-gray-600">{provider.service}</p>
                        </div>
                        {provider.verified && (
                          <div className="flex items-center gap-1 text-blue-600">
                            <CheckCircle className="h-5 w-5" />
                            <span className="text-sm font-medium">Verified</span>
                          </div>
                        )}
                      </div>

                      {/* Rating */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <Star className="h-5 w-5 text-yellow-500 fill-current" />
                          <span className="font-bold text-gray-900">{provider.rating}</span>
                          <span className="text-gray-500">/5</span>
                        </div>
                        <span className="text-gray-500">•</span>
                        <span className="text-gray-600 text-sm">{provider.reviewCount} reviews</span>
                      </div>

                      {/* Details */}
                      <div className="space-y-3 text-sm">
                        <div className="flex items-center gap-2 text-gray-700">
                          <MapPin className="h-4 w-4 text-gray-500" />
                          <span>{provider.location}</span>
                          <span className="text-gray-500">•</span>
                          <span className="font-medium text-blue-600">{provider.distance}</span>
                        </div>

                        <div className="flex items-center gap-2 text-gray-700">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span className="font-medium text-green-600">{provider.availability}</span>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                          <div className="text-gray-700">
                            <span className="font-medium text-gray-900">{provider.hourlyRate}</span>
                          </div>
                          <div className="text-gray-600">
                            {provider.experience} years exp
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">
                        {provider.description}
                      </p>

                      {/* Services */}
                      <div className="flex flex-wrap gap-1">
                        {provider.services.slice(0, 3).map((service, idx) => (
                          <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                            {service}
                          </span>
                        ))}
                        {provider.services.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                            +{provider.services.length - 3} more
                          </span>
                        )}
                      </div>

                      {/* CTA */}
                      <button className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors group-hover:shadow-md">
                        View Profile
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* No Results State */}
          {sortedProviders.length === 0 && (
            <div className="text-center py-16">
              <div className="text-gray-400 mb-4">
                <Search className="h-16 w-16 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No providers found</h3>
              <p className="text-gray-600">
                Try adjusting your search criteria or try a different location
              </p>
              <button
                onClick={() => {
                  setSearchQuery('')
                  setSelectedService('All Services')
                  setSelectedLocation('All Locations')
                  setSelectedAvailability('All Availability')
                  setSelectedRating('All Ratings')
                }}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Provider Profile Modal */}
        {selectedProvider && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Provider Profile</h2>
                <button
                  onClick={handleCloseProfile}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-8">
                {/* Profile Header */}
                <div className="flex flex-col md:flex-row md:items-start gap-6">
                  <div className="w-32 h-32 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl flex items-center justify-center">
                    <div className="text-4xl text-blue-600">
                      {selectedProvider.name.charAt(0)}
                    </div>
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-3xl font-bold text-gray-900">{selectedProvider.name}</h3>
                        <p className="text-xl text-gray-600">{selectedProvider.service}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex items-center gap-1">
                            <Star className="h-5 w-5 text-yellow-500 fill-current" />
                            <span className="font-bold text-gray-900">{selectedProvider.rating}</span>
                            <span className="text-gray-500">/5</span>
                          </div>
                          <span className="text-gray-500">•</span>
                          <span className="text-gray-600">{selectedProvider.reviewCount} reviews</span>
                          {selectedProvider.verified && (
                            <>
                              <span className="text-gray-500">•</span>
                              <div className="flex items-center gap-1 text-blue-600">
                                <CheckCircle className="h-5 w-5" />
                                <span className="font-medium">Verified</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600">Hourly Rate</p>
                        <p className="text-lg font-bold text-gray-900">{selectedProvider.hourlyRate}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600">Experience</p>
                        <p className="text-lg font-bold text-gray-900">{selectedProvider.experience} years</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600">Location</p>
                        <p className="text-lg font-bold text-gray-900">{selectedProvider.location}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600">Availability</p>
                        <p className="text-lg font-bold text-green-600">{selectedProvider.availability}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h4 className="text-xl font-bold text-gray-900 mb-4">About</h4>
                  <p className="text-gray-700 leading-relaxed">{selectedProvider.description}</p>
                </div>

                {/* Services */}
                <div>
                  <h4 className="text-xl font-bold text-gray-900 mb-4">Services Offered</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {selectedProvider.services.map((service, idx) => (
                      <div key={idx} className="bg-blue-50 rounded-lg p-3 text-center">
                        <p className="text-blue-700 font-medium">{service}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-8 border-t border-gray-200">
                  <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 rounded-lg transition-colors">
                    Book Service
                  </button>
                  <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-4 rounded-lg transition-colors">
                    Message Provider
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Stats */}
        <div className="bg-gray-50 border-t border-gray-200 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center space-y-4">
              <h3 className="text-2xl font-bold text-gray-900">Why Choose Sahaay Providers?</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">500+</p>
                  <p className="text-gray-600 text-sm mt-1">Verified Providers</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">4.8★</p>
                  <p className="text-gray-600 text-sm mt-1">Avg. Rating</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">98%</p>
                  <p className="text-gray-600 text-sm mt-1">Satisfaction Rate</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">30min</p>
                  <p className="text-gray-600 text-sm mt-1">Avg. Response Time</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
