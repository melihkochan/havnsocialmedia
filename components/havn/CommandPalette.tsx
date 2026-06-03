'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, Terminal, Shield, User, Hash, Settings, 
  HelpCircle, Globe, Moon, Sun, Laptop, MessageSquare, Loader2, Sparkles
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getDisplayName } from '@/lib/profile-display'
import { cn } from '@/lib/utils'
import { useLocale } from '@/lib/i18n/LocaleContext'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  currentUser?: any
}

export function CommandPalette({ isOpen, onClose, currentUser }: CommandPaletteProps) {
  const router = useRouter()
  const { setTheme } = useTheme()
  const { t } = useLocale()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [users, setUsers] = useState<any[]>([])
  const [semanticCommunities, setSemanticCommunities] = useState<any[]>([])
  const [semanticPosts, setSemanticPosts] = useState<any[]>([])
  const [allCommunities, setAllCommunities] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Reset when open/closed
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Fetch communities on mount / open
  useEffect(() => {
    if (!isOpen) return
    const fetchCommunities = async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('communities')
          .select('id, name, slug, description, type')
          .limit(100)
        if (data) {
          setAllCommunities(data)
        }
      } catch (e) {
      }
    }
    fetchCommunities()
  }, [isOpen])

  // Search users and semantic items with debounce
  useEffect(() => {
    if (!isOpen) return
    const cleanSearchVal = query.startsWith('/') ? query.slice(1) : query
    if (!cleanSearchVal.trim()) {
      setUsers([])
      setSemanticCommunities([])
      setSemanticPosts([])
      return
    }

    const performSearch = async () => {
      setLoading(true)
      try {
        const supabase = createClient()
        
        // Parallel keyword search (users) and AI semantic search (posts/communities)
        const [usersRes, semanticRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, username, first_name, last_name, avatar_url, xp, role')
            .or(`username.ilike.%${cleanSearchVal}%,first_name.ilike.%${cleanSearchVal}%,last_name.ilike.%${cleanSearchVal}%`)
            .limit(5),
          import('@/lib/actions/search').then(m => m.searchSemantic(cleanSearchVal))
        ])

        if (!usersRes.error && usersRes.data) {
          setUsers(usersRes.data)
        }
        if (semanticRes) {
          setSemanticCommunities(semanticRes.communities)
          setSemanticPosts(semanticRes.posts)
        }
      } catch (err) {
      } finally {
        setLoading(false)
      }
    }

    const timer = setTimeout(performSearch, 300) // 300ms debounce for semantic model input
    return () => clearTimeout(timer)
  }, [query, isOpen])

  // Static actions
  const staticActions = [
    { id: 'feed', label: t('cmd.action.feed.label'), desc: t('cmd.action.feed.desc'), icon: Globe, perform: () => router.push('/feed') },
    { id: 'profile', label: t('cmd.action.profile.label'), desc: t('cmd.action.profile.desc'), icon: User, perform: () => currentUser?.username ? router.push(`/profile/${currentUser.username}`) : router.push('/login') },
    { id: 'messages', label: t('cmd.action.messages.label'), desc: t('cmd.action.messages.desc'), icon: MessageSquare, perform: () => router.push('/messages') },
    { id: 'settings', label: t('cmd.action.settings.label'), desc: t('cmd.action.settings.desc'), icon: Settings, perform: () => router.push('/settings') },
    { id: 'support', label: t('cmd.action.support.label'), desc: t('cmd.action.support.desc'), icon: HelpCircle, perform: () => router.push('/support') },
    { id: 'dark-theme', label: t('cmd.action.dark.label'), desc: t('cmd.action.dark.desc'), icon: Moon, perform: () => setTheme('dark') },
    { id: 'light-theme', label: t('cmd.action.light.label'), desc: t('cmd.action.light.desc'), icon: Sun, perform: () => setTheme('light') },
    { id: 'system-theme', label: t('cmd.action.system.label'), desc: t('cmd.action.system.desc'), icon: Laptop, perform: () => setTheme('system') },
  ]

  // Add HQ Admin action if applicable
  const isAdmin = currentUser?.role === 'founder' || currentUser?.role === 'admin'
  if (isAdmin) {
    staticActions.push({
      id: 'hq',
      label: t('cmd.action.hq.label'),
      desc: t('cmd.action.hq.desc'),
      icon: Shield,
      perform: () => router.push('/havn-hq-control/overview')
    })
  }

  const cleanQuery = query.startsWith('/') ? query.slice(1) : query

  // Filter actions
  const filteredActions = staticActions.filter(act =>
    act.label.toLowerCase().includes(cleanQuery.toLowerCase()) ||
    act.desc.toLowerCase().includes(cleanQuery.toLowerCase()) ||
    act.id.toLowerCase().includes(cleanQuery.toLowerCase())
  )

  // Filter communities
  const filteredCommunities = allCommunities.filter(c =>
    c.name.toLowerCase().includes(cleanQuery.toLowerCase()) ||
    c.slug.toLowerCase().includes(cleanQuery.toLowerCase())
  ).slice(0, 5)

  interface CommandPaletteItem {
    id: string
    type: string
    label: string
    desc?: string
    icon: any
    perform: () => void
    category: string
    avatar_url?: string | null
  }

  // Flat combined list
  const listItems: CommandPaletteItem[] = [
    ...filteredActions.map(act => ({
      id: act.id,
      type: 'action',
      label: act.label,
      desc: act.desc,
      icon: act.icon,
      perform: act.perform,
      category: t('cmd.categories.actions'),
      avatar_url: undefined
    })),
    ...filteredCommunities.map(c => ({
      id: `comm-${c.id}`,
      type: 'community',
      label: c.name,
      desc: `@${c.slug} • ${c.type === 'private' ? t('cmd.meta.private') : t('cmd.meta.public')} ${t('cmd.meta.community_suffix')}`,
      icon: Hash,
      perform: () => router.push(`/feed?communityId=${c.id}`),
      category: t('cmd.categories.communities'),
      avatar_url: undefined
    })),
    ...semanticCommunities.map(c => ({
      id: `sem-comm-${c.id}`,
      type: 'community',
      label: c.name,
      desc: `@${c.slug} • ${t('cmd.meta.similarity', { similarity: Math.round(c.similarity * 100) })}`,
      icon: Sparkles,
      perform: () => router.push(`/feed?communityId=${c.id}`),
      category: t('cmd.categories.ai'),
      avatar_url: undefined
    })),
    ...semanticPosts.map(p => ({
      id: `sem-post-${p.id}`,
      type: 'post',
      label: p.content ? p.content.replace(/<[^>]*>/g, ' ').slice(0, 45) + (p.content.replace(/<[^>]*>/g, ' ').length > 45 ? '...' : '') : 'Gönderi',
      desc: `@${p.profiles?.username} • ${t('cmd.meta.similarity', { similarity: Math.round(p.similarity * 100) })}`,
      avatar_url: p.profiles?.avatar_url,
      icon: Sparkles,
      perform: () => router.push(`/post/${p.id}`),
      category: t('cmd.categories.ai')
    })),
    ...users.map(u => ({
      id: `user-${u.id}`,
      type: 'user',
      label: getDisplayName(u),
      desc: `@${u.username} • ${t('cmd.meta.level', { level: Math.floor(Math.sqrt((u.xp ?? 0) / 100)) + 1 })}`,
      avatar_url: u.avatar_url,
      icon: User,
      perform: () => router.push(`/profile/${u.username}`),
      category: t('cmd.categories.users')
    }))
  ]

  // Adjust selection range when list changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query, users.length, filteredCommunities.length, semanticCommunities.length, semanticPosts.length])

  // Handle arrow and enter navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % listItems.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => (prev - 1 + listItems.length) % listItems.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (listItems[selectedIndex]) {
          listItems[selectedIndex].perform()
          onClose()
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, selectedIndex, listItems])

  // Auto-scroll to selected element
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.querySelector('[data-selected="true"]')
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#020205]/85 backdrop-blur-[8px]"
          />

          {/* Palette Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-xl bg-[#090912]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl shadow-black/80 flex flex-col max-h-[480px] z-10"
          >
            {/* Search Input Area */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.05]">
              <Search size={18} className="text-slate-500 animate-pulse flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={t('cmd.placeholder')}
                className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none border-none ring-0 focus:ring-0 p-0"
              />
              {loading ? (
                <Loader2 size={14} className="animate-spin text-slate-500 flex-shrink-0" />
              ) : (
                <div className="flex items-center gap-1 text-[9px] font-black uppercase text-slate-600 bg-white/[0.02] border border-white/[0.04] px-1.5 py-0.5 rounded">
                  ESC
                </div>
              )}
            </div>

            {/* Suggestions / Results */}
            <div 
              ref={listRef}
              className="flex-1 overflow-y-auto p-2 space-y-0.5 scrollbar-thin scrollbar-thumb-white/5"
            >
              {listItems.map((item, idx) => {
                const showHeader = idx === 0 || listItems[idx - 1].category !== item.category
                const isSelected = idx === selectedIndex

                return (
                  <React.Fragment key={item.id}>
                    {showHeader && (
                      <div className="text-[10px] font-black tracking-widest text-slate-500/80 uppercase px-3.5 py-2 mt-2.5 first:mt-1 select-none border-b border-white/[0.01]">
                        {item.category}
                      </div>
                    )}
                    <div
                      data-selected={isSelected ? 'true' : 'false'}
                      onClick={() => {
                        item.perform()
                        onClose()
                      }}
                      className={cn(
                        "flex items-center gap-3.5 px-3.5 py-3 rounded-xl cursor-pointer transition-all duration-200 text-xs relative overflow-hidden group select-none",
                        isSelected 
                          ? "bg-primary/10 text-white pl-4 border-l-2 border-primary" 
                          : "text-slate-400 hover:text-white hover:bg-white/[0.02] hover:pl-4"
                      )}
                    >
                      {/* Active indicator dot */}
                      {isSelected && (
                        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-0.5 h-6 bg-primary rounded-r" />
                      )}

                      {/* Icon or Avatar */}
                      <div className="flex-shrink-0">
                        {item.avatar_url ? (
                          <img 
                            src={item.avatar_url} 
                            alt="" 
                            className="w-5.5 h-5.5 rounded-lg object-cover ring-1 ring-white/10" 
                          />
                        ) : (
                          <div className={cn(
                            "w-5.5 h-5.5 rounded-lg flex items-center justify-center bg-white/[0.02] border border-white/[0.04] text-slate-500 transition-colors",
                            isSelected && "bg-primary/20 border-primary/20 text-primary"
                          )}>
                            <item.icon size={13} />
                          </div>
                        )}
                      </div>

                      {/* Meta Details */}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate">{item.label}</p>
                        {item.desc && (
                          <p className="text-[10px] text-slate-500 truncate mt-0.5">{item.desc}</p>
                        )}
                      </div>

                      {/* Navigation tip */}
                      {isSelected && (
                        <div className="text-[9px] font-bold text-slate-600 bg-white/[0.02] px-1.5 py-0.5 rounded border border-white/[0.04] uppercase flex items-center gap-1 select-none animate-pulse">
                          <span>{t('cmd.tip.select')}</span> ↵
                        </div>
                      )}
                    </div>
                  </React.Fragment>
                )
              })}

              {listItems.length === 0 && (
                <div className="text-center py-10 text-slate-500 space-y-1 bg-white/[0.01] border border-dashed border-white/[0.03] rounded-xl m-2 select-none">
                  <Terminal size={18} className="mx-auto mb-1.5 text-slate-600" />
                  <p className="text-xs font-bold">{t('cmd.no_results.title')}</p>
                  <p className="text-[10px]">{t('cmd.no_results.desc')}</p>
                </div>
              )}
            </div>

            {/* Bottom Help bar */}
            <div className="px-4 py-2 bg-white/[0.01] border-t border-white/[0.04] flex items-center justify-between text-[9px] text-slate-500 font-medium select-none">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-0.5"><span className="bg-white/5 border border-white/10 px-1 py-0.2 rounded font-black text-[8px]">↑↓</span> {t('cmd.help.arrows')}</span>
                <span className="flex items-center gap-0.5"><span className="bg-white/5 border border-white/10 px-1 py-0.2 rounded font-black text-[8px]">ENTER</span> {t('cmd.help.enter')}</span>
              </div>
              <div className="flex items-center gap-1">
                <Sparkles size={10} className="text-primary animate-pulse" />
                <span>HAVN Command Palette</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
