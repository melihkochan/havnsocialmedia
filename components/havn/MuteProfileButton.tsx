'use client'

import { useEffect, useState } from 'react'
import { VolumeX, Volume2 } from 'lucide-react'

interface MuteProfileButtonProps {
  username: string
}

export function MuteProfileButton({ username }: MuteProfileButtonProps) {
  const [isMuted, setIsMuted] = useState(false)
  const cleanUsername = username.toLowerCase()

  useEffect(() => {
    const savedMuted = localStorage.getItem('havn_muted_users')
    if (savedMuted) {
      try {
        const list = JSON.parse(savedMuted)
        if (Array.isArray(list)) {
          setIsMuted(list.includes(cleanUsername))
        }
      } catch {
        // silent
      }
    }
  }, [cleanUsername])

  const handleToggleMute = () => {
    const savedMuted = localStorage.getItem('havn_muted_users')
    let list: string[] = []
    if (savedMuted) {
      try {
        list = JSON.parse(savedMuted)
      } catch {
        // silent
      }
    }
    
    let newMuted = false
    if (list.includes(cleanUsername)) {
      list = list.filter(u => u !== cleanUsername)
    } else {
      list.push(cleanUsername)
      newMuted = true
    }
    
    localStorage.setItem('havn_muted_users', JSON.stringify(list))
    setIsMuted(newMuted)
  }

  return (
    <button
      onClick={handleToggleMute}
      className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer select-none ${
        isMuted
          ? 'bg-destructive/10 border-destructive/20 text-destructive hover:bg-destructive/15'
          : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent'
      }`}
    >
      {isMuted ? <Volume2 size={13} /> : <VolumeX size={13} />}
      <span>{isMuted ? 'Sesi Aç' : 'Sessize Al'}</span>
    </button>
  )
}
