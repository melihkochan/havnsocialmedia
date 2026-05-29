'use client'

import { useEffect, useRef } from 'react'

interface CountryStat {
  country: string
  count: number
}

interface HQLeafletMapProps {
  stats: CountryStat[]
  totalUsers: number
}

const COUNTRY_COORDS: Record<string, { lat: number; lng: number; name: string }> = {
  TR: { lat: 38.9637, lng: 35.2433, name: 'Türkiye' },
  US: { lat: 37.0902, lng: -95.7129, name: 'Amerika Birleşik Devletleri' },
  DE: { lat: 51.1657, lng: 10.4515, name: 'Almanya' },
  GB: { lat: 55.3781, lng: -3.4360, name: 'Birleşik Krallık' },
  FR: { lat: 46.2276, lng: 2.2137, name: 'Fransa' },
  NL: { lat: 52.1326, lng: 5.2913, name: 'Hollanda' },
  AZ: { lat: 40.1431, lng: 47.5769, name: 'Azerbaycan' },
  IT: { lat: 41.8719, lng: 12.5674, name: 'İtalya' },
  ES: { lat: 40.4637, lng: -3.7492, name: 'İspanya' },
  JP: { lat: 36.2048, lng: 138.2529, name: 'Japonya' },
  RU: { lat: 61.5240, lng: 105.3188, name: 'Rusya' },
  CN: { lat: 35.8617, lng: 104.1954, name: 'Çin' },
  IN: { lat: 20.5937, lng: 78.9629, name: 'Hindistan' },
  BR: { lat: -14.2350, lng: -51.9253, name: 'Brezilya' },
  AU: { lat: -25.2744, lng: 133.7751, name: 'Avustralya' },
  CA: { lat: 56.1304, lng: -106.3468, name: 'Kanada' },
}

export default function HQLeafletMap({ stats, totalUsers }: HQLeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)

  useEffect(() => {
    // Inject Leaflet CSS dynamically to ensure clean layout
    const linkId = 'leaflet-css'
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link')
      link.id = linkId
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    // Load Leaflet and initialize map on Client-side only
    import('leaflet').then((L) => {
      if (!mapRef.current || mapInstanceRef.current) return

      // Initialize map instance
      const map = L.map(mapRef.current, {
        center: [39.9334, 32.8597], // Center on Turkey
        zoom: 3,
        minZoom: 2,
        maxZoom: 8,
        zoomControl: true,
        attributionControl: false,
      })

      // Use CartoDB Dark Matter tile layer for an elegant, premium look
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 20,
      }).addTo(map)

      // Store map instance
      mapInstanceRef.current = map

      // Add markers/circles for each active country
      stats.forEach((stat) => {
        const code = stat.country.toUpperCase()
        const coord = COUNTRY_COORDS[code]
        if (coord) {
          const radius = Math.max(80000, Math.min(800000, 80000 + (stat.count / totalUsers) * 600000))

          // Create glowing circular overlay
          L.circle([coord.lat, coord.lng], {
            color: 'var(--primary)',
            fillColor: 'var(--primary)',
            fillOpacity: 0.35,
            radius: radius,
            weight: 2,
          })
            .addTo(map)
            .bindPopup(`
              <div style="color: #fff; background: transparent; font-family: sans-serif; font-size: 11px; padding: 2px;">
                <b style="color: #a78bfa; font-size: 12px;">${coord.name}</b><br/>
                <span style="font-weight: bold;">${stat.count} Kullanıcı</span> (${((stat.count / totalUsers) * 100).toFixed(1)}%)
              </div>
            `)
        }
      })
    })

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [stats, totalUsers])

  return (
    <div className="w-full h-full rounded-xl overflow-hidden relative z-10">
      <div ref={mapRef} className="w-full h-full min-h-[380px] bg-slate-950" />
      {/* Leaflet CSS inline overrides to blend popups with our premium dark UI */}
      <style jsx global>{`
        .leaflet-popup-content-wrapper {
          background: rgba(15, 23, 42, 0.9) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          backdrop-filter: blur(8px) !important;
          border-radius: 12px !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5) !important;
        }
        .leaflet-popup-tip {
          background: rgba(15, 23, 42, 0.9) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
        }
        .leaflet-container {
          background: #080810 !important;
        }
      `}</style>
    </div>
  )
}
