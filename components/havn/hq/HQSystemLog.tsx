'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Zap, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface LogEntry {
  id: string
  time: string
  text: string
  type: 'join' | 'post' | 'shield' | 'mod'
}

const TYPE_COLORS = {
  join: { bg: 'rgba(16,185,129,0.15)', text: '#34d399', label: 'Join' },
  post: { bg: 'rgba(59,130,246,0.15)', text: '#60a5fa', label: 'Post' },
  shield: { bg: 'rgba(139,92,246,0.15)', text: '#a78bfa', label: 'Shield' },
  mod: { bg: 'rgba(245,158,11,0.15)', text: '#fbbf24', label: 'Mod' },
}

export function HQSystemLog() {
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: '0',
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      text: 'Sistem logu başlatıldı. Realtime bağlantı kuruldu.',
      type: 'shield',
    },
  ])
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()

    // Yeni üye kaydı
    const profileChannel = supabase
      .channel('hq-profile-inserts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, (payload) => {
        const username = (payload.new as any)?.username || 'bilinmiyor'
        addLog(`Yeni üye katıldı: @${username}`, 'join')
      })
      .subscribe()

    // Yeni gönderi
    const postChannel = supabase
      .channel('hq-post-inserts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
        const content = (payload.new as any)?.content
        const preview = content ? content.slice(0, 40) : 'Görsel gönderi'
        addLog(`Yeni gönderi yayınlandı: "${preview}..."`, 'post')
      })
      .subscribe()

    return () => {
      supabase.removeChannel(profileChannel)
      supabase.removeChannel(postChannel)
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  function addLog(text: string, type: LogEntry['type']) {
    const entry: LogEntry = {
      id: crypto.randomUUID(),
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      text,
      type,
    }
    setLogs((prev) => [...prev.slice(-99), entry])
  }

  return (
    <div
      className="rounded-2xl p-4 flex flex-col h-full"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(120,80,255,0.12)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap size={14} style={{ color: '#a78bfa' }} />
          <span className="text-xs font-bold text-white">Sohbet & Sistem Günlüğü</span>
        </div>
        <span
          className="text-[9px] font-black px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', letterSpacing: '0.1em' }}
        >
          CANLI STREAM
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0" style={{ maxHeight: '280px' }}>
        <AnimatePresence initial={false}>
          {logs.map((log) => {
            const colors = TYPE_COLORS[log.type]
            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-start gap-2 text-[11px]"
              >
                <span style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                  {log.time}
                </span>
                <span
                  className="px-1.5 py-0.5 rounded text-[9px] font-black flex-shrink-0"
                  style={{ background: colors.bg, color: colors.text }}
                >
                  {colors.label}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>{log.text}</span>
              </motion.div>
            )
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
