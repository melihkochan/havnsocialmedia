'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  BarChart3,
  Users,
  MessageSquare,
  Settings,
  MapPin,
  Shield,
  ChevronLeft,
  ChevronRight,
  Activity,
  Zap,
  ArrowLeft,
  LogOut,
} from 'lucide-react'
import { useState } from 'react'
import { signOut } from '@/lib/actions/auth'

const NAV = [
  {
    href: '/havn-hq-control/overview',
    icon: LayoutDashboard,
    label: 'Genel Durum',
    sub: 'Sistem ve sunucu anlık yükü',
  },
  {
    href: '/havn-hq-control/analytics',
    icon: BarChart3,
    label: 'Gelişmiş Analitik',
    sub: 'Haftalık üye & post artış grafikleri',
  },
  {
    href: '/havn-hq-control/team-chat',
    icon: MessageSquare,
    label: 'Ekip Sohbet Odası',
    sub: '#ekip-koordinasyon @AI kanal',
  },
  {
    href: '/havn-hq-control/users',
    icon: Users,
    label: 'Üye & Moderasyon',
    sub: 'Kullanıcı listesi ve denetim',
  },
  {
    href: '/havn-hq-control/communities-approval',
    icon: Shield,
    label: 'Topluluk Onayları',
    sub: 'Bekleyen topluluk talepleri',
  },
  {
    href: '/havn-hq-control/map',
    icon: MapPin,
    label: 'Katılım Haritası',
    sub: 'Bölgesel üye yoğunluğu',
  },
  {
    href: '/havn-hq-control/settings',
    icon: Settings,
    label: 'Sunucu Ayarları',
    sub: 'Sistem ve güvenlik politikaları',
  },
]

interface HQSidebarProps {
  currentUser: {
    username: string
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
    role?: string | null
  }
}

export function HQSidebar({ currentUser }: HQSidebarProps) {
  const pathname = usePathname()
  const collapsed = false

  const initials = [currentUser.first_name?.[0], currentUser.last_name?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase() || currentUser.username.slice(0, 2).toUpperCase()

  const roleLabel = currentUser.role === 'founder' ? 'Kurucu' : currentUser.role === 'admin' ? 'Yönetici' : 'Ekip'

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/login'
  }

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 220 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="flex-shrink-0 h-screen flex flex-col relative overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #0d0d1a 0%, #0a0a14 100%)',
        borderRight: '1px solid rgba(120,80,255,0.15)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b" style={{ borderColor: 'rgba(120,80,255,0.12)' }}>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            boxShadow: '0 0 20px rgba(124,58,237,0.4)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 52 52" fill="none">
            <rect x="5" y="4" width="11" height="44" rx="4" fill="white" fillOpacity="0.95" />
            <rect x="36" y="4" width="11" height="44" rx="4" fill="white" fillOpacity="0.95" />
            <rect x="16" y="21" width="20" height="10" rx="3" fill="white" fillOpacity="0.95" />
          </svg>
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <p className="text-white font-black text-sm tracking-wider">HAVN HQ</p>
              <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: '#7c3aed' }}>
                FOUNDER PANEL
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
        {NAV.map(({ href, icon: Icon, label, sub }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href}>
              <div
                className="flex items-center gap-3 px-2.5 py-2.5 rounded-xl cursor-pointer transition-all duration-150 group"
                style={{
                  background: active ? 'rgba(124,58,237,0.2)' : 'transparent',
                  borderLeft: active ? '2px solid #7c3aed' : '2px solid transparent',
                }}
              >
                <Icon
                  size={18}
                  className="flex-shrink-0 transition-colors duration-150"
                  style={{ color: active ? '#a78bfa' : 'rgba(255,255,255,0.4)' }}
                />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="overflow-hidden min-w-0"
                    >
                      <p
                        className="text-xs font-bold truncate"
                        style={{ color: active ? '#e2e8f0' : 'rgba(255,255,255,0.7)' }}
                      >
                        {label}
                      </p>
                      <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.45)' }}>
                        {sub}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Status indicator */}
      <div className="px-3 py-2 border-t" style={{ borderColor: 'rgba(120,80,255,0.12)' }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-[10px] font-semibold"
                style={{ color: 'rgba(255,255,255,0.55)' }}
              >
                Supabase Synchronized
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* User */}
      <div className="px-3 py-3 border-t flex flex-col gap-2" style={{ borderColor: 'rgba(120,80,255,0.12)' }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
          >
            {currentUser.avatar_url ? (
              <img src={currentUser.avatar_url} alt="" className="w-full h-full rounded-xl object-cover" />
            ) : (
              initials
            )}
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="min-w-0 flex-1"
              >
                <p className="text-xs font-bold text-white truncate">
                  {currentUser.first_name} {currentUser.last_name}
                </p>
                <p className="text-[10px] font-semibold" style={{ color: '#a78bfa' }}>
                  ✦ {roleLabel}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action Buttons: Geri Dön & Çıkış Yap */}
        <div className="flex gap-2 mt-1 select-none">
          {collapsed ? (
            <div className="flex flex-col gap-1.5 items-center w-full">
              <Link href="/feed" title="Ana Sayfaya Dön" className="w-full flex justify-center">
                <div className="p-2 rounded-lg border border-white/10 hover:bg-white/5 text-slate-300 cursor-pointer transition-all">
                  <ArrowLeft size={12} />
                </div>
              </Link>
              <button
                onClick={handleSignOut}
                title="Oturumu Kapat"
                className="p-2 rounded-lg border border-rose-500/20 hover:bg-rose-500/10 text-rose-400 cursor-pointer transition-all"
              >
                <LogOut size={12} />
              </button>
            </div>
          ) : (
            <>
              <Link href="/feed" className="flex-1">
                <div className="w-full py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-[9px] font-black uppercase text-slate-300 flex items-center justify-center gap-1 cursor-pointer transition-all">
                  <ArrowLeft size={10} />
                  <span>Geri Dön</span>
                </div>
              </Link>
              <button
                onClick={handleSignOut}
                className="flex-1 py-1.5 rounded-lg border border-rose-500/20 hover:bg-rose-500/10 text-[9px] font-black uppercase text-rose-400 flex items-center justify-center gap-1 cursor-pointer transition-all"
              >
                <LogOut size={10} />
                <span>Çıkış Yap</span>
              </button>
            </>
          )}
        </div>
      </div>

    </motion.aside>
  )
}

