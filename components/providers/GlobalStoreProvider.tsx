'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useGlobalStore } from '@/lib/store/useGlobalStore'
import { getUnreadNotificationCount } from '@/lib/actions/notifications'
import { getUnreadMessagesCount } from '@/lib/actions/messages'

export function GlobalStoreProvider({ children }: { children: React.ReactNode }) {
  const fetchGlobalData = useGlobalStore((state) => state.fetchGlobalData)
  const currentUser = useGlobalStore((state) => state.currentUser)
  const isInitialized = useGlobalStore((state) => state.isInitialized)
  const setUnreadNotificationsCount = useGlobalStore((state) => state.setUnreadNotificationsCount)
  const setUnreadDMsCount = useGlobalStore((state) => state.setUnreadDMsCount)
  const setOpenSupportTicketsCount = useGlobalStore((state) => state.setOpenSupportTicketsCount)

  // Fetch initial data on mount
  useEffect(() => {
    fetchGlobalData()
  }, [fetchGlobalData])

  // Redirect users with incomplete setup to the profile setup wizard
  useEffect(() => {
    if (currentUser && currentUser.is_setup_completed === false) {
      if (typeof window !== 'undefined' && window.location.pathname !== '/profile-setup') {
        window.location.replace('/profile-setup')
      }
    }
  }, [currentUser])

  // Real-time Postgres subscriptions
  useEffect(() => {
    if (!currentUser?.id) return

    const supabase = createClient()
    const channelToken = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    const fetchCounts = async () => {
      try {
        const [notifsCount, dmsCount] = await Promise.all([
          getUnreadNotificationCount(),
          getUnreadMessagesCount()
        ])
        setUnreadNotificationsCount(notifsCount)
        setUnreadDMsCount(dmsCount)
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

    // Subscribe to DMs
    const dmChannel = supabase.channel(`global_dms_${currentUser.id}_${channelToken}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `receiver_id=eq.${currentUser.id}` },
        () => fetchCounts()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'direct_messages' },
        (payload) => {
          const newMsg = payload.new as any
          const oldMsg = payload.old as any
          if (newMsg?.receiver_id === currentUser.id || oldMsg?.receiver_id === currentUser.id) {
            fetchCounts()
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'direct_messages' },
        () => fetchCounts()
      )
      .subscribe()

    // Subscribe to notifications
    const notifChannel = supabase.channel(`global_notifs_${currentUser.id}_${channelToken}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUser.id}` },
        () => fetchCounts()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUser.id}` },
        () => fetchCounts()
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'notifications' },
        () => fetchCounts()
      )
      .subscribe()

    // Subscribe to support tickets
    const supportChannel = supabase.channel(`global_support_tickets_${channelToken}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_tickets' },
        () => {
          fetchTicketsCount()
        }
      )

      .subscribe()


    // Listen for auth state changes to re-fetch if user changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        fetchGlobalData()
      } else if (event === 'SIGNED_OUT') {
        useGlobalStore.getState().resetStore()
      }
    })

    return () => {
      supabase.removeChannel(dmChannel)
      supabase.removeChannel(notifChannel)
      supabase.removeChannel(supportChannel)
      subscription.unsubscribe()
    }
  }, [currentUser?.id, fetchGlobalData, setUnreadNotificationsCount, setUnreadDMsCount, setOpenSupportTicketsCount])

  return <>{children}</>
}
