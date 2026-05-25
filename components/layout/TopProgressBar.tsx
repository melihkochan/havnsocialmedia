'use client'

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

export function TopProgressBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Complete progress when pathname or search parameters change
    if (loading) {
      setProgress(100)
      const timer = setTimeout(() => {
        setLoading(false)
        setProgress(0)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [pathname, searchParams])

  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const anchor = target.closest('a')
      if (!anchor) return

      const href = anchor.getAttribute('href')
      if (!href) return

      // Skip external links, hashes, target="_blank", or modifier clicks
      if (
        href.startsWith('http') ||
        href.startsWith('//') ||
        href.startsWith('#') ||
        anchor.target === '_blank' ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return
      }

      // Check if it's pointing to the same page (no need to show progress)
      const currentUrl = window.location.pathname + window.location.search
      if (href === currentUrl) return

      setLoading(true)
      setProgress(15)
    }

    const start = () => {
      setLoading(true)
      setProgress(15)
    }

    const done = () => {
      setProgress(100)
      setTimeout(() => {
        setLoading(false)
        setProgress(0)
      }, 300)
    }

    document.addEventListener('click', handleLinkClick, { capture: true })
    window.addEventListener('topbar-start', start)
    window.addEventListener('topbar-done', done)

    return () => {
      document.removeEventListener('click', handleLinkClick, { capture: true })
      window.removeEventListener('topbar-start', start)
      window.removeEventListener('topbar-done', done)
    }
  }, [])

  // Simulate progress incremental increases
  useEffect(() => {
    if (!loading) return
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev
        const diff = Math.random() * 12
        return Math.min(90, prev + diff)
      })
    }, 150)
    return () => clearInterval(interval)
  }, [loading])

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { delay: 0.15 } }}
          className="fixed top-0 left-0 right-0 h-[2.5px] z-[9999] pointer-events-none"
        >
          <motion.div
            className="h-full bg-gradient-to-r from-violet-500 via-primary to-pink-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]"
            style={{ width: `${progress}%` }}
            transition={{ ease: 'easeOut', duration: 0.15 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
