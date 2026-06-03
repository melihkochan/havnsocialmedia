import React from 'react'
import * as Icons from 'lucide-react'
import { cn } from '@/lib/utils'

interface BadgeGraphicProps {
  id: string
  size?: number
  className?: string
  glowing?: boolean
  level?: number // User's actual level (e.g. 31) for the dynamic level_badge
  tier?: number  // Active tier level (1, 2, 3, 4) for tiered badges
}

export function BadgeGraphic({ id, size = 42, className = "", glowing = true, level = 1, tier = 1 }: BadgeGraphicProps) {
  // Resolve unique gradient IDs to prevent conflicts
  const gradId = `grad_${id}_t${tier}_${level}`
  const innerGradId = `inner_grad_${id}_t${tier}_${level}`
  const borderGradId = `border_grad_${id}_t${tier}_${level}`

  // Glow filters based on badge and tier
  const glowStyle = glowing ? {
    filter: id === 'level_badge'
      ? (level >= 31 ? 'drop-shadow(0 0 5px rgba(245, 158, 11, 0.6))' : level >= 16 ? 'drop-shadow(0 0 4px rgba(168, 85, 247, 0.5))' : level >= 6 ? 'drop-shadow(0 0 3px rgba(16, 185, 129, 0.4))' : 'drop-shadow(0 0 3px rgba(14, 165, 233, 0.4))')
      : id === 'aranan_yuz'
      ? (tier === 4 ? 'drop-shadow(0 0 7px rgba(217, 70, 239, 0.65))' : tier === 3 ? 'drop-shadow(0 0 5px rgba(245, 158, 11, 0.5))' : 'drop-shadow(0 0 3px rgba(148, 163, 184, 0.3))')
      : id === 'icerik_ureticisi'
      ? (tier === 4 ? 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.7))' : tier === 3 ? 'drop-shadow(0 0 5px rgba(244, 63, 94, 0.5))' : 'drop-shadow(0 0 3px rgba(45, 212, 191, 0.3))')
      : id === 'topluluk_gezgini'
      ? (tier === 2 ? 'drop-shadow(0 0 5px rgba(124, 58, 237, 0.5))' : 'drop-shadow(0 0 3px rgba(96, 165, 250, 0.3))')
      : id === 'soluksuz_buyume'
      ? (tier === 2 ? 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.55))' : 'drop-shadow(0 0 3px rgba(163, 230, 53, 0.3))')
      : id === 'ilk_kan' ? 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.45))'
      : id === 'gece_kusu' ? 'drop-shadow(0 0 5px rgba(168, 85, 247, 0.55))'
      : id === 'gorsel_deha'
      ? (tier === 2 ? 'drop-shadow(0 0 5px rgba(236, 72, 153, 0.5))' : 'drop-shadow(0 0 3px rgba(56, 189, 248, 0.3))')
      : id === 'fikir_onderi' ? 'drop-shadow(0 0 5px rgba(245, 158, 11, 0.5))'
      : id === 'veteran'
      ? (tier === 3 ? 'drop-shadow(0 0 7px rgba(239, 68, 68, 0.6))' : 'drop-shadow(0 0 3px rgba(6, 182, 212, 0.3))')
      : 'drop-shadow(0 0 3px rgba(255, 255, 255, 0.2))'
  } : {}

  // Render SVG graphics
  const renderGraphic = () => {
    if (id === 'level_badge') {
      // Dynamic Level Starburst Badge (like the 196 badge in the user's screenshot)
      let startColor = '#0ea5e9'
      let endColor = '#1d4ed8'
      let borderStart = '#38bdf8'
      let borderEnd = '#1e3a8a'
      let textFill = '#f0f9ff'

      if (level >= 31) {
        // Gold/Amber (Legendary)
        startColor = '#fbbf24'
        endColor = '#ea580c'
        borderStart = '#fef08a'
        borderEnd = '#7c2d12'
        textFill = '#fffbeb'
      } else if (level >= 16) {
        // Epic Purple
        startColor = '#d946ef'
        endColor = '#4a044e'
        borderStart = '#f472b6'
        borderEnd = '#2e0233'
        textFill = '#fdf2f8'
      } else if (level >= 6) {
        // Emerald Green
        startColor = '#10b981'
        endColor = '#064e3b'
        borderStart = '#a7f3d0'
        borderEnd = '#022c22'
        textFill = '#ecfdf5'
      }

      return (
        <svg viewBox="0 0 100 100" width={size} height={size} style={glowStyle} className="select-none">
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={startColor} />
              <stop offset="100%" stopColor={endColor} />
            </linearGradient>
            <linearGradient id={borderGradId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={borderStart} />
              <stop offset="100%" stopColor={borderEnd} />
            </linearGradient>
          </defs>
          {/* Jagged starburst frame */}
          <path
            d="M50 4 L59 18 L75 12 L78 28 L94 28 L88 44 L98 56 L84 64 L86 80 L70 78 L62 92 L50 82 L38 92 L30 78 L14 80 L16 64 L2 56 L12 44 L6 28 L22 28 L25 12 L41 18 Z"
            fill={`url(#${gradId})`}
            stroke={`url(#${borderGradId})`}
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          <circle cx="50" cy="50" r="26" fill="#07070d" opacity="0.8" />
          <circle cx="50" cy="50" r="22" fill={`url(#${gradId})`} opacity="0.15" />
          {/* Level number */}
          <text
            x="50"
            y="57"
            fill={textFill}
            fontSize="21"
            fontWeight="950"
            textAnchor="middle"
            fontFamily="system-ui, -apple-system, sans-serif"
            letterSpacing="-0.5"
          >
            {level}
          </text>
        </svg>
      )
    }

    // SVG shape templates for other tiered badges
    switch (id) {
      case 'aranan_yuz': {
        // Users Icon Emblem
        // Tier 1: Bronze Amber, Tier 2: Slate Silver, Tier 3: Gold/Orange, Tier 4: Cyan/Fuchsia Epic
        const grads = [
          { start: '#b45309', end: '#451a03', bStart: '#f59e0b', bEnd: '#451a03' }, // Tier 1
          { start: '#64748b', end: '#334155', bStart: '#94a3b8', bEnd: '#1e293b' }, // Tier 2
          { start: '#fbbf24', end: '#ea580c', bStart: '#fef08a', bEnd: '#7c2d12' }, // Tier 3
          { start: '#06b6d4', end: '#4a044e', bStart: '#d946ef', bEnd: '#1e1b4b' }  // Tier 4
        ]
        const c = grads[tier - 1] || grads[0]

        // Shield frame path
        const framePath = "M50 5 L85 20 V55 C85 75 70 90 50 95 C30 90 15 75 15 55 V20 Z"

        return (
          <svg viewBox="0 0 100 100" width={size} height={size} style={glowStyle} className="select-none">
            <defs>
              <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={c.start} />
                <stop offset="100%" stopColor={c.end} />
              </linearGradient>
              <linearGradient id={borderGradId} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={c.bStart} />
                <stop offset="100%" stopColor={c.bEnd} />
              </linearGradient>
            </defs>
            <path d={framePath} fill={`url(#${gradId})`} stroke={`url(#${borderGradId})`} strokeWidth="4" strokeLinejoin="round" />
            <path d="M50 12 L77 24 V52 C77 68 65 82 50 86 C35 82 23 68 23 52 V24 Z" fill="#08080f" opacity="0.75" />
            {/* Users silhouettes */}
            <path d="M38 52 C43 52 47 48 47 43 C47 38 43 34 38 34 C33 34 29 38 29 43 C29 48 33 52 38 52 Z M38 56 C31 56 22 60 22 67 V72 H54 V67 C54 60 45 56 38 56 Z" fill="#fff" opacity={tier >= 3 ? 0.9 : 0.75} />
            <path d="M62 48 C66.5 48 70 44.5 70 40 C70 35.5 66.5 32 62 32 C57.5 32 54 35.5 54 40 C54 44.5 57.5 48 62 48 Z M62 52 C56.5 52 49 55.5 49 61.5 V66 H75 V61.5 C75 55.5 67.5 52 62 52 Z" fill="#fff" opacity={tier >= 3 ? 0.95 : 0.8} />
          </svg>
        )
      }

      case 'icerik_ureticisi': {
        // Flame Icon Emblem
        const grads = [
          { start: '#78716c', end: '#292524', bStart: '#a8a29e', bEnd: '#1c1917' }, // Tier 1
          { start: '#0d9488', end: '#064e3b', bStart: '#2dd4bf', bEnd: '#022c22' }, // Tier 2
          { start: '#f43f5e', end: '#7c2d12', bStart: '#fecdd3', bEnd: '#ea580c' }, // Tier 3
          { start: '#9333ea', end: '#450a0a', bStart: '#f472b6', bEnd: '#ef4444' }  // Tier 4
        ]
        const c = grads[tier - 1] || grads[0]

        // Diamond frame path
        const framePath = "M50 5 L91 46 L50 87 L9 46 Z"

        return (
          <svg viewBox="0 0 100 100" width={size} height={size} style={glowStyle} className="select-none">
            <defs>
              <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={c.start} />
                <stop offset="100%" stopColor={c.end} />
              </linearGradient>
              <linearGradient id={borderGradId} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={c.bStart} />
                <stop offset="100%" stopColor={c.bEnd} />
              </linearGradient>
            </defs>
            <path d={framePath} fill={`url(#${gradId})`} stroke={`url(#${borderGradId})`} strokeWidth="4" strokeLinejoin="round" />
            <path d="M50 14 L81 46 L50 78 L19 46 Z" fill="#08080f" opacity="0.75" />
            {/* Blazing Flame */}
            <path d="M50 22 C50 22 62 34 62 44 C62 54 57 60 50 60 C43 60 38 54 38 44 C38 34 50 22 50 22 Z" fill={tier >= 3 ? '#ff4500' : '#d97706'} />
            <path d="M50 30 C50 30 57 40 57 46 C57 52 54 56 50 56 C46 56 43 52 43 46 C43 40 50 30 50 30 Z" fill={tier >= 3 ? '#ffa500' : '#fbbf24'} />
            <path d="M50 38 C50 38 53 44 53 48 C53 51 51 52 50 52 C49 52 47 48 47 48 C47 44 50 38 50 38 Z" fill="#fff" opacity="0.8" />
          </svg>
        )
      }

      case 'topluluk_gezgini': {
        // Compass Circle
        const grads = [
          { start: '#2563eb', end: '#0c4a6e', bStart: '#60a5fa', bEnd: '#075985' }, // Tier 1
          { start: '#7c3aed', end: '#2e1065', bStart: '#c084fc', bEnd: '#4c1d95' }  // Tier 2
        ]
        const c = grads[tier - 1] || grads[0]

        return (
          <svg viewBox="0 0 100 100" width={size} height={size} style={glowStyle} className="select-none">
            <defs>
              <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={c.start} />
                <stop offset="100%" stopColor={c.end} />
              </linearGradient>
              <linearGradient id={borderGradId} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={c.bStart} />
                <stop offset="100%" stopColor={c.bEnd} />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="44" fill={`url(#${gradId})`} stroke={`url(#${borderGradId})`} strokeWidth="4" />
            <circle cx="50" cy="50" r="37" fill="#08080f" opacity="0.75" />
            {/* Compass rose */}
            <path d="M50 20 L55 45 L80 50 L55 55 L50 80 L45 55 L20 50 L45 45 Z" fill="#fff" opacity="0.8" />
            <path d="M50 20 L50 50 L80 50 Z M50 80 L50 50 L20 50 Z" fill="#000" opacity="0.15" />
            <circle cx="50" cy="50" r="5" fill={tier === 2 ? '#c084fc' : '#60a5fa'} />
          </svg>
        )
      }

      case 'soluksuz_buyume': {
        // ChevronsUp Hexagon
        const grads = [
          { start: '#65a30d', end: '#14532d', bStart: '#a3e635', bEnd: '#14532d' }, // Tier 1
          { start: '#d97706', end: '#7c2d12', bStart: '#fbbf24', bEnd: '#7c2d12' }  // Tier 2
        ]
        const c = grads[tier - 1] || grads[0]

        return (
          <svg viewBox="0 0 100 100" width={size} height={size} style={glowStyle} className="select-none">
            <defs>
              <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={c.start} />
                <stop offset="100%" stopColor={c.end} />
              </linearGradient>
              <linearGradient id={borderGradId} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={c.bStart} />
                <stop offset="100%" stopColor={c.bEnd} />
              </linearGradient>
            </defs>
            <path d="M50 5 L88 27 V71 L50 93 L12 71 V27 Z" fill={`url(#${gradId})`} stroke={`url(#${borderGradId})`} strokeWidth="4" strokeLinejoin="round" />
            <path d="M50 12 L80 29 V67 L50 84 L20 67 V29 Z" fill="#08080f" opacity="0.75" />
            {/* Multiple Chevron paths pointing up */}
            <path d="M32 60 L50 42 L68 60" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" opacity="0.75" />
            <path d="M32 46 L50 28 L68 46" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )
      }

      case 'ilk_kan': {
        // Red Drop Shield
        return (
          <svg viewBox="0 0 100 100" width={size} height={size} style={glowStyle} className="select-none">
            <defs>
              <linearGradient id="shield-grad-red" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#7f1d1d" />
              </linearGradient>
              <linearGradient id="border-grad-red" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fca5a5" />
                <stop offset="100%" stopColor="#7f1d1d" />
              </linearGradient>
            </defs>
            <path d="M50 5 L85 20 V55 C85 75 70 90 50 95 C30 90 15 75 15 55 V20 Z" fill="url(#shield-grad-red)" stroke="url(#border-grad-red)" strokeWidth="4" strokeLinejoin="round" />
            <path d="M50 12 L77 24 V52 C77 68 65 82 50 86 C35 82 23 68 23 52 V24 Z" fill="#08080f" opacity="0.75" />
            <path d="M50 30 C58 42 64 48 64 56 C64 64 58 70 50 70 C42 70 36 64 36 56 C36 48 42 42 50 30 Z" fill="#ef4444" />
            <path d="M47 38 C51 45 54 49 54 53 C54 56 52 58 48 58 C45 57 43 54 42 51 Z" fill="#fee2e2" opacity="0.5" />
          </svg>
        )
      }

      case 'gece_kusu': {
        // Crescent Moon Circle
        return (
          <svg viewBox="0 0 100 100" width={size} height={size} style={glowStyle} className="select-none">
            <defs>
              <linearGradient id="circle-grad-purple" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="50%" stopColor="#3b0764" />
                <stop offset="100%" stopColor="#1e1b4b" />
              </linearGradient>
              <linearGradient id="border-grad-purple" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#d946ef" />
                <stop offset="100%" stopColor="#4f46e5" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="44" fill="url(#circle-grad-purple)" stroke="url(#border-grad-purple)" strokeWidth="4" />
            <circle cx="50" cy="50" r="37" fill="#08080f" opacity="0.75" />
            <circle cx="35" cy="30" r="1.5" fill="#fff" opacity="0.8" />
            <circle cx="68" cy="28" r="1" fill="#fff" opacity="0.6" />
            <circle cx="30" cy="62" r="1" fill="#fff" opacity="0.5" />
            <circle cx="64" cy="68" r="1.5" fill="#fff" opacity="0.7" />
            <path d="M58 32 C42 32 30 45 30 60 C30 72 38 82 50 82 C40 76 38 64 44 54 C50 44 60 40 68 44 C68 37 64 32 58 32 Z" fill="#a855f7" />
            <path d="M35 58 C35 48 43 38 52 36 C42 41 38 51 40 60 C42 68 47 72 50 74 C42 74 35 68 35 58 Z" fill="#e0e7ff" opacity="0.4" />
          </svg>
        )
      }

      case 'gorsel_deha': {
        // Photo Frame / Camera
        const grads = [
          { start: '#0284c7', end: '#0c4a6e', bStart: '#38bdf8', bEnd: '#0c4a6e' }, // Tier 1
          { start: '#db2777', end: '#4d05e8', bStart: '#f472b6', bEnd: '#4d05e8' }  // Tier 2
        ]
        const c = grads[tier - 1] || grads[0]

        return (
          <svg viewBox="0 0 100 100" width={size} height={size} style={glowStyle} className="select-none">
            <defs>
              <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={c.start} />
                <stop offset="100%" stopColor={c.end} />
              </linearGradient>
              <linearGradient id={borderGradId} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={c.bStart} />
                <stop offset="100%" stopColor={c.bEnd} />
              </linearGradient>
            </defs>
            {/* Hexagon */}
            <path d="M50 5 L88 27 V71 L50 93 L12 71 V27 Z" fill={`url(#${gradId})`} stroke={`url(#${borderGradId})`} strokeWidth="4" strokeLinejoin="round" />
            <path d="M50 12 L80 29 V67 L50 84 L20 67 V29 Z" fill="#08080f" opacity="0.75" />
            {/* Camera icon graphic */}
            <path d="M30 40 H40 L44 34 H56 L60 40 H70 C72.2 40 74 41.8 74 44 V68 C74 70.2 72.2 72 70 72 H30 C27.8 72 26 70.2 26 68 V44 C26 41.8 27.8 40 30 40 Z" fill="#fff" opacity="0.8" />
            <circle cx="50" cy="56" r="10" fill={`url(#${gradId})`} stroke="#fff" strokeWidth="2.5" />
          </svg>
        )
      }

      case 'fikir_onderi': {
        // Golden bulb starburst
        return (
          <svg viewBox="0 0 100 100" width={size} height={size} style={glowStyle} className="select-none">
            <defs>
              <linearGradient id="star-grad-gold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#ea580c" />
              </linearGradient>
              <linearGradient id="border-grad-gold" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="100%" stopColor="#7c2d12" />
              </linearGradient>
            </defs>
            <path d="M50 6 L62 26 L84 26 L74 46 L88 64 L66 68 L50 88 L34 68 L12 64 L26 46 L16 26 L38 26 Z" fill="url(#star-grad-gold)" stroke="url(#border-grad-gold)" strokeWidth="4" strokeLinejoin="round" />
            <circle cx="50" cy="48" r="26" fill="#08080f" opacity="0.75" />
            <path d="M50 28 C41 28 36 34 36 43 C36 49 40 52 42 55 L44 62 H56 L58 55 C60 52 64 49 64 43 C64 34 59 28 50 28 Z" fill="#fbbf24" />
            <rect x="46" y="64" width="8" height="3" rx="1.5" fill="#ea580c" />
            <rect x="48" y="69" width="4" height="2" rx="1" fill="#7c2d12" />
            <path d="M47 42 L50 36 L53 42" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )
      }

      case 'veteran': {
        // Shield badge based on years
        const grads = [
          { start: '#475569', end: '#1e293b', bStart: '#cbd5e1', bEnd: '#0f172a' }, // Tier 1
          { start: '#0284c7', end: '#1e3a8a', bStart: '#38bdf8', bEnd: '#0c4a6e' }, // Tier 2
          { start: '#d97706', end: '#581c87', bStart: '#fef08a', bEnd: '#f43f5e' }  // Tier 3
        ]
        const c = grads[tier - 1] || grads[0]

        // Shield frame path
        const framePath = "M50 5 L88 20 L80 60 L50 90 L20 60 L12 20 Z"

        return (
          <svg viewBox="0 0 100 100" width={size} height={size} style={glowStyle} className="select-none">
            <defs>
              <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={c.start} />
                <stop offset="100%" stopColor={c.end} />
              </linearGradient>
              <linearGradient id={borderGradId} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={c.bStart} />
                <stop offset="100%" stopColor={c.bEnd} />
              </linearGradient>
            </defs>
            <path d={framePath} fill={`url(#${gradId})`} stroke={`url(#${borderGradId})`} strokeWidth="4" strokeLinejoin="round" />
            <path d="M50 12 L79 25 L73 57 L50 81 L27 57 L21 25 Z" fill="#08080f" opacity="0.8" />
            
            {/* Laurels / leaves overlay on higher tiers */}
            {tier >= 2 && (
              <path d="M30 35 C25 45 25 55 30 65 M70 35 C75 45 75 55 70 65" fill="none" stroke="#fff" strokeWidth="2.5" strokeDasharray="3 3" opacity="0.6" />
            )}
            
            {/* Shield emblem center */}
            <path d="M50 25 L65 35 V52 C65 62 55 72 50 75 C45 72 35 62 35 52 V35 Z" fill="#fff" opacity="0.85" />
            <text x="50" y="55" fill={c.start} fontSize="22" fontWeight="950" textAnchor="middle" fontFamily="system-ui">{tier}</text>
          </svg>
        )
      }

      default:
        // Generic fallback using dynamic icons from lucide
        const LucideIcon = (Icons as any)[id] || Icons.Sparkles
        return (
          <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center text-foreground shadow-sm">
            <LucideIcon size={18} />
          </div>
        )
    }
  }

  return (
    <div className={cn("inline-flex shrink-0 select-none items-center justify-center", className)}>
      {renderGraphic()}
    </div>
  )
}
