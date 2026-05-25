import { getFullName } from '@/lib/profile-display'
import type { ProfileNameFields } from '@/lib/profile-display'
import { RoleBadge } from '@/components/havn/RoleBadge'
import type { Role } from '@/lib/mock-data'
import { cn } from '@/lib/utils'
import { Crown } from 'lucide-react'
import { isFounder } from '@/lib/founder'
import { getRankInfo } from '@/lib/gamification'

interface ProfileNameProps {
  profile: ProfileNameFields & { xp?: number }
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

function FounderBadge() {
  return (
    <span
      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-black tracking-wider shadow-sm bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-white border border-amber-600/30 select-none"
      title="Sistem Kurucusu"
    >
      <Crown size={9} className="fill-white" />
      KURUCU
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
  const fullName = getFullName(profile)
  const primary = fullName ?? profile.username
  const hasFullName = !!fullName

  if (layout === 'inline') {
    return (
      <div className={cn('flex items-center gap-1 flex-nowrap min-w-0 flex-1', className)}>
        <span className={cn('font-semibold text-xs truncate min-w-0 flex-shrink', nameClassName)}>{primary}</span>
        {isFounder(profile) && <span className="flex-shrink-0"><FounderBadge /></span>}
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
        {isFounder(profile) && <span className="flex-shrink-0"><FounderBadge /></span>}
        {role && <span className="flex-shrink-0"><RoleBadge role={role} /></span>}
        {streak !== undefined && streak > 0 && <span className="flex-shrink-0"><StreakBadge streak={streak} /></span>}
      </div>
      {hasFullName && showHandle && (
        <p className="text-xs text-muted-foreground truncate w-full">@{profile.username}</p>
      )}
    </div>
  )
}
