'use client'

import React, { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Calendar, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserUnlockedBadge } from '@/lib/actions/badges'
import { toggleBadgeVisibility } from '@/lib/actions/badges'
import { BadgeGraphic } from '@/components/havn/BadgeGraphic'

interface ProfileBadgesShowcaseProps {
  initialBadges: UserUnlockedBadge[]
  isOwnProfile: boolean
  level: number
  xp: number
  rankName: string
  xpNeededForNext: number
  progressPercent: number
  showXp: boolean
}

export function ProfileBadgesShowcase({
  initialBadges,
  isOwnProfile,
  level,
  xp,
  rankName,
  xpNeededForNext,
  progressPercent,
  showXp
}: ProfileBadgesShowcaseProps) {
  const [badges, setBadges] = useState<UserUnlockedBadge[]>(initialBadges)
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Filter visible badges for guests, show all (with lower opacity for hidden ones) for owner
  const displayBadges = isOwnProfile ? badges : badges.filter(b => b.is_visible)

  const handleToggleVisibility = async (badgeId: string, currentVisible: boolean) => {
    if (!isOwnProfile || badgeId === 'level_badge') return

    // Optimistically update local state
    setBadges(prev =>
      prev.map(b => (b.id === badgeId ? { ...b, is_visible: !currentVisible } : b))
    )

    startTransition(async () => {
      const res = await toggleBadgeVisibility(badgeId, !currentVisible)
      if (res.error) {
        // Rollback on error
        setBadges(prev =>
          prev.map(b => (b.id === badgeId ? { ...b, is_visible: currentVisible } : b))
        )
      }
    })
  }

  // Prepend the virtual Level Badge if XP visibility is active or if viewing own profile
  const allDisplayBadges = [
    ...(showXp || isOwnProfile
      ? [{
          id: 'level_badge',
          title: `Seviye ${level}`,
          description: `${rankName}`,
          gradient: level >= 31 
            ? 'from-amber-400 via-yellow-500 to-orange-500' 
            : level >= 16 
            ? 'from-purple-500 via-pink-500 to-indigo-500' 
            : level >= 6 
            ? 'from-emerald-400 to-teal-600'
            : 'from-sky-400 to-blue-600',
          bg_color: 'bg-primary/10',
          border_color: 'border-primary/20',
          glow: level >= 31 
            ? 'shadow-[0_0_8px_rgba(245,158,11,0.35)]' 
            : level >= 16 
            ? 'shadow-[0_0_8px_rgba(168,85,247,0.25)]' 
            : level >= 6 
            ? 'shadow-[0_0_8px_rgba(16,185,129,0.2)]'
            : 'shadow-[0_0_8px_rgba(14,165,233,0.15)]',
          is_visible: true,
          unlocked_at: '',
          current_tier: 1,
          max_tiers: 1
        }]
      : []),
    ...displayBadges
  ]

  return (
    <div className="relative z-[100] flex flex-wrap items-center gap-2.5 select-none py-1.5">
      {allDisplayBadges.map((badge) => {
        const isTooltipActive = activeTooltip === badge.id
        const isLevel = badge.id === 'level_badge'
        const unlockedDate = badge.unlocked_at
          ? new Date(badge.unlocked_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
          : ''

        return (
          <div
            key={badge.id}
            className="relative"
            onMouseEnter={() => setActiveTooltip(badge.id)}
            onMouseLeave={() => setActiveTooltip(null)}
          >
            <motion.button
              onClick={() => {
                if (isOwnProfile && !isLevel && !isPending) {
                  handleToggleVisibility(badge.id, badge.is_visible)
                }
              }}
              whileHover={{ scale: 1.15 }}
              whileTap={isOwnProfile && !isLevel && !isPending ? { scale: 0.92 } : {}}
              className={cn(
                "relative transition-all flex items-center justify-center select-none overflow-visible",
                isOwnProfile && !isLevel ? "cursor-pointer" : "cursor-default",
                isLevel
                  ? ""
                  : badge.is_visible
                  ? "hover:opacity-90"
                  : "opacity-30 grayscale hover:opacity-50"
              )}
            >
              {/* High-Fidelity SVG Badge Icon */}
              <BadgeGraphic
                id={badge.id}
                size={36}
                className="relative z-10"
                glowing={badge.is_visible}
                level={level}
                tier={badge.current_tier}
              />

              {/* Small Corner Indicator for hidden badges (visible only to owner) */}
              {isOwnProfile && !isLevel && !badge.is_visible && (
                <div className="absolute -bottom-1 -right-1 bg-background border border-border rounded-full p-0.5 z-20 shadow-sm flex items-center justify-center">
                  <EyeOff size={8} className="text-muted-foreground" />
                </div>
              )}
            </motion.button>

            {/* Premium Achievement / Level Tooltip */}
            <AnimatePresence>
              {isTooltipActive && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.96 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-56 bg-[#090911]/98 border border-white/[0.08] text-white rounded-2xl p-4 shadow-[0_12px_32px_rgba(0,0,0,0.6)] z-[9999] text-center pointer-events-none select-none"
                >
                  {/* Decorative glowing backplate */}
                  <div className="absolute inset-x-0 -bottom-8 h-16 bg-gradient-to-t from-primary/10 to-transparent blur-xl rounded-full pointer-events-none" />

                  {/* Icon Graphic */}
                  <BadgeGraphic
                    id={badge.id}
                    size={isLevel ? 56 : 60}
                    className="mx-auto mb-2 relative z-10"
                    glowing={badge.is_visible}
                    level={level}
                    tier={badge.current_tier}
                  />

                  <div className="relative z-10 space-y-1">
                    {isLevel ? (
                      // Custom Tooltip details for Dynamic Level Badge
                      <>
                        <h4 className="font-black text-white text-xs tracking-wider uppercase">
                          {badge.title}
                        </h4>
                        <p className="text-slate-300 font-bold text-[10px] flex items-center justify-center gap-1">
                          <ShieldCheck size={11} className="text-amber-500 fill-amber-500/10" /> {badge.description}
                        </p>
                        
                        {/* Level Progress Bar inside Tooltip */}
                        <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden relative border border-white/[0.04] mt-2.5 mb-1.5">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              level >= 31 ? "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600" :
                              level >= 16 ? "bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500" :
                              level >= 6 ? "bg-gradient-to-r from-emerald-500 to-teal-500" :
                              "bg-gradient-to-r from-sky-500 to-blue-500"
                            )}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold">
                          <span>{xp} XP</span>
                          <span>Sonraki Seviyeye {xpNeededForNext} XP</span>
                        </div>
                      </>
                    ) : (
                      // Standard Tooltip details for Milestones
                      <>
                        <h4 className="font-black text-white text-xs tracking-wider flex items-center justify-center gap-1.5">
                          <span>{badge.title}</span>
                          {!badge.is_visible && (
                            <span className="text-[7px] font-black text-rose-400 uppercase bg-rose-500/10 px-1 py-0.2 rounded border border-rose-500/20">Gizli</span>
                          )}
                        </h4>
                        
                        <p className="text-slate-300 font-medium text-[10px] leading-relaxed px-1">
                          {badge.description}
                        </p>

                        {badge.max_tiers > 1 && (
                          <div className="text-[8px] font-black text-primary uppercase tracking-wider bg-primary/5 border border-primary/10 rounded-md py-0.5 px-1.5 w-max mx-auto mt-1.5">
                            Kademe {badge.current_tier} / {badge.max_tiers}
                          </div>
                        )}
                        
                        {unlockedDate && (
                          <p className="text-slate-500 text-[8px] mt-2 pt-2 border-t border-white/[0.06] flex items-center justify-center gap-1 font-bold uppercase tracking-wider">
                            <Calendar size={9} className="text-slate-400" /> {unlockedDate} kazanıldı
                          </p>
                        )}

                        {isOwnProfile && (
                          <p className="text-primary text-[8px] mt-1.5 font-bold uppercase tracking-wider animate-pulse pt-0.5">
                            {badge.is_visible ? 'Gizlemek için tıklayın' : 'Göstermek için tıklayın'}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
