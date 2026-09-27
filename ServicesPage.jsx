import React, { useState } from 'react';
import { Search, Filter, Clock, Star, MapPin } from 'lucide-react';

const services = [
  {
    id: 1,
    name: 'Electrician',
    description: 'Wiring repairs, installations, electrical maintenance and safety checks',
    rating: 4.9,
    responseTime: '15-30 min',
    providers: 85,
    icon: '⚡',
    category: 'home-repair'
  },
  {
    id: 2,
    name: 'Plumber',
    description: 'Pipe repairs, installations, drainage solutions and water heater services',
    rating: 4.8,
    responseTime: '20-45 min',
    providers: 92,
    icon: '💧',
    category: 'home-repair'
  },
  {
    id: 3,
    name: 'Carpenter',
    description: 'Furniture making, repairs, installations and woodworking projects',
    rating: 4.7,
    responseTime: '1-2 hours',
    providers: 67,
    icon: '🔨',
    category: 'home-repair'
  },
  {
    id: 4,
    name: 'Painter',
    description: 'Interior/exterior painting, wall treatments and decorative finishes',
    rating: 4.6,
    responseTime: '2-4 hours',
    providers: 74,
    icon: '🎨',
    category: 'home-repair'
  },
  {
    id: 5,
    name: 'Cleaning',
    description: 'Deep cleaning, regular maintenance and specialized cleaning services',
    rating: 4.9,
    responseTime: '30-60 min',
    providers: 120,
    icon: '🧹',
    category: 'home-care'
  },
  {
    id: 6,
    name: 'Driver',
    description: 'Personal chauffeur, airport transfers and daily commute services',
    rating: 4.8,
    responseTime: '10-20 min',
    providers: 150,
    icon: '🚗',
    category: 'personal'
  },
  {
    id: 7,
    name: 'Caregiver',
    description: 'Elderly care, child care and temporary assistance services',
    rating: 4.9,
    responseTime: '1-3 hours',
    providers: 63,
    icon: '👨‍⚕️',
    category: 'personal'
  },
  {
    id: 8,
    name: 'Gardener',
    description: 'Lawn maintenance, landscaping and plant care services',
    rating: 4.7,
    responseTime: '2-3 hours',
    providers: 58,
    icon: '🌿',
    category: 'home-care'
  },
  {
    id: 9,
    name: 'AC Repair',
    description: 'Installation, maintenance and repair of air conditioning systems',
    rating: 4.8,
    responseTime: '30-60 min',
    providers: 71,
    icon: '❄️',
    category: 'home-repair'
  },
  {
    id: 10,
    name: 'Beautician',
    description: 'Hair styling, skincare, makeup and personal grooming services',
    rating: 4.9,
    responseTime: '1-2 hours',
    providers: 89,
    icon: '💇',
    category: 'personal'
  },
  {
    id: 11,
    name: 'Electrician',
    description: 'Wiring repairs, installations, electrical maintenance and safety checks',
    rating: 4.9,
    responseTime: '15-30 min',
    providers: 85,
    icon: '⚡',
    category: 'home-repair'
  },
  {
    id: 12,
    name: 'Painter',
    description: 'Interior/exterior painting, wall treatments and decorative finishes',
    rating: 4.6,
    responseTime: '2-4 hours',
    providers: 74,
    icon: '🎨',
    category: 'home-repair'
  },
  {
    id: 13,
    name: 'Cleaning',
    description: 'Deep cleaning, regular maintenance and specialized cleaning services',
    rating: 4.9,
    responseTime: '30-60 min',
    providers: 120,
    icon: '🧹',
    category: 'home-care'
  },
  {
    id: 14,
    name: 'Driver',
    description: 'Personal chauffeur, airport transfers and daily commute services',
    rating: 4.8,
    responseTime: '10-20 min',
    providers: 150,
    icon: '🚗',
    category: 'personal'
  },
  {
    id: 15,
    name: 'Caregiver',
    description: 'Elderly care, child care and temporary assistance services',
    rating: 4.9,
    responseTime: '1-3 hours',
    providers: 63,
    icon: '👨‍⚕️',
    category: 'personal'
  },
  {
    id: 16,
    name: 'Gardener',
    description: 'Lawn maintenance, landscaping and plant care services',
    rating: 4.7,
    responseTime: '2-3 hours',
    providers: 58,
    icon: '🌿',
    category: 'home-care'
  }
];

const categories = [
  { id: 'all', name: 'All Services' },
  { id: 'home-repair', name: 'Home Repair' },
  { id: 'home-care', name: 'Home Care' },
  { id: 'personal', name: 'Personal Services' }
];

export default function ServicesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('popular');

  const filteredServices = services
    .filter(service => {
      const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          service.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating;
        case 'response':
          const timeA = parseInt(a.responseTime);
          const timeB = parseInt(b.responseTime);
          return timeA - timeB;
        case 'providers':
          return b.providers - a.providers;
        default:
          return b.providers - a.providers; // popular by default
      }
    });

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
            Find the Right Service for Your Needs
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Browse our verified local service providers. Quality work, transparent pricing,
            and peace of mind for every task.
          </p>
        </div>

        {/* Search and Filter Controls */}
        <div className="mt-12 space-y-8">
          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for a specific service..."
              className="w-full pl-12 pr-4 py-4 text-gray-700 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>

          {/* Filter Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="popular">Most Popular</option>
                <option value="rating">Highest Rated</option>
                <option value="response">Fastest Response</option>
                <option value="providers">Most Providers</option>
              </select>
            </div>
          </div>

          {/* Results Info */}
          <div className="text-sm text-gray-600">
            Showing {filteredServices.length} services
            {searchQuery && ` matching "${searchQuery}"`}
            {selectedCategory !== 'all' && ` in ${categories.find(c => c.id === selectedCategory)?.name}`}
          </div>
        </div>

        {/* Services Grid */}
        <div className="mt-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredServices.map((service) => (
              <div
                key={service.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden group"
              >
                <div className="p-6 space-y-4">
                  {/* Service Icon and Name */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-2xl mb-2">{service.icon}</div>
                      <h3 className="text-lg font-semibold text-gray-900">{service.name}</h3>
                    </div>
                    <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-full">
                      {service.category.replace('-', ' ')}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {service.description}
                  </p>

                  {/* Stats */}
                  <div className="space-y-3 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        <span className="font-medium text-gray-900">{service.rating}</span>
                        <span className="text-gray-500">/5</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-600">
                        <Clock className="h-4 w-4" />
                        <span>{service.responseTime}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="text-gray-600">
                        <span className="font-medium text-gray-900">{service.providers}</span> providers
                      </div>
                      <div className="flex items-center gap-1 text-gray-600">
                        <MapPin className="h-4 w-4" />
                        <span>Nearby</span>
                      </div>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <button className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors group-hover:shadow-md">
                    Find Provider
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* No Results State */}
          {filteredServices.length === 0 && (
            <div className="text-center py-16">
              <div className="text-gray-400 mb-4">
                <Search className="h-16 w-16 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No services found</h3>
              <p className="text-gray-600">
                Try adjusting your search or filter criteria
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer CTA */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center space-y-6">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
              Can't find what you're looking for?
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Request a custom service or suggest a new category. We're constantly expanding
              our network to serve your needs better.
            </p>
            <button className="bg-white hover:bg-gray-50 text-blue-600 font-medium px-8 py-3 rounded-lg border border-blue-200 shadow-sm hover:shadow transition-all">
              Request Custom Service
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
