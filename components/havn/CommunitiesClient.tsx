'use client'

import { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Globe, Lock, Plus, Search, Check, Clock, X, Loader2, Crown } from 'lucide-react'
import { joinCommunity, leaveCommunity, createCommunity } from '@/lib/actions/communities'
import { cn } from '@/lib/utils'
import { parseCommunityDescription } from '@/lib/community-rules'

type Community = {
  id: string; name: string; slug: string; description: string | null
  type: 'public' | 'request_to_join'
  community_members: { id: string }[]
  creator?: {
    username: string
    first_name?: string | null
    last_name?: string | null
  } | null
}

type Membership = { community_id: string; role: string; status: string }

function CommunityAvatar({ id, name }: { id: string; name: string }) {
  const [error, setError] = useState(false)
  const avatarUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/communities/${id}/avatar`

  if (!error) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        onError={() => setError(true)}
        className="w-12 h-12 rounded-2xl object-cover flex-shrink-0 shadow-sm border border-border/20"
      />
    )
  }

  return (
    <div
      className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black flex-shrink-0 text-white shadow-sm"
      style={{
        background: `linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))`,
        filter: `hue-rotate(${(name.charCodeAt(0) * 30) % 360}deg)`,
      }}
    >
      {name.charAt(0)}
    </div>
  )
}

interface CommunitiesClientProps {
  communities: Community[]
  memberships: Membership[]
  currentUserId?: string
}

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [type, setType] = useState<'public' | 'request_to_join'>('public')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('type', type)
    startTransition(async () => {
      const res = await createCommunity(fd)
      if (res.error) setError(res.error)
      else { onCreated(); onClose() }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative z-10 bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-foreground">Topluluk Oluştur</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Topluluk Adı</label>
            <input
              name="name" required minLength={3} maxLength={50}
              placeholder="Topluluğunun adı"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Açıklama</label>
            <textarea
              name="description" rows={3} maxLength={300}
              placeholder="Bu topluluk ne hakkında?"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Tür</label>
            <div className="grid grid-cols-2 gap-2">
              {(['public', 'request_to_join'] as const).map(t => (
                <button
                  key={t} type="button" onClick={() => setType(t)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all',
                    type === t ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'
                  )}
                >
                  {t === 'public' ? <Globe size={14} /> : <Lock size={14} />}
                  {t === 'public' ? 'Herkese Açık' : 'Başvurulu'}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-sm" style={{ color: 'var(--destructive)' }}>{error}</p>}
          <motion.button
            type="submit" disabled={isPending} whileTap={{ scale: 0.97 }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold"
            style={{ background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))', color: 'var(--primary-foreground)' }}
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Oluştur
          </motion.button>
        </form>
      </motion.div>
    </div>
  )
}

export function CommunitiesClient({ communities, memberships, currentUserId }: CommunitiesClientProps) {
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [localMemberships, setLocalMemberships] = useState(memberships)
  const [isPending, startTransition] = useTransition()

  const filtered = communities.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.description?.toLowerCase().includes(search.toLowerCase())
  )

  function getMembership(communityId: string) {
    return localMemberships.find(m => m.community_id === communityId)
  }

  function handleJoin(community: Community) {
    startTransition(async () => {
      const res = await joinCommunity(community.id, community.type)
      if (!res.error) {
        setLocalMemberships(prev => [
          ...prev,
          { community_id: community.id, role: 'member', status: res.status ?? 'approved' }
        ])
      }
    })
  }

  function handleLeave(communityId: string) {
    startTransition(async () => {
      const res = await leaveCommunity(communityId)
      if (!res.error) {
        setLocalMemberships(prev => prev.filter(m => m.community_id !== communityId))
      }
    })
  }

  return (
    <>
      {/* Search + Create row */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Topluluk ara..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-foreground text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground"
          />
        </div>
        {currentUserId && (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))', color: 'var(--primary-foreground)' }}
          >
            <Plus size={15} /> Oluştur
          </motion.button>
        )}
      </div>

      {/* Communities grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        <AnimatePresence>
          {filtered.map((community, i) => {
            const membership = getMembership(community.id)
            const isMember = !!membership
            const isPending_ = membership?.status === 'pending'
            const memberCount = community.community_members.length

            return (
              <motion.div
                key={community.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="relative bg-card border border-border rounded-2xl p-5 flex flex-col gap-4 hover:border-primary/30 hover:shadow-md transition-all duration-200"
              >
                {community.creator && (
                  <a
                    href={`/profile/${community.creator.username}`}
                    className="absolute top-5 right-5 flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[9px] font-black border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 active:scale-95 text-amber-600 dark:text-amber-400 backdrop-blur-md shadow-sm select-none z-10 transition-all"
                  >
                    <Crown size={9} className="fill-amber-500/25 text-amber-500" />
                    <span>KURUCU</span>
                    <span className="opacity-40 font-normal">|</span>
                    <span className="font-semibold text-foreground/80">@{community.creator.username}</span>
                  </a>
                )}

                {/* Clickable area — navigates to community detail */}
                <a href={`/communities/${community.slug}`} className="flex flex-col gap-4 cursor-pointer flex-1">
                  {/* Header */}
                  <div className="flex items-start gap-3 pr-28">
                    <CommunityAvatar id={community.id} name={community.name} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-foreground">{community.name}</h3>
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold"
                          style={{
                            background: 'color-mix(in oklch, var(--muted-foreground) 12%, transparent)',
                            color: 'var(--muted-foreground)',
                          }}
                        >
                          {community.type === 'public' ? <Globe size={9} /> : <Lock size={9} />}
                          {community.type === 'public' ? 'Açık' : 'Başvurulu'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <Users size={11} />
                          <span>{memberCount.toLocaleString('tr-TR')} üye</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {(() => {
                    const parsed = parseCommunityDescription(community.description)
                    return parsed.description ? (
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{parsed.description}</p>
                    ) : null
                  })()}
                </a>

                {/* Join button — outside clickable area */}
                {currentUserId && (
                  isMember ? (
                    isPending_ ? (
                      <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground bg-muted">
                        <Clock size={13} /> Onay Bekleniyor
                      </div>
                    ) : (
                      <button
                        onClick={() => handleLeave(community.id)}
                        disabled={isPending}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-all"
                        style={{ '--destructive': 'var(--destructive)' } as React.CSSProperties}
                      >
                        <Check size={13} /> Üyesin — Ayrıl
                      </button>
                    )
                  ) : (
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleJoin(community)}
                      disabled={isPending}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                      style={{
                        background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))',
                        color: 'var(--primary-foreground)',
                      }}
                    >
                      <Plus size={13} />
                      {community.type === 'public' ? 'Katıl' : 'Başvur'}
                    </motion.button>
                  )
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground text-sm">
          "{search}" için sonuç bulunamadı.
        </div>
      )}

      {/* Create modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateModal onClose={() => setShowCreate(false)} onCreated={() => window.location.reload()} />
        )}
      </AnimatePresence>
    </>
  )
}
