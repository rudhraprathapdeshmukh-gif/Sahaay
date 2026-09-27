/**
 * Location picker component for forms
 */

import React, { useState, useEffect } from 'react'
import { useGeolocation } from '@/hooks/useGeolocation'
import { isValidLocation } from '@/lib/geolocation'

interface LocationPickerProps {
  latitude?: number | null
  longitude?: number | null
  onLocationChange: (latitude: number | null, longitude: number | null) => void
  label?: string
  required?: boolean
  disabled?: boolean
  showAddress?: boolean
}

const LocationPicker: React.FC<LocationPickerProps> = ({
  latitude,
  longitude,
  onLocationChange,
  label = 'Location',
  required = false,
  disabled = false,
  showAddress = false,
}) => {
  const { location, loading, error, requestLocation, clearError } = useGeolocation()

  // Auto-request location on mount
  useEffect(() => {
    if (!latitude && !longitude && !disabled) {
      requestLocation()
    }
  }, [])

  // Update form when location is obtained
  useEffect(() => {
    if (location) {
      onLocationChange(location.latitude, location.longitude)
    }
  }, [location, onLocationChange])

  const handleUseCurrentLocation = async () => {
    clearError()
    await requestLocation()
  }

  const isCurrentLocationActive = location && latitude && longitude &&
    Math.abs(location.latitude - latitude) < 0.001 &&
    Math.abs(location.longitude - longitude) < 0.001

  return (
    <div className="space-y-3">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Current location button */}
      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={disabled || loading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Detecting...' : 'Use Current Location'}
        </button>

        {isCurrentLocationActive && (
          <span className="text-sm text-green-600 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Using current location
          </span>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 text-sm text-red-700 bg-red-50 rounded-md">
          <div className="font-medium">Location Error</div>
          <div>{error}</div>
          <button
            type="button"
            onClick={clearError}
            className="mt-1 text-sm text-red-600 hover:text-red-800 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Preview coordinates */}
      {(latitude || longitude) && (
        <div className="p-3 text-sm bg-gray-50 rounded-md">
          <div className="font-medium text-gray-700">Selected Location:</div>
          <div className="font-mono text-gray-600 mt-1">
            Lat: {latitude?.toFixed(6) || 'Not set'}, Lng: {longitude?.toFixed(6) || 'Not set'}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>• Click "Use Current Location" to automatically detect your GPS location</p>
        <p>• Location helps customers find you and match you with nearby jobs</p>
      </div>
    </div>
  )
}

export default LocationPicker