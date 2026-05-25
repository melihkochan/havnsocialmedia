'use client'

import { useEffect, useRef } from 'react'
import { trackProfileView, trackPostView } from '@/lib/actions/analytics'

// Tracks a profile view once per mount — prevents F5 spam via dedup on server
export function ProfileViewTracker({ profileId }: { profileId: string }) {
  const tracked = useRef(false)
  useEffect(() => {
    if (tracked.current) return
    tracked.current = true
    trackProfileView(profileId)
  }, [profileId])
  return null
}

// Tracks a post view once per mount
export function PostViewTracker({ postId }: { postId: string }) {
  const tracked = useRef(false)
  useEffect(() => {
    if (tracked.current) return
    tracked.current = true
    trackPostView(postId)
  }, [postId])
  return null
}
