import React, { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import type { Location } from '@/lib/geolocation'

interface Provider {
  id: number | string
  name?: string
  service?: string | { name: string; slug: string }
  rating: number
  distance?: string | number
  latitude?: number
  longitude?: number
  emoji?: string
  user?: {
    full_name: string
  }
}

interface ProvidersMapProps {
  customerLocation?: Location | null
  providers: Provider[]
  radius?: number
}

// Fix default icons for Leaflet
const DefaultIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const CustomerIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [35, 41],
  iconAnchor: [17, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

// Function to create emoji-based marker icon
const createEmojiIcon = (emoji: string) => {
  return L.divIcon({
    html: `<div style="font-size: 28px; line-height: 1; text-align: center; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">${emoji}</div>`,
    className: 'emoji-marker',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  })
}

L.Marker.prototype.options.icon = DefaultIcon

const ProvidersMap: React.FC<ProvidersMapProps> = ({
  customerLocation,
  providers,
  radius = 10,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Pune coordinates as default center
  const defaultCenter = { lat: 18.5204, lng: 73.8567 }
  const centerLocation = customerLocation || { latitude: defaultCenter.lat, longitude: defaultCenter.lng }

  useEffect(() => {
    if (!mapContainer.current) return

    // Initialize map
    if (!map.current) {
      map.current = L.map(mapContainer.current).setView(
        [centerLocation.latitude, centerLocation.longitude],
        13
      )

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors',
      }).addTo(map.current)

      setIsLoaded(true)
    }

    // Clear existing markers
    markersRef.current.forEach(marker => map.current?.removeLayer(marker))
    markersRef.current = []

    // Add customer location marker (blue) if available
    if (customerLocation) {
      const customerMarker = L.marker(
        [customerLocation.latitude, customerLocation.longitude],
        { icon: CustomerIcon }
      )
        .bindPopup(`<strong>Your Location</strong>`)
        .addTo(map.current!)

      markersRef.current.push(customerMarker)
    }

    // Only add provider markers if they have actual coordinates
    // In real implementation, providers would have real lat/lng from database
    const providersWithCoordinates = providers.filter(p => p.latitude && p.longitude)

    if (providersWithCoordinates.length === 0) {
      // If no providers have coordinates, just show customer location with radius
      if (customerLocation) {
        L.circle([customerLocation.latitude, customerLocation.longitude], {
          color: '#0ea5e9',
          fillColor: '#0ea5e9',
          fillOpacity: 0.1,
          weight: 2,
          radius: radius * 1000,
          dashArray: '5, 5',
        }).addTo(map.current!)
      }
      return
    }

    // Add actual provider markers with ratings and emoji icons
    providersWithCoordinates.forEach(provider => {
      if (provider.latitude && provider.longitude) {
        const serviceName = typeof provider.service === 'object' ? provider.service.name : provider.service || 'Service'
        const distance = typeof provider.distance === 'number'
          ? `${provider.distance.toFixed(1)} km`
          : provider.distance || ''

        const popupContent = `
          <div style="font-size: 12px; min-width: 150px;">
            <strong>${provider.name || provider.user?.full_name || 'Provider'}</strong>
            <br/>
            <span style="color: #666;">⭐ ${provider.rating?.toFixed(1) || 'N/A'}</span>
            <br/>
            <span style="color: #666; font-size: 11px;">${serviceName}</span>
            ${distance ? `<br/><span style="color: #0ea5e9; font-size: 11px;">📍 ${distance}</span>` : ''}
          </div>
        `

        // Use emoji icon if available, otherwise use default
        const icon = provider.emoji ? createEmojiIcon(provider.emoji) : DefaultIcon

        const marker = L.marker([provider.latitude, provider.longitude], {
          icon,
        })
          .bindPopup(popupContent)
          .addTo(map.current!)

        markersRef.current.push(marker)
      }
    })

    // Draw radius circle around center
    L.circle([centerLocation.latitude, centerLocation.longitude], {
      color: '#0ea5e9',
      fillColor: '#0ea5e9',
      fillOpacity: 0.1,
      weight: 2,
      radius: radius * 1000, // Convert km to meters
      dashArray: '5, 5',
    }).addTo(map.current!)

    // Fit bounds to show all markers
    if (markersRef.current.length > 0) {
      const group = new L.FeatureGroup(markersRef.current)
      map.current!.fitBounds(group.getBounds().pad(0.1))
    }
  }, [customerLocation, providers, radius, centerLocation])

  return (
    <div
      ref={mapContainer}
      className="w-full h-full rounded-xl"
      style={{ minHeight: '300px' }}
    />
  )
}

export default ProvidersMap
