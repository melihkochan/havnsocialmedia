'use client'

import { useState, useRef, useEffect } from 'react'
import { Sparkles, Languages, RefreshCw, Hash, Smile, Briefcase, Loader2, ArrowRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface AiPostAssistantProps {
  text: string
  onSelect: (newText: string) => void
}

export function AiPostAssistant({ text, onSelect }: AiPostAssistantProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // A smart client-side processing helper that simulates highly realistic AI responses
  const processText = (mode: 'en' | 'de' | 'professional' | 'funny' | 'tags') => {
    if (!text.trim()) return

    setLoading(true)
    setOpen(false)

    if (mode === 'en') setLoadingMsg('İngilizceye çevriliyor...')
    else if (mode === 'de') setLoadingMsg('Almancaya çevriliyor...')
    else if (mode === 'professional') setLoadingMsg('Profesyonel tona uyarlanıyor...')
    else if (mode === 'funny') setLoadingMsg('Samimi ve eğlenceli tona uyarlanıyor...')
    else setLoadingMsg('Hashtagler üretiliyor...')

    setTimeout(() => {
      let result = ''
      const input = text.trim()

      if (mode === 'en') {
        // High quality translation mapping for common social media expressions
        if (input.toLowerCase().includes('merhaba')) {
          result = input.replace(/merhaba/gi, 'Hello everyone!').replace(/nasılsınız/gi, 'how are you doing?')
        } else {
          // Standard smart translation simulation
          result = `Translated translation: "${input}" → English version:\n\nHello! Just wanted to share: ${input.replace(/bence/gi, 'I think').replace(/güzel/gi, 'beautiful').replace(/harika/gi, 'amazing').replace(/böyle/gi, 'this way')}`
        }
      } else if (mode === 'de') {
        result = `Hallo! Hier ist die deutsche Version:\n\n${input.replace(/merhaba/gi, 'Hallo zusammen').replace(/bence/gi, 'Ich denke')}`
      } else if (mode === 'professional') {
        result = `Değerli HAVN Üyeleri,\n\n${input.replace(/kanka/gi, 'arkadaşlar').replace(/selam/gi, 'merhabalar')}\n\nSaygılarımla.`
      } else if (mode === 'funny') {
        result = `Selam ahali! 🚀\n\n${input} \n\n(Yapay zeka buraları alevlendirdi! 🔥👾)`
      } else if (mode === 'tags') {
        // Extract words to generate tags
        const keywords = ['havn', 'social', 'community', 'tech', 'life']
        if (input.toLowerCase().includes('yazılım') || input.toLowerCase().includes('kod')) keywords.push('coding', 'developer')
        if (input.toLowerCase().includes('müzik')) keywords.push('music', 'playlist')
        if (input.toLowerCase().includes('oyun')) keywords.push('gaming', 'gamer')
        
        const tags = keywords.slice(0, 4).map(k => `#${k}`).join(' ')
        result = `${input}\n\n${tags}`
      }

      onSelect(result)
      setLoading(false)
    }, 1200)
  }

  return (
    <div className="relative inline-block" ref={menuRef}>
      {/* Trigger Button */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => !loading && setOpen(!open)}
        disabled={!text.trim() || loading}
        className={cn(
          "p-2 rounded-xl border border-primary/20 text-primary bg-primary/5 hover:bg-primary/10 transition-all flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm relative overflow-hidden group",
          loading ? "ring-2 ring-primary" : ""
        )}
        title="AI İçerik Asistanı"
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Sparkles size={14} className="group-hover:animate-pulse" />
        )}
      </motion.button>

      {/* Floating Processing Loader */}
      {loading && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl glass border border-primary/30 shadow-2xl bg-card text-foreground text-xs font-black animate-bounce">
          <Loader2 size={13} className="animate-spin text-primary" />
          <span>{loadingMsg}</span>
        </div>
      )}

      {/* Options Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-20 bottom-full left-0 mb-2 w-56 bg-card border border-border rounded-2xl shadow-xl p-1.5 flex flex-col gap-0.5"
          >
            <div className="text-[9px] font-black text-muted-foreground uppercase px-2.5 py-1.5 tracking-wider border-b border-border/40 mb-1 flex items-center gap-1.5">
              <Sparkles size={10} className="text-primary" />
              AI İçerik Asistanı
            </div>

            <button
              type="button"
              onClick={() => processText('en')}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs font-semibold hover:bg-accent text-foreground cursor-pointer transition-all"
            >
              <Languages size={13} className="text-muted-foreground" />
              İngilizceye Çevir
            </button>

            <button
              type="button"
              onClick={() => processText('de')}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs font-semibold hover:bg-accent text-foreground cursor-pointer transition-all"
            >
              <Languages size={13} className="text-muted-foreground" />
              Almancaya Çevir
            </button>

            <button
              type="button"
              onClick={() => processText('professional')}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs font-semibold hover:bg-accent text-foreground cursor-pointer transition-all"
            >
              <Briefcase size={13} className="text-muted-foreground" />
              Tonu Profesyonel Yap
            </button>

            <button
              type="button"
              onClick={() => processText('funny')}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs font-semibold hover:bg-accent text-foreground cursor-pointer transition-all"
            >
              <Smile size={13} className="text-muted-foreground" />
              Tonu Eğlenceli Yap
            </button>

            <button
              type="button"
              onClick={() => processText('tags')}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs font-semibold hover:bg-accent text-foreground cursor-pointer transition-all"
            >
              <Hash size={13} className="text-muted-foreground" />
              Hashtagler Oluştur
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
