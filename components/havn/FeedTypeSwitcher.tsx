'use client'

import Link from 'next/link'
import { startTransition } from 'react'
import { updateDefaultFeedType } from '@/lib/actions/profile'

interface FeedTypeSwitcherProps {
  activeFeedType: 'for_you' | 'following'
  activeSort: string
}

export function FeedTypeSwitcher({ activeFeedType, activeSort }: FeedTypeSwitcherProps) {
  const handleSwitch = (type: 'for_you' | 'following') => {
    startTransition(async () => {
      await updateDefaultFeedType(type)
    })
  }

  return (
    <div className="flex items-center gap-1 p-1 bg-card/60 backdrop-blur-md border border-border/80 rounded-2xl shadow-sm select-none">
      <Link
        href={`/feed?feedType=for_you&sortBy=${activeSort}`}
        onClick={() => handleSwitch('for_you')}
        className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all duration-200 ${
          activeFeedType === 'for_you'
            ? 'text-white shadow-md font-black'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        style={activeFeedType === 'for_you' ? { background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))' } : {}}
      >
        Sizin İçin
      </Link>
      <Link
        href={`/feed?feedType=following&sortBy=${activeSort}`}
        onClick={() => handleSwitch('following')}
        className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all duration-200 ${
          activeFeedType === 'following'
            ? 'text-white shadow-md font-black'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        style={activeFeedType === 'following' ? { background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))' } : {}}
      >
        Takip Edilenler
      </Link>
    </div>
  )
}
