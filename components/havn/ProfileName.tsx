'use client'

import { useRouter } from 'next/navigation'
import { getFullName } from '@/lib/profile-display'
import type { ProfileNameFields } from '@/lib/profile-display'
import { RoleBadge } from '@/components/havn/RoleBadge'
import type { Role } from '@/lib/mock-data'
import { cn } from '@/lib/utils'
import { Crown, BadgeCheck } from 'lucide-react'
import { isFounder } from '@/lib/founder'
import { getRankInfo } from '@/lib/gamification'
import { enrichProfile } from '@/lib/profile-enrich'

interface ProfileNameProps {
  profile: ProfileNameFields & { xp?: number; is_verified?: boolean; is_gold?: boolean }
  role?: Role
  className?: string
  nameClassName?: string
  showHandle?: boolean
  layout?: 'stacked' | 'inline'
  streak?: number
  align?: 'left' | 'center'
}

function LevelBadge({ xp }: { xp?: number }) {
  if (xp === undefined) return null
  const rank = getRankInfo(xp)
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[8px] font-black tracking-wider shadow-sm select-none border backdrop-blur-md transition-all",
        rank.badgeClass
      )}
      style={rank.badgeStyle}
      title={`Seviye ${rank.level} — ${rank.rankName} (${xp} XP)`}
    >
      SEVİYE {rank.level}
    </span>
  )
}

function StreakBadge({ streak }: { streak?: number }) {
  if (!streak || streak <= 0) return null

  let colorClass = "text-orange-500 drop-shadow-[0_0_4px_rgba(249,115,22,0.35)]"
  let textStyle = { color: '#f97316' }

  if (streak >= 150) {
    colorClass = "animate-pulse drop-shadow-[0_0_8px_rgba(168,85,247,0.7)]"
    textStyle = {
      background: 'linear-gradient(45deg, #ec4899, #8b5cf6, #3b82f6, #eab308)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    } as any
  } else if (streak >= 100) {
    colorClass = "animate-pulse text-yellow-500 drop-shadow-[0_0_6px_rgba(234,179,8,0.55)]"
    textStyle = { color: '#eab308' }
  } else if (streak >= 50) {
    colorClass = "text-pink-500 drop-shadow-[0_0_5px_rgba(236,72,153,0.5)]"
    textStyle = { color: '#ec4899' }
  } else if (streak >= 10) {
    colorClass = "text-red-500 drop-shadow-[0_0_4px_rgba(239,68,68,0.45)]"
    textStyle = { color: '#ef4444' }
  }

  return (
    <span className="inline-flex items-center gap-0.5 ml-1 px-1.5 py-0.5 rounded-full bg-card/60 border border-border/80 text-[9px] font-black tracking-tighter select-none align-middle shadow-sm">
      <span className={cn("text-[10px] leading-none", colorClass)}>🔥</span>
      <span style={textStyle}>{streak}</span>
    </span>
  )
}

export function ProfileName({
  profile,
  role,
  className,
  nameClassName,
  showHandle = true,
  layout = 'stacked',
  streak,
  align = 'left',
}: ProfileNameProps) {
  const router = useRouter()
  const fullName = getFullName(profile)
  const primary = fullName ?? profile.username
  const hasFullName = !!fullName

  const enriched = profile ? enrichProfile(profile) : null
  const isVerified = enriched?.is_verified ?? profile?.is_verified
  const isGold = (enriched?.is_gold ?? profile?.is_gold) || isFounder(profile)
  const isHLogoUser = profile && (profile.username === 'melih' || profile.username === 'havn')

  if (layout === 'inline') {
    return (
      <div className={cn('flex items-center gap-1 flex-nowrap min-w-0 flex-1', className)}>
        <span className={cn('font-semibold text-xs truncate min-w-0 flex-shrink', nameClassName)}>{primary}</span>
        {isHLogoUser && (
          <span
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              router.push('/profile/havn')
            }}
            className="flex-shrink-0 align-middle inline-flex items-center justify-center w-3.5 h-3.5 rounded bg-gradient-to-tr from-yellow-400 via-amber-500 to-yellow-600 text-black border border-amber-400/30 shadow-[0_0_6px_rgba(245,158,11,0.55)] cursor-pointer hover:scale-110 active:scale-95 transition-all select-none"
            title="HAVN Resmi Ortaklığı"
          >
            <span className="text-[9px] font-black text-black leading-none font-mono">H</span>
          </span>
        )}
        {(isHLogoUser || isGold) && (
          <span className="flex-shrink-0 align-middle inline-flex cursor-help" title="Özel Hesap / Sistem Ortağı: HAVN ekibine veya resmi iş ortaklarına aittir.">
            <BadgeCheck size={14} className="fill-[#eab308] text-background drop-shadow-[0_0_4px_rgba(234,179,8,0.5)]" />
          </span>
        )}
        {!isHLogoUser && !isGold && isVerified && (
          <span className="flex-shrink-0 align-middle inline-flex cursor-help" title="Doğrulanmış Üye: HAVN topluluğunun aktif ve onaylanmış bir üyesidir.">
            <BadgeCheck size={14} className="fill-[#0ea5e9] text-background drop-shadow-[0_0_4px_rgba(14,165,233,0.5)]" />
          </span>
        )}
        {role && <span className="flex-shrink-0"><RoleBadge role={role} /></span>}
        {streak !== undefined && streak > 0 && <span className="flex-shrink-0"><StreakBadge streak={streak} /></span>}
        {hasFullName && showHandle && (
          <span className="text-[10px] text-muted-foreground truncate min-w-0 flex-shrink-0">@{profile.username}</span>
        )}
      </div>
    )
  }

  return (
    <div className={cn('min-w-0 w-full', align === 'center' ? 'text-center flex flex-col items-center' : '', className)}>
      <div className={cn('flex items-center gap-1.5 flex-nowrap min-w-0 w-full', align === 'center' ? 'justify-center' : '')}>
        <span className={cn('font-semibold text-sm truncate min-w-0 flex-shrink', nameClassName)}>{primary}</span>
        {isHLogoUser && (
          <span
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              router.push('/profile/havn')
            }}
            className="flex-shrink-0 align-middle inline-flex items-center justify-center w-4 h-4 rounded bg-gradient-to-tr from-yellow-400 via-amber-500 to-yellow-600 text-black border border-amber-400/30 shadow-[0_0_8px_rgba(245,158,11,0.55)] cursor-pointer hover:scale-110 active:scale-95 transition-all select-none"
            title="HAVN Resmi Ortaklığı"
          >
            <span className="text-[10px] font-black text-black leading-none font-mono">H</span>
          </span>
        )}
        {(isHLogoUser || isGold) && (
          <span className="flex-shrink-0 align-middle inline-flex cursor-help" title="Özel Hesap / Sistem Ortağı: HAVN ekibine veya resmi iş ortaklarına aittir.">
            <BadgeCheck size={14} className="fill-[#eab308] text-background drop-shadow-[0_0_4px_rgba(234,179,8,0.5)]" />
          </span>
        )}
        {!isHLogoUser && !isGold && isVerified && (
          <span className="flex-shrink-0 align-middle inline-flex cursor-help" title="Doğrulanmış Üye: HAVN topluluğunun aktif ve onaylanmış bir üyesidir.">
            <BadgeCheck size={14} className="fill-[#0ea5e9] text-background drop-shadow-[0_0_4px_rgba(14,165,233,0.5)]" />
          </span>
        )}
        {role && <span className="flex-shrink-0"><RoleBadge role={role} /></span>}
        {streak !== undefined && streak > 0 && <span className="flex-shrink-0"><StreakBadge streak={streak} /></span>}
      </div>
      {hasFullName && showHandle && (
        <p className="text-xs text-muted-foreground truncate w-full">@{profile.username}</p>
      )}
    </div>
  )
}
