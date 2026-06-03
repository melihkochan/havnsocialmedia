'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, X, Crown, Star, Shield } from 'lucide-react'
import Link from 'next/link'
import { useLocale } from '@/lib/i18n/LocaleContext'

interface Membership {
  role: string
  community: {
    id: string
    name: string
    slug: string
    description?: string | null
    avatar_url?: string | null
  } | null
}

interface CommunitiesModalProps {
  count: number
  memberships: Membership[]
}

function RolePill({ role }: { role: string }) {
  if (role === 'owner') {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-wider">
        <Crown size={9} />
        Kurucu
      </span>
    )
  }
  if (role === 'moderator') {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-violet-500/10 text-violet-500 border border-violet-500/20 uppercase tracking-wider">
        <Shield size={9} />
        Moderatör
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
      <Star size={9} />
      Üye
    </span>
  )
}

export function CommunitiesModal({ count, memberships }: CommunitiesModalProps) {
  const [open, setOpen] = useState(false)
  const { locale } = useLocale()

  if (count === 0) {
    return (
      <span className="flex items-center gap-1.5 cursor-default select-none">
        <Users size={14} className="opacity-70" />
        {count} {locale === 'tr' ? 'topluluk' : 'community'}
      </span>
    )
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer select-none group"
      >
        <Users size={14} className="opacity-70 group-hover:opacity-100 transition-opacity" />
        <span className="font-semibold group-hover:underline underline-offset-2">
          {count} {locale === 'tr' ? 'topluluk' : 'community'}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="fixed z-50 inset-0 flex items-center justify-center p-4 pointer-events-none"
            >
              <div
                className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden pointer-events-auto"
                style={{ boxShadow: '0 20px 60px -10px color-mix(in oklch, var(--primary) 20%, transparent), 0 10px 30px rgba(0,0,0,0.25)' }}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-muted/10">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'color-mix(in oklch, var(--primary) 12%, transparent)' }}>
                      <Users size={14} style={{ color: 'var(--primary)' }} />
                    </div>
                    <h2 className="text-sm font-black text-foreground">
                      {locale === 'tr' ? 'Topluluklar' : 'Communities'}
                    </h2>
                    <span className="px-1.5 py-0.5 text-[9px] font-black rounded-full bg-primary/10 text-primary border border-primary/20">
                      {count}
                    </span>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-all cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* List */}
                <div className="p-3 flex flex-col gap-1.5 max-h-80 overflow-y-auto">
                  {memberships.map((m) => {
                    if (!m.community) return null
                    return (
                      <Link
                        key={m.community.id}
                        href={`/communities/${m.community.slug}`}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:border-border/60 hover:bg-accent/40 transition-all group"
                      >
                        {/* Community avatar / initial */}
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 text-primary-foreground"
                          style={{ background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))' }}
                        >
                          {m.community.avatar_url ? (
                            <img src={m.community.avatar_url} alt={m.community.name} className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            m.community.name.slice(0, 2).toUpperCase()
                          )}
                        </div>

                        {/* Name + role */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                            {m.community.name}
                          </p>
                          {m.community.description && (
                            <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                              {m.community.description}
                            </p>
                          )}
                        </div>

                        <RolePill role={m.role} />
                      </Link>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
