import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo + Local Services */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-600 to-teal-700 rounded-lg flex items-center justify-center shadow-sm">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M18 8V6a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v2M10 10v3m4-3v3m4-3v3m-2-3v3m-4-3v3m-4-3v3a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-2"
                  stroke="white"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 13.5c0-1.5 1-2.5 1-2.5s1 1 1 2.5c0 1.5-1 3-1 3s-1-1.5-1-3z"
                  stroke="white"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="hidden sm:block">
              <span className="text-base font-bold text-gray-900 block leading-tight">Sahaay</span>
              <p className="text-[10px] font-semibold text-gray-500 tracking-wider uppercase">LOCAL SERVICES</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#services" className="text-gray-700 hover:text-gray-900 font-medium text-sm transition-colors">
              Services
            </a>
            <a href="#how-it-works" className="text-gray-700 hover:text-gray-900 font-medium text-sm transition-colors">
              How it works
            </a>
            <a href="#for-providers" className="text-gray-700 hover:text-gray-900 font-medium text-sm transition-colors">
              For Providers
            </a>
            <a href="#about" className="text-gray-700 hover:text-gray-900 font-medium text-sm transition-colors">
              About
            </a>
          </nav>

          {/* Right Section - Desktop */}
          <div className="hidden md:flex items-center gap-4">
            <button className="text-gray-700 hover:text-gray-900 font-medium text-sm transition-colors">
              Sign in
            </button>
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-6 py-2 rounded-lg transition-colors">
              Get Started
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-gray-700" />
            ) : (
              <Menu className="w-6 h-6 text-gray-700" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-gray-200 py-4 space-y-3">
            <a
              href="#services"
              className="block text-gray-700 hover:text-gray-900 font-medium text-sm py-2 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Services
            </a>
            <a
              href="#how-it-works"
              className="block text-gray-700 hover:text-gray-900 font-medium text-sm py-2 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              How it works
            </a>
            <a
              href="#for-providers"
              className="block text-gray-700 hover:text-gray-900 font-medium text-sm py-2 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              For Providers
            </a>
            <a
              href="#about"
              className="block text-gray-700 hover:text-gray-900 font-medium text-sm py-2 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              About
            </a>
            <div className="flex flex-col gap-2 pt-2">
              <button className="text-gray-700 hover:text-gray-900 font-medium text-sm py-2 transition-colors">
                Sign in
              </button>
              <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-6 py-2 rounded-lg transition-colors w-full">
                Get Started
              </button>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
