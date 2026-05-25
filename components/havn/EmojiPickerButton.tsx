'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Smile } from 'lucide-react'
import { EMOJI_GROUPS } from '@/lib/emoji-data'
import { FLAGS, getFlagImageUrl } from '@/lib/flags'
import { cn } from '@/lib/utils'

const PICKER_W = 280
const PICKER_H_EST = 260

interface EmojiPickerButtonProps {
  onInsert: (emoji: string) => void
  className?: string
}

export function EmojiPickerButton({ onInsert, className }: EmojiPickerButtonProps) {
  const [open, setOpen] = useState(false)
  const [activeGroup, setActiveGroup] = useState<string>(EMOJI_GROUPS[0].id)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [height, setHeight] = useState(PICKER_H_EST)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Measure actual height of the panel when active group changes or panel is opened
  useEffect(() => {
    if (open && panelRef.current) {
      const actualHeight = panelRef.current.offsetHeight
      if (actualHeight > 0 && actualHeight !== height) {
        setHeight(actualHeight)
      }
    }
  }, [open, height, activeGroup])

  useEffect(() => {
    if (!open || !triggerRef.current) return

    function updatePosition() {
      const rect = triggerRef.current!.getBoundingClientRect()
      const margin = 8
      const pickerHeight = panelRef.current ? panelRef.current.offsetHeight : height
      
      let top = rect.bottom + margin // Open below by default
      let left = rect.left

      // If opening below would overflow the screen, open above
      if (top + pickerHeight > window.innerHeight - margin) {
        top = rect.top - pickerHeight - margin
      }

      left = Math.max(margin, Math.min(left, window.innerWidth - PICKER_W - margin))
      top = Math.max(margin, Math.min(top, window.innerHeight - pickerHeight - margin))

      setPosition({ top, left })
    }

    updatePosition()
    const timer = setTimeout(updatePosition, 30)

    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open, height])

  useEffect(() => {
    if (!open) return
    function handlePointerDown(e: PointerEvent) {
      const target = e.target as Node
      if (triggerRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  const group = EMOJI_GROUPS.find(g => g.id === activeGroup) ?? EMOJI_GROUPS[0]

  function pick(emoji: string) {
    onInsert(emoji)
    setOpen(false)
  }

  const panel = open && typeof document !== 'undefined' ? (
    createPortal(
      <AnimatePresence>
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: 6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.96 }}
          transition={{ duration: 0.15 }}
          style={{ position: 'fixed', top: position.top, left: position.left, zIndex: 9999 }}
          className="w-[min(100vw-1rem,280px)] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        >
          <div className="flex gap-0.5 p-2 border-b border-border overflow-x-auto no-scrollbar bg-muted/30">
            {EMOJI_GROUPS.map(g => (
              <button
                key={g.id}
                type="button"
                onClick={() => setActiveGroup(g.id)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer',
                  activeGroup === g.id
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
              >
                {g.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-8 gap-0.5 p-2 max-h-[200px] overflow-y-auto">
            {activeGroup === 'flags'
              ? FLAGS.map(flag => (
                  <button
                    key={flag.iso}
                    type="button"
                    title={flag.name}
                    onClick={() => pick(flag.emoji)}
                    className="aspect-square flex items-center justify-center rounded-lg hover:bg-accent transition-colors cursor-pointer p-1"
                  >
                    <img
                      src={getFlagImageUrl(flag.iso, 40)}
                      alt={flag.name}
                      width={28}
                      height={20}
                      className="w-7 h-5 object-cover rounded-[3px] shadow-sm ring-1 ring-border/50"
                      loading="lazy"
                    />
                  </button>
                ))
              : group.emojis.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => pick(emoji)}
                    className="aspect-square flex items-center justify-center text-xl rounded-lg hover:bg-accent transition-colors cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
          </div>
        </motion.div>
      </AnimatePresence>,
      document.body
    )
  ) : null

  return (
    <div className={cn('relative flex-shrink-0', className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(s => !s)}
        className={cn(
          'flex items-center justify-center p-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer',
          open
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
        )}
        aria-label="Emoji ekle"
        aria-expanded={open}
      >
        <Smile size={14} />
      </button>
      {panel}
    </div>
  )
}
