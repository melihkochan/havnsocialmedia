'use server'

import { createClient } from '@/lib/supabase/server'
import { enrichProfile, EnrichedProfile } from '@/lib/profile-enrich'

interface PopularCommunity {
  id: string
  name: string
  slug: string
  type: string
  memberCount: number
}

interface TeamMember {
  id: string
  username: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  bio: string | null
  is_gold: boolean
  is_verified: boolean
  role: string
  updated_at: string
}

interface LeaderboardUser {
  id: string
  username: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  xp: number
  is_gold: boolean
  is_verified: boolean
  role: string
}

interface TrendingHashtag {
  tag: string
  count: number
}

interface AnnouncementData {
  id: string
  content: string | null
  created_at: string
  profiles: {
    username: string
    avatar_url: string | null
    first_name: string | null
    last_name: string | null
  } | null
}

export async function getRightBarData() {
  const supabase = await createClient()

  // 1. Fetch team members (melih, havn)
  const teamPromise = supabase
    .from('profiles')
    .select('id, username, first_name, last_name, avatar_url, bio, is_gold, is_verified, role, updated_at')
    .in('username', ['melih', 'havn'])

  // 2. Fetch top 10 XP leaderboard users (excluding havn official system account)
  const leaderboardPromise = supabase
    .from('profiles')
    .select('id, username, first_name, last_name, avatar_url, xp, is_gold, is_verified, role, bio')
    .neq('username', 'havn')
    .order('xp', { ascending: false })
    .limit(10)

  // 3. Fetch latest 100 posts for hashtag extraction
  const postsPromise = supabase
    .from('posts')
    .select('content')
    .is('community_id', null) // only public posts to avoid private community leaking
    .order('created_at', { ascending: false })
    .limit(100)

  // 4. Fetch latest announcement (latest post by 'havn' or containing '#duyuru')
  const announcementPromise = supabase
    .from('posts')
    .select('id, content, created_at, profiles(username, avatar_url, first_name, last_name)')
    .or('user_id.eq.33843a93-27a7-46af-af8a-27cd92404022,content.ilike.%#duyuru%')
    .order('created_at', { ascending: false })
    .limit(1)

  // 5. Fetch stats & popular communities
  const communitiesPromise = supabase
    .from('communities')
    .select('id, name, slug, type')
    .order('created_at', { ascending: false })

  const [
    teamRes,
    leaderboardRes,
    postsRes,
    announcementRes,
    communitiesRes
  ] = await Promise.all([
    teamPromise,
    leaderboardPromise,
    postsPromise,
    announcementPromise,
    communitiesPromise
  ])

  // Process Team
  const teamList = (teamRes.data ?? []).map(p => enrichProfile(p) as TeamMember)

  // Process Leaderboard (filtering out users who chose to hide their XP)
  const leaderboardList = (leaderboardRes.data ?? [])
    .map(p => enrichProfile(p))
    .filter((u): u is EnrichedProfile => u !== null && u.show_xp !== false)
    .slice(0, 5) as unknown as LeaderboardUser[]

  // Extract Trending Hashtags
  const tagCounts: Record<string, number> = {}
  const rawPosts = postsRes.data ?? []
  
  rawPosts.forEach(post => {
    if (!post.content) return
    // Strip HTML tags to get pure text and avoid matching color codes or attributes
    const plainText = post.content.replace(/<[^>]*>/g, ' ')
    // Extract hashtags matching standard Turkish/English word characters
    const matches = plainText.match(/#[a-zA-Z0-9ığüşöçİĞÜŞÖÇ_]+/g)
    if (matches) {
      matches.forEach((tag: string) => {
        const normalized = tag.toLowerCase()
        tagCounts[normalized] = (tagCounts[normalized] || 0) + 1
      })
    }
  })

  const trendingTags: TrendingHashtag[] = Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Process Announcement
  let latestAnnouncement: AnnouncementData | null = null
  if (announcementRes.data && announcementRes.data.length > 0) {
    const rawAnn = announcementRes.data[0]
    if (rawAnn.content) {
      const parts = rawAnn.content.split('\u200B')
      const cleanContent = parts[0]
      let meta: any = { expires_at: null }
      if (parts.length > 1) {
        try {
          meta = JSON.parse(parts[1])
        } catch (e) {}
      }
      
      const now = new Date()
      const isExpired = meta.expires_at ? new Date(meta.expires_at) < now : false
      
      if (!isExpired) {
        latestAnnouncement = {
          ...rawAnn,
          content: cleanContent,
        } as unknown as AnnouncementData
      }
    }
  }

  // Process Communities Stats & Popular List
  const rawComms = communitiesRes.data ?? []
  const totalCommunities = rawComms.length

  // Get member counts for popular list (top 5)
  const withCounts = await Promise.all(
    rawComms.slice(0, 8).map(async (c) => {
      const { count } = await supabase
        .from('community_members')
        .select('*', { count: 'exact', head: true })
        .eq('community_id', c.id)
        .eq('status', 'approved')
      return { ...c, memberCount: count ?? 0 }
    })
  )
  withCounts.sort((a, b) => b.memberCount - a.memberCount)
  const popularCommunities = withCounts.slice(0, 5) as PopularCommunity[]

  // Total members calculation (sum of member counts in all communities)
  // Let's do a direct count on community_members approved
  const { count: totalMembersCount } = await supabase
    .from('community_members')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved')

  return {
    team: teamList,
    leaderboard: leaderboardList,
    trendingTags,
    announcement: latestAnnouncement,
    totalCommunities,
    totalMembers: totalMembersCount ?? 0,
    popularCommunities
  }
}
