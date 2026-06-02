'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import DeckGL from '@deck.gl/react'
import { GeoJsonLayer, ScatterplotLayer, ArcLayer, TextLayer } from '@deck.gl/layers'
import { Play, Pause, Compass, Plus, Minus } from 'lucide-react'

interface CountryStat {
  country: string
  count: number
}

interface HQDeckGLMapProps {
  stats: CountryStat[]
  totalUsers: number
}

const COUNTRY_COORDS: Record<string, { lat: number; lng: number; name: string }> = {
  TR: { lat: 38.9637, lng: 35.2433, name: 'Türkiye' },
  US: { lat: 37.0902, lng: -95.7129, name: 'ABD' },
  DE: { lat: 51.1657, lng: 10.4515, name: 'Almanya' },
  GB: { lat: 55.3781, lng: -3.4360, name: 'İngiltere' },
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
  UA: { lat: 48.3794, lng: 31.1656, name: 'Ukrayna' },
  PL: { lat: 51.9194, lng: 19.1451, name: 'Polonya' },
  RO: { lat: 45.9432, lng: 24.9668, name: 'Romanya' },
  GR: { lat: 39.0742, lng: 21.8243, name: 'Yunanistan' },
  BG: { lat: 42.7339, lng: 25.4858, name: 'Bulgaristan' },
  SE: { lat: 60.1282, lng: 18.6435, name: 'İsveç' },
  NO: { lat: 60.4720, lng: 8.4689, name: 'Norveç' },
  FI: { lat: 61.9241, lng: 25.7482, name: 'Finlandiya' },
  EG: { lat: 26.8206, lng: 30.8025, name: 'Mısır' },
  SA: { lat: 23.8859, lng: 45.0792, name: 'S. Arabistan' },
  KZ: { lat: 48.0196, lng: 66.9237, name: 'Kazakistan' },
}

const INITIAL_VIEW_STATE = {
  longitude: 35.2433,
  latitude: 38.9637,
  zoom: 2.1,
  pitch: 35,
  bearing: 0,
  maxZoom: 10,
  minZoom: 1.2,
}

export default function HQDeckGLMap({ stats, totalUsers }: HQDeckGLMapProps) {
  const [hoverInfo, setHoverInfo] = useState<any>(null)
  
  // Viewport camera states
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE)
  const [autoRotate, setAutoRotate] = useState(true)
  const [isInteracting, setIsInteracting] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Pulsing nodes animation states
  const [pulseScale, setPulseScale] = useState(1)

  // Pulse effect timer
  useEffect(() => {
    let frameId: number
    const tick = () => {
      const time = Date.now() * 0.003
      setPulseScale(1 + Math.sin(time) * 0.15) // oscillates between 0.85 and 1.15
      frameId = requestAnimationFrame(tick)
    }
    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [])

  // Auto rotation camera sweep
  useEffect(() => {
    if (!autoRotate || isInteracting) return

    const interval = setInterval(() => {
      setViewState((prev) => ({
        ...prev,
        longitude: (prev.longitude + 0.08) % 360,
      }))
    }, 50)

    return () => clearInterval(interval)
  }, [autoRotate, isInteracting])

  const handleViewStateChange = ({ viewState: nextViewState, interactionState }: any) => {
    setViewState(nextViewState)
    if (interactionState && (interactionState.isDragging || interactionState.isZooming || interactionState.isPanning)) {
      setIsInteracting(true)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        setIsInteracting(false)
      }, 6000) // Resume rotation after 6 seconds of no user interactions
    }
  }

  // Map country distribution stats to coordinates
  const pointsData = useMemo(() => {
    return stats
      .map((stat) => {
        const code = stat.country.toUpperCase()
        const coords = COUNTRY_COORDS[code]
        if (!coords) return null
        return {
          id: stat.country,
          name: coords.name,
          lat: coords.lat,
          lng: coords.lng,
          count: stat.count,
        }
      })
      .filter(Boolean) as any[]
  }, [stats])

  // Map arc lines from HQ (Turkey - TR) to other countries
  const arcsData = useMemo(() => {
    const hqCoord = COUNTRY_COORDS.TR
    if (!hqCoord) return []
    return pointsData.filter((pt) => pt.id !== 'TR')
  }, [pointsData])

  const layers = [
    // World boundary outline layer (high-tech glowing style)
    new GeoJsonLayer({
      id: 'world-boundaries',
      data: 'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_admin_0_countries.geojson',
      filled: true,
      stroked: true,
      getFillColor: (feature: any) => {
        const isoCode = feature.properties?.iso_a2 || feature.properties?.postal
        if (isoCode) {
          const code = isoCode.toUpperCase()
          const hasUsers = stats.some(s => s.country.toUpperCase() === code && s.count > 0)
          if (hasUsers) {
            return [124, 58, 237, 45] // Glowing Violet fill for active countries
          }
        }
        return [12, 12, 24, 200] // Dark deep navy/black for others
      },
      getLineColor: (feature: any) => {
        const isoCode = feature.properties?.iso_a2 || feature.properties?.postal
        if (isoCode) {
          const code = isoCode.toUpperCase()
          const hasUsers = stats.some(s => s.country.toUpperCase() === code && s.count > 0)
          if (hasUsers) {
            return [168, 85, 247, 180] // Glowing purple borders for active countries
          }
        }
        return [124, 58, 237, 75] // Semi-transparent Violet border
      },
      getLineWidth: 1,
      lineWidthMinPixels: 1.2,
    }),

    // Glowing connection arcs from Turkey (HQ) to other active user nodes
    new ArcLayer({
      id: 'connection-arcs',
      data: arcsData,
      getSourcePosition: () => [35.2433, 38.9637], // Turkey lat/lng
      getTargetPosition: (d) => [d.lng, d.lat],
      getSourceColor: [124, 58, 237, 210], // Glowing Violet
      getTargetColor: [245, 158, 11, 210], // Glowing Amber
      getWidth: (d) => Math.max(1.8, Math.min(5, d.count * 1.2)),
      pickable: true,
    }),

    // Scatterplot nodes representing user distribution sizes
    new ScatterplotLayer({
      id: 'user-nodes',
      data: pointsData,
      getPosition: (d) => [d.lng, d.lat],
      getRadius: (d) => Math.max(150000, Math.min(750000, 150000 + (d.count / totalUsers) * 600000)) * pulseScale,
      getFillColor: (d) => (d.id === 'TR' ? [139, 92, 246, 180] : [245, 158, 11, 180]), // Violet for TR/HQ, Amber for others
      getLineColor: [255, 255, 255, 150],
      stroked: true,
      lineWidthMinPixels: 1,
      radiusMinPixels: 6 * pulseScale,
      radiusMaxPixels: 24 * pulseScale,
      pickable: true,
      onHover: (info) => setHoverInfo(info.object ? info : null),
    }),

    // Text labels for countries representing names on map
    new TextLayer({
      id: 'country-labels',
      data: Object.entries(COUNTRY_COORDS).map(([code, coords]) => ({
        code,
        name: coords.name,
        lat: coords.lat,
        lng: coords.lng,
        isActive: stats.some(s => s.country.toUpperCase() === code && s.count > 0)
      })),
      getPosition: (d: any) => [d.lng, d.isActive ? d.lat - 2.5 : d.lat],
      getText: (d: any) => d.name,
      getSize: (d: any) => (d.isActive ? 11 : 8.5),
      getColor: (d: any) => (d.isActive ? [255, 255, 255, 240] : [148, 163, 184, 110]), // Bright white for active, muted slate for others
      getAngle: 0,
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'center',
      outlineWidth: 2,
      outlineColor: [7, 7, 15, 220],
      fontFamily: 'Inter, system-ui, sans-serif',
      fontWeight: ((d: any) => (d.isActive ? 'bold' : 'normal')) as any,
    }),
  ]

  return (
    <div className="w-full h-full relative">
      <DeckGL
        viewState={viewState}
        onViewStateChange={handleViewStateChange}
        controller={true}
        layers={layers}
        getCursor={({ isHovering }) => (isHovering ? 'pointer' : 'default')}
      />

      {/* Floating Control Overlays (Positioned vertically on the left side) */}
      <div className="absolute top-[170px] left-4 z-40 flex flex-col gap-2 bg-slate-950/85 backdrop-blur-md border border-white/10 p-2 rounded-2xl shadow-2xl pointer-events-auto">
        {/* Auto Rotate Toggle */}
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
            autoRotate 
              ? 'bg-violet-600 border-violet-500 text-white shadow-[0_0_12px_rgba(124,58,237,0.4)]' 
              : 'bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10'
          }`}
          title={autoRotate ? "Otomatik Dönüşü Durdur" : "Otomatik Dönüşü Başlat"}
        >
          {autoRotate ? <Pause size={14} /> : <Play size={14} />}
        </button>

        {/* Reset Camera */}
        <button
          onClick={() => {
            setViewState(INITIAL_VIEW_STATE)
            setIsInteracting(true)
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
            timeoutRef.current = setTimeout(() => setIsInteracting(false), 6000)
          }}
          className="p-2 rounded-xl border border-white/5 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer flex items-center justify-center"
          title="Kamerayı Sıfırla"
        >
          <Compass size={14} />
        </button>

        {/* Zoom In */}
        <button
          onClick={() => {
            setViewState((prev) => ({
              ...prev,
              zoom: Math.min(prev.maxZoom, prev.zoom + 0.5),
            }))
            setIsInteracting(true)
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
            timeoutRef.current = setTimeout(() => setIsInteracting(false), 6000)
          }}
          className="p-2 rounded-xl border border-white/5 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer flex items-center justify-center"
          title="Yakınlaş"
        >
          <Plus size={14} />
        </button>

        {/* Zoom Out */}
        <button
          onClick={() => {
            setViewState((prev) => ({
              ...prev,
              zoom: Math.max(prev.minZoom, prev.zoom - 0.5),
            }))
            setIsInteracting(true)
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
            timeoutRef.current = setTimeout(() => setIsInteracting(false), 6000)
          }}
          className="p-2 rounded-xl border border-white/5 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer flex items-center justify-center"
          title="Uzaklaş"
        >
          <Minus size={14} />
        </button>
      </div>

      {/* Tooltip Popup */}
      {hoverInfo && hoverInfo.object && (
        <div
          className="absolute z-50 bg-[#0c0c16]/95 border border-white/10 backdrop-blur-md rounded-xl p-3 shadow-2xl text-[11px] pointer-events-none text-slate-200"
          style={{
            left: hoverInfo.x + 15,
            top: hoverInfo.y + 15,
          }}
        >
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${hoverInfo.object.id === 'TR' ? 'bg-violet-500' : 'bg-amber-500'}`} />
            <b className="text-white text-xs font-black">{hoverInfo.object.name}</b>
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-1 font-semibold">
            {hoverInfo.object.count} Üye ({((hoverInfo.object.count / totalUsers) * 100).toFixed(1)}%)
          </div>
          {hoverInfo.object.id !== 'TR' && (
            <div className="text-[9px] text-violet-400 font-bold mt-1 select-none">
              HQ Bağlantısı Aktif
            </div>
          )}
        </div>
      )}
    </div>
  )
}
