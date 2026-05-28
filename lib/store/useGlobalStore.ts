import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import { enrichProfile } from '@/lib/profile-enrich'
import { isFounder } from '@/lib/founder'
import type { EnrichedProfile } from '@/lib/profile-enrich'

export interface GlobalState {
  currentUser: EnrichedProfile | null
  unreadNotificationsCount: number
  unreadDMsCount: number
  openSupportTicketsCount: number
  userCommunities: { id: string; name: string }[]
  isInitialized: boolean
  
  setCurrentUser: (user: EnrichedProfile | null) => void
  setUnreadNotificationsCount: (count: number) => void
  setUnreadDMsCount: (count: number) => void
  setOpenSupportTicketsCount: (count: number) => void
  setUserCommunities: (communities: { id: string; name: string }[]) => void
  setIsInitialized: (initialized: boolean) => void
  
  fetchGlobalData: () => Promise<void>
  resetStore: () => void
}

export const useGlobalStore = create<GlobalState>((set) => ({
  currentUser: null,
  unreadNotificationsCount: 0,
  unreadDMsCount: 0,
  openSupportTicketsCount: 0,
  userCommunities: [],
  isInitialized: false,

  setCurrentUser: (currentUser) => set({ currentUser }),
  setUnreadNotificationsCount: (unreadNotificationsCount) => set({ unreadNotificationsCount }),
  setUnreadDMsCount: (unreadDMsCount) => set({ unreadDMsCount }),
  setOpenSupportTicketsCount: (openSupportTicketsCount) => set({ openSupportTicketsCount }),
  setUserCommunities: (userCommunities) => set({ userCommunities }),
  setIsInitialized: (isInitialized) => set({ isInitialized }),
  
  resetStore: () => set({
    currentUser: null,
    unreadNotificationsCount: 0,
    unreadDMsCount: 0,
    openSupportTicketsCount: 0,
    userCommunities: [],
    isInitialized: false,
  }),

  fetchGlobalData: async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      set({
        currentUser: null,
        unreadNotificationsCount: 0,
        unreadDMsCount: 0,
        openSupportTicketsCount: 0,
        userCommunities: [],
        isInitialized: true,
      })
      return
    }

    try {
      // Step 1: Fetch profile & memberships in parallel
      const [profileResult, membershipsResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, username, first_name, last_name, avatar_url, banner_url, bio, updated_at, is_verified, is_gold, default_feed_type, xp')
          .eq('id', user.id)
          .single(),
        supabase
          .from('community_members')
          .select('community_id, role')
          .eq('user_id', user.id)
          .eq('status', 'approved')
      ])

      const profile = enrichProfile(profileResult.data)
      const memberships = membershipsResult.data ?? []
      const memberCommunityIds = memberships.map((m: any) => m.community_id)

      // Step 2: Fetch remaining data in parallel
      const promises: any[] = [
        supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false),
        supabase
          .from('direct_messages')
          .select('id', { count: 'exact', head: true })
          .eq('receiver_id', user.id)
          .eq('is_read', false),
        memberCommunityIds.length > 0 
          ? supabase.from('communities').select('id, name').in('id', memberCommunityIds)
          : Promise.resolve({ data: [] })
      ]

      const isUserFounder = profile ? isFounder(profile) : false
      if (isUserFounder) {
        promises.push(
          supabase
            .from('support_tickets')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'open')
        )
      } else {
        promises.push(
          supabase
            .from('support_tickets')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('status', 'replied')
        )
      }

      const [notifs, dms, communitiesResult, tickets] = await Promise.all(promises)

      set({
        currentUser: profile,
        unreadNotificationsCount: notifs.count ?? 0,
        unreadDMsCount: dms.count ?? 0,
        userCommunities: communitiesResult.data ?? [],
        openSupportTicketsCount: tickets?.count ?? 0,
        isInitialized: true,
      })
    } catch (error) {
      console.error('Error fetching global data:', error)
      set({ isInitialized: true })
    }
  }
}))
