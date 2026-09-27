import React from 'react';
import { Search } from 'lucide-react';

export default function HeroSection() {
  const services = [
    'Electrician', 'Plumber', 'Cleaner', 'Carpenter',
    'Painter', 'AC Repair', 'Beautician', 'Driver'
  ];

  return (
    <section className="min-h-screen flex items-center bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            {/* Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
              Your trusted local
              <span className="block text-blue-600 mt-2">service provider</span>
            </h1>

            {/* Description */}
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl">
              Connect with verified professionals for home services, repairs, and personal care.
              Quality work, transparent pricing, and peace of mind.
            </p>

            {/* Search Section */}
            <div className="space-y-6">
              {/* Search Bar */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="What service do you need today?"
                  className="w-full pl-12 pr-4 py-4 text-gray-700 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              {/* Service Tags */}
              <div className="flex flex-wrap gap-2">
                <p className="text-sm text-gray-500 w-full mb-2">Popular services:</p>
                {services.map((service, index) => (
                  <button
                    key={index}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm font-medium transition-colors"
                  >
                    {service}
                  </button>
                ))}
              </div>

              {/* CTA Button */}
              <div>
                <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg px-8 py-4 rounded-lg shadow-md hover:shadow-lg transition-all w-full md:w-auto">
                  Find a Service
                </button>
                <p className="text-sm text-gray-500 mt-3">
                  Join 10,000+ satisfied customers who trust Sahaay for their daily needs
                </p>
              </div>
            </div>
          </div>

          {/* Right Image */}
          <div className="relative">
            {/* Main Image */}
            <div className="relative bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl overflow-hidden shadow-xl">
              <div className="aspect-square md:aspect-[4/5] lg:aspect-square bg-gradient-to-br from-blue-500 to-blue-600 opacity-10" />

              {/* Image Content Overlay */}
              <div className="absolute inset-0 flex items-center justify-center p-8">
                <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <div className="w-8 h-8 bg-blue-600 rounded-full" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Rajesh Kumar</h3>
                      <p className="text-sm text-gray-600">Electrician • 4.9 ⭐</p>
                    </div>
                  </div>
                  <p className="text-gray-700 text-sm mb-4">
                    "Fixed our wiring issue in under 2 hours. Professional and reasonably priced."
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>📍 Nearby • Available Now</span>
                    <button className="text-blue-600 font-medium hover:text-blue-700">
                      Book →
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative Elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl -z-10" />
            <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl -z-10" />
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-16 pt-8 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-gray-900">500+</p>
              <p className="text-gray-600 text-sm mt-1">Verified Providers</p>
            </div>
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-gray-900">10K+</p>
              <p className="text-gray-600 text-sm mt-1">Happy Customers</p>
            </div>
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-gray-900">95%</p>
              <p className="text-gray-600 text-sm mt-1">Satisfaction Rate</p>
            </div>
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-gray-900">30min</p>
              <p className="text-gray-600 text-sm mt-1">Avg. Response Time</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
