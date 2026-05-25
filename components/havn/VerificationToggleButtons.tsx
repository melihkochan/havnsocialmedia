'use client'

import { useState, useTransition } from 'react'
import { toggleProfileVerification } from '@/lib/actions/profile'
import { BadgeCheck, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VerificationToggleButtonsProps {
  targetUserId: string
  initialIsVerified: boolean
  initialIsGold: boolean
}

export function VerificationToggleButtons({
  targetUserId,
  initialIsVerified,
  initialIsGold
}: VerificationToggleButtonsProps) {
  const [isVerified, setIsVerified] = useState(initialIsVerified)
  const [isGold, setIsGold] = useState(initialIsGold)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleToggle = (type: 'verified' | 'gold') => {
    setError(null)
    startTransition(async () => {
      const res = await toggleProfileVerification(targetUserId, type)
      if (res.error) {
        setError(res.error)
      } else if (res.success) {
        if (type === 'verified') {
          setIsVerified(res.is_verified ?? false)
        } else if (type === 'gold') {
          setIsGold(res.is_gold ?? false)
        }
      }
    })
  }

  return (
    <div className="flex flex-col gap-1.5 items-end">
      <div className="flex gap-2 items-center">
        {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
        
        {/* Mavi Tik Butonu */}
        <button
          onClick={() => handleToggle('verified')}
          disabled={isPending}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all select-none duration-200 active:scale-95 disabled:opacity-50 cursor-pointer",
            isVerified
              ? "bg-[#0ea5e9]/10 border-[#0ea5e9]/30 text-[#0ea5e9] hover:bg-[#0ea5e9]/20"
              : "border-border/60 text-muted-foreground hover:bg-accent/40"
          )}
        >
          <BadgeCheck size={12} className={cn(isVerified ? "fill-[#0ea5e9] text-card" : "text-muted-foreground")} />
          Mavi Tik
        </button>

        {/* Sarı Tik Butonu */}
        <button
          onClick={() => handleToggle('gold')}
          disabled={isPending}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all select-none duration-200 active:scale-95 disabled:opacity-50 cursor-pointer",
            isGold
              ? "bg-[#eab308]/10 border-[#eab308]/30 text-[#eab308] hover:bg-[#eab308]/20"
              : "border-border/60 text-muted-foreground hover:bg-accent/40"
          )}
        >
          <BadgeCheck size={12} className={cn(isGold ? "fill-[#eab308] text-card" : "text-muted-foreground")} />
          Sarı Tik
        </button>
      </div>
      {error && <span className="text-[9px] font-semibold text-red-500">{error}</span>}
    </div>
  )
}
