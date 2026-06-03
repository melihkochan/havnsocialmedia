'use client'

import { useLocale } from '@/lib/i18n/LocaleContext'
import { getDisplayName } from '@/lib/profile-display'
import Link from 'next/link'

interface Profile {
  id: string
  username: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  updated_at: string
}

interface MutualFollowersProps {
  mutuals: Profile[]
  totalCount: number
}

export function MutualFollowers({ mutuals, totalCount }: MutualFollowersProps) {
  const { t } = useLocale()

  if (!mutuals || mutuals.length === 0) return null

  // Limit avatars to show max 3
  const avatarsToShow = mutuals.slice(0, 3)

  // Get names for display
  const name1 = mutuals[0] ? getDisplayName(mutuals[0]) : ''
  const name2 = mutuals[1] ? getDisplayName(mutuals[1]) : ''

  // Format description text based on count
  let text = ''
  if (totalCount === 1) {
    text = t('profile.mutuals.one', { name: name1 })
  } else if (totalCount === 2) {
    text = t('profile.mutuals.two', { name1, name2 })
  } else {
    text = t('profile.mutuals.many', { name1, name2, count: totalCount - 2 })
  }

  return (
    <div className="flex items-center gap-2 mt-4 pt-3.5 border-t border-border/40 select-none animate-in fade-in slide-in-from-bottom-1 duration-200">
      {/* Overlapping Avatars */}
      <div className="flex -space-x-2 flex-shrink-0">
        {avatarsToShow.map((user) => {
          const initials = user.username.slice(0, 2).toUpperCase()
          return (
            <Link
              key={user.id}
              href={`/profile/${user.username}`}
              className="relative transition-transform hover:scale-115 hover:z-10 focus:outline-none"
              title={`@${user.username}`}
            >
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.username}
                  className="w-5 h-5 rounded-full object-cover border border-card ring-[1.5px] ring-border/50"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-primary/10 text-primary border border-card ring-[1.5px] ring-border/50 flex items-center justify-center font-bold text-[8px]">
                  {initials}
                </div>
              )}
            </Link>
          )
        })}
      </div>

      {/* Social Proof Text */}
      <p className="text-[11px] text-muted-foreground leading-normal max-w-[280px]">
        {text}
      </p>
    </div>
  )
}
