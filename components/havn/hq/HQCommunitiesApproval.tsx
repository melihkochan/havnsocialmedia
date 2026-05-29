'use client'

import { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, ShieldAlert, Users, Clock, Loader2, Sparkles } from 'lucide-react'
import { resolveCommunityApproval } from '@/lib/actions/hq-admin'

type PendingCommunity = {
  id: string
  name: string
  slug: string
  description: string | null
  type: string
  created_at: string
  creator: {
    id: string
    username: string
    first_name: string | null
    last_name: string | null
  } | null
}

export function HQCommunitiesApproval({
  initialCommunities
}: {
  initialCommunities: PendingCommunity[]
}) {
  const [communities, setCommunities] = useState<PendingCommunity[]>(initialCommunities)
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleResolve(communityId: string, action: 'approve' | 'reject', name: string) {
    setResolvingId(communityId)
    startTransition(async () => {
      const res = await resolveCommunityApproval(communityId, action)
      if (res.error) {
        setActionMsg(`Hata: ${res.error}`)
      } else {
        setCommunities((prev) => prev.filter((c) => c.id !== communityId))
        setActionMsg(`"${name}" topluluğu başarıyla ${action === 'approve' ? 'onaylandı' : 'reddedildi'}`)
      }
      setResolvingId(null)
      setTimeout(() => setActionMsg(null), 3000)
    })
  }

  return (
    <div className="space-y-6">
      {/* Action Toast */}
      <AnimatePresence>
        {actionMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-primary/10 text-primary border border-primary/20"
          >
            ✓ {actionMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {communities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-[#090912]/40 border border-white/5 rounded-2xl p-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 text-slate-500 bg-white/5">
            <Users size={28} className="opacity-70" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">Onay bekleyen topluluk yok</h3>
          <p className="text-xs text-slate-400 max-w-[280px]">
            Tüm yeni topluluk talepleri onaylandı veya onay bekleyen herhangi bir istek yok.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {communities.map((comm) => {
            const creatorName = [comm.creator?.first_name, comm.creator?.last_name].filter(Boolean).join(' ') || comm.creator?.username || 'Bilinmeyen Kullanıcı'
            const isResolving = resolvingId === comm.id
            
            return (
              <motion.div
                key={comm.id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="rounded-2xl p-5 bg-[#090912]/80 backdrop-blur-md border border-white/5 flex flex-col justify-between hover:border-white/10 transition-all gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-black text-white">{comm.name}</h3>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">slug: /{comm.slug}</p>
                    </div>
                    <span className="text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-wider bg-amber-500/10 text-amber-400 border-amber-500/25">
                      {comm.type === 'request_to_join' ? 'Özel' : 'Açık'}
                    </span>
                  </div>

                  {comm.description ? (
                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                      {comm.description}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 italic">Açıklama belirtilmemiş.</p>
                  )}
                </div>

                <div className="border-t border-white/5 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-auto">
                  {/* Creator Info */}
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 flex items-center justify-center text-[10px] font-black text-white uppercase select-none">
                      {comm.creator?.username.slice(0, 2).toUpperCase() || '??'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-white truncate">{creatorName}</p>
                      <p className="text-[9px] text-slate-500 font-mono">@{comm.creator?.username || 'anonim'}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
                    <button
                      onClick={() => handleResolve(comm.id, 'reject', comm.name)}
                      disabled={resolvingId !== null}
                      className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      title="Talebi Reddet ve Sil"
                    >
                      {isResolving ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <X size={10} />}
                      <span>Reddet</span>
                    </button>
                    <button
                      onClick={() => handleResolve(comm.id, 'approve', comm.name)}
                      disabled={resolvingId !== null}
                      className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      title="Onayla ve Yayınla"
                    >
                      {isResolving ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Check size={10} />}
                      <span>Onayla</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
