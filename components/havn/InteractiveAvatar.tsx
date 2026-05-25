'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ZoomIn } from 'lucide-react'

interface InteractiveAvatarProps {
  initials: string
  username: string
  avatarUrl: string | null
  updatedAt?: string
  size?: 'md' | 'lg'
  showStatus?: boolean
}

export function InteractiveAvatar({
  initials,
  username,
  avatarUrl,
  updatedAt,
  size = 'lg',
  showStatus = false
}: InteractiveAvatarProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Disable body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const cls = size === 'lg' ? 'w-24 h-24 text-2xl border-4 border-card shadow-md' : 'w-12 h-12 text-base border-2 border-card'
  const dotCls = size === 'lg' ? 'w-4 h-4 border-[3px]' : 'w-3 h-3 border-2'

  const finalUrl = avatarUrl
    ? (updatedAt ? `${avatarUrl}?t=${new Date(updatedAt).getTime()}` : avatarUrl)
    : null

  const avatarElem = finalUrl ? (
    <div 
      onClick={() => setIsOpen(true)}
      className="relative cursor-zoom-in group rounded-full overflow-hidden select-none"
    >
      <img
        src={finalUrl}
        alt={username}
        className={`${cls} rounded-full object-cover transition-transform duration-300 group-hover:scale-105`}
      />
      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-full transition-opacity duration-300">
        <ZoomIn size={size === 'lg' ? 20 : 14} className="text-white" />
      </div>
    </div>
  ) : (
    <div
      className={`${cls} rounded-full flex items-center justify-center font-black select-none`}
      style={{
        background: `linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))`,
        filter: `hue-rotate(${(username.charCodeAt(0) * 17) % 360}deg)`,
        color: 'var(--primary-foreground)',
      }}
    >
      {initials}
    </div>
  )

  return (
    <>
      <div className="relative inline-block z-10">
        {avatarElem}
        {showStatus && (
          <span className={`absolute bottom-0 right-1.5 rounded-full bg-emerald-500 border-card ${dotCls}`} />
        )}
      </div>

      <AnimatePresence>
        {isOpen && finalUrl && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Glassmorphism Background Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-background/95 backdrop-blur-md cursor-zoom-out"
            />

            {/* Close Button */}
            <motion.button
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              onClick={() => setIsOpen(false)}
              className="absolute top-6 right-6 p-3 rounded-full bg-card border border-border text-foreground hover:bg-accent hover:text-foreground transition-all cursor-pointer shadow-lg z-[10000]"
            >
              <X size={20} />
            </motion.button>

            {/* Zoomed Image Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative max-w-full max-h-[85vh] w-auto h-auto rounded-3xl overflow-hidden border border-border/80 bg-card shadow-2xl z-[9999] select-none flex flex-col items-center justify-center"
            >
              <img
                src={finalUrl}
                alt={username}
                className="max-w-[90vw] max-h-[80vh] md:max-w-[70vw] lg:max-w-[50vw] object-contain rounded-2xl"
              />
              <div className="px-6 py-3.5 w-full bg-card/60 backdrop-blur-md border-t border-border/40 text-center">
                <span className="text-xs font-bold text-foreground">@{username}</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
