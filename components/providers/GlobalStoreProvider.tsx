'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useGlobalStore } from '@/lib/store/useGlobalStore'
import { usePathname } from 'next/navigation'

export function GlobalStoreProvider({ children }: { children: React.ReactNode }) {
  const fetchGlobalData = useGlobalStore((state) => state.fetchGlobalData)
  const currentUser = useGlobalStore((state) => state.currentUser)
  const isInitialized = useGlobalStore((state) => state.isInitialized)
  const setUnreadNotificationsCount = useGlobalStore((state) => state.setUnreadNotificationsCount)
  const setUnreadDMsCount = useGlobalStore((state) => state.setUnreadDMsCount)
  const setOpenSupportTicketsCount = useGlobalStore((state) => state.setOpenSupportTicketsCount)
  const pathname = usePathname()

  // Fetch initial data on mount
  useEffect(() => {
    fetchGlobalData()
  }, [fetchGlobalData])

  // Refetch global data on route changes if currentUser is not yet loaded
  // (helps sync client state after server-side login/redirect)
  useEffect(() => {
    if (!currentUser?.id) {
      fetchGlobalData()
    }
  }, [pathname, currentUser?.id, fetchGlobalData])

  // Redirect users with incomplete setup to the profile setup wizard
  useEffect(() => {
    if (currentUser && currentUser.is_setup_completed === false) {
      if (typeof window !== 'undefined' && window.location.pathname !== '/profile-setup') {
        window.location.replace('/profile-setup')
      }
    }
  }, [currentUser])

  // Recount notification/DM values on route changes
  useEffect(() => {
    if (!currentUser?.id) return

    const supabase = createClient()
    const fetchCounts = async () => {
      try {
        const [notifsCountRes, dmsCountRes] = await Promise.all([
          supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', currentUser.id)
            .eq('is_read', false),
          supabase
            .from('direct_messages')
            .select('*', { count: 'exact', head: true })
            .eq('receiver_id', currentUser.id)
            .eq('is_read', false)
        ])
        setUnreadNotificationsCount(notifsCountRes.count ?? 0)
        setUnreadDMsCount(dmsCountRes.count ?? 0)
      } catch (err) {
        console.error('Error refreshing counts on route change:', err)
      }
    }

    // Delay slightly to allow the page-level mark-as-read DB updates to complete
    const timer = setTimeout(() => {
      fetchCounts()
    }, 450)

    return () => clearTimeout(timer)
  }, [pathname, currentUser?.id, setUnreadNotificationsCount, setUnreadDMsCount])

  // Real-time Postgres subscriptions
  useEffect(() => {
    if (!currentUser?.id) return

    const supabase = createClient()
    const channelToken = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    const fetchCounts = async () => {
      try {
        const [notifsCountRes, dmsCountRes] = await Promise.all([
          supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', currentUser.id)
            .eq('is_read', false),
          supabase
            .from('direct_messages')
            .select('*', { count: 'exact', head: true })
            .eq('receiver_id', currentUser.id)
            .eq('is_read', false)
        ])
        setUnreadNotificationsCount(notifsCountRes.count ?? 0)
        setUnreadDMsCount(dmsCountRes.count ?? 0)
      } catch (err) {
        console.error('Error fetching unread counts in provider:', err)
      }
    }

    const fetchTicketsCount = async () => {
      const { isFounder: checkIsFounder } = await import('@/lib/founder')
      const isUserFounder = checkIsFounder(currentUser)
      
      let query = supabase
        .from('support_tickets')
        .select('id', { count: 'exact', head: true })
      
      if (isUserFounder) {
        query = query.eq('status', 'open')
      } else {
        query = query.eq('user_id', currentUser.id).eq('status', 'replied')
      }
      
      const { count } = await query
      setOpenSupportTicketsCount(count ?? 0)
    }

    // Immediately fetch counts on setup so the badge shows right away
    fetchCounts()
    fetchTicketsCount()

    // Subscribe to all global telemetry changes via a consolidated channel
    const realtimeChannel = supabase.channel(`global_realtime_${currentUser.id}_${channelToken}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'direct_messages' },
        (payload) => {
          console.log('[Realtime] DM event received:', payload)
          const newMsg = payload.new as any
          const oldMsg = payload.old as any
          if (
            (payload.eventType === 'INSERT' && newMsg?.receiver_id === currentUser.id) ||
            (payload.eventType === 'UPDATE' && (newMsg?.receiver_id === currentUser.id || oldMsg?.receiver_id === currentUser.id)) ||
            payload.eventType === 'DELETE'
          ) {
            fetchCounts()
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        (payload) => {
          console.log('[Realtime] Notification event received:', payload)
          const newNotif = payload.new as any
          const oldNotif = payload.old as any
          if (
            (payload.eventType === 'INSERT' && newNotif?.user_id === currentUser.id) ||
            (payload.eventType === 'UPDATE' && (newNotif?.user_id === currentUser.id || oldNotif?.user_id === currentUser.id)) ||
            payload.eventType === 'DELETE'
          ) {
            fetchCounts()
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_tickets' },
        (payload) => {
          console.log('[Realtime] Support ticket event received:', payload)
          fetchTicketsCount()
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime] Global channel status for user ${currentUser.id}:`, status)
      })

    return () => {
      supabase.removeChannel(realtimeChannel)
    }
  }, [currentUser?.id, fetchGlobalData, setUnreadNotificationsCount, setUnreadDMsCount, setOpenSupportTicketsCount])

  // Listen for auth state changes unconditionally
  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        fetchGlobalData()
      } else if (event === 'SIGNED_OUT') {
        useGlobalStore.getState().resetStore()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchGlobalData])

  return <>{children}</>
}
