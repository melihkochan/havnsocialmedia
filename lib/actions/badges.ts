'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getRankInfo } from '@/lib/gamification'

export interface BadgeTier {
  level: number
  target: number
  title: string
  gradient: string
  bg_color: string
  border_color: string
  glow: string
}

export interface BadgeDefinition {
  id: string
  base_title: string
  base_description: string
  type: 'followers' | 'posts' | 'communities_joined' | 'level' | 'action' | 'image_posts' | 'upvotes' | 'years'
  icon: string
  tiers: BadgeTier[]
}

const BADGE_CONFIG: BadgeDefinition[] = [
  {
    id: 'aranan_yuz',
    base_title: 'Aranan Yüz',
    base_description: 'Platformda {target} takipçiye ulaşarak kendi kitleni oluşturdun.',
    type: 'followers',
    icon: 'Users',
    tiers: [
      { level: 1, target: 50, title: 'Bronz Aranan Yüz', gradient: 'from-amber-700 to-amber-900', bg_color: 'bg-amber-900/10', border_color: 'border-amber-700/30', glow: '' },
      { level: 2, target: 150, title: 'Gümüş Aranan Yüz', gradient: 'from-slate-400 to-slate-600', bg_color: 'bg-slate-500/10', border_color: 'border-slate-400/30', glow: 'shadow-sm shadow-slate-400/20' },
      { level: 3, target: 500, title: 'Altın Aranan Yüz', gradient: 'from-amber-400 via-yellow-500 to-orange-500', bg_color: 'bg-amber-500/10', border_color: 'border-amber-400/40', glow: 'shadow-md shadow-amber-500/30' },
      { level: 4, target: 1000, title: 'Efsanevi Aranan Yüz', gradient: 'from-cyan-400 via-fuchsia-500 to-indigo-600', bg_color: 'bg-fuchsia-500/10', border_color: 'border-fuchsia-500/50', glow: 'shadow-xl shadow-fuchsia-500/50 animate-pulse border-animate' }
    ]
  },
  {
    id: 'icerik_ureticisi',
    base_title: 'İçerik Üreticisi',
    base_description: 'Havn platformunda en az {target} gönderi paylaştın.',
    type: 'posts',
    icon: 'Flame',
    tiers: [
      { level: 1, target: 10, title: 'Bronz Yazar', gradient: 'from-stone-500 to-stone-700', bg_color: 'bg-stone-500/10', border_color: 'border-stone-500/20', glow: '' },
      { level: 2, target: 50, title: 'Gümüş Yazar', gradient: 'from-teal-400 to-emerald-600', bg_color: 'bg-teal-500/10', border_color: 'border-teal-500/30', glow: '' },
      { level: 3, target: 200, title: 'Altın Üstad', gradient: 'from-rose-500 to-orange-500', bg_color: 'bg-rose-500/10', border_color: 'border-rose-500/30', glow: 'shadow-md shadow-rose-500/20' },
      { level: 4, target: 500, title: 'Kral Üretici', gradient: 'from-purple-600 via-pink-500 to-red-500', bg_color: 'bg-purple-500/10', border_color: 'border-purple-500/50', glow: 'shadow-xl shadow-purple-500/40 animate-bounce' }
    ]
  },
  {
    id: 'topluluk_gezgini',
    base_title: 'Topluluk Gezgini',
    base_description: 'En az {target} farklı topluluğa katılarak bağlarını güçlendirdin.',
    type: 'communities_joined',
    icon: 'Compass',
    tiers: [
      { level: 1, target: 3, title: 'Gezgin', gradient: 'from-blue-400 to-cyan-500', bg_color: 'bg-blue-500/10', border_color: 'border-blue-500/20', glow: '' },
      { level: 2, target: 10, title: 'Kâşif', gradient: 'from-indigo-400 to-violet-600', bg_color: 'bg-indigo-500/10', border_color: 'border-indigo-500/30', glow: 'shadow-md shadow-indigo-500/20' }
    ]
  },
  {
    id: 'soluksuz_buyume',
    base_title: 'Seviye Kilidi',
    base_description: 'Havn platformunda {target}. seviyeye ulaştın.',
    type: 'level',
    icon: 'ChevronsUp',
    tiers: [
      { level: 1, target: 6, title: 'Gezgin Üye', gradient: 'from-emerald-400 to-teal-500', bg_color: 'bg-emerald-500/10', border_color: 'border-emerald-500/20', glow: '' },
      { level: 2, target: 16, title: 'Bilgi Kaynağı', gradient: 'from-purple-500 to-indigo-600', bg_color: 'bg-purple-500/10', border_color: 'border-purple-500/20', glow: 'shadow-md shadow-purple-500/20' },
      { level: 3, target: 31, title: 'Efsane Üye', gradient: 'from-amber-400 to-yellow-600', bg_color: 'bg-amber-500/10', border_color: 'border-amber-400/40', glow: 'shadow-lg shadow-yellow-500/30' },
      { level: 4, target: 50, title: 'Mitolojik Üye', gradient: 'from-rose-500 via-pink-500 to-purple-600', bg_color: 'bg-rose-500/10', border_color: 'border-rose-500/40', glow: 'shadow-xl shadow-rose-500/40 animate-pulse' }
    ]
  },
  {
    id: 'ilk_kan',
    base_title: 'İlk Kan',
    base_description: 'Havn platformunda ilk gönderini paylaştın!',
    type: 'action',
    icon: 'Droplet',
    tiers: [
      { level: 1, target: 1, title: 'İlk Kan', gradient: 'from-red-500 to-rose-700', bg_color: 'bg-red-500/10', border_color: 'border-red-500/20', glow: '' }
    ]
  },
  {
    id: 'gece_kusu',
    base_title: 'Gece Kuşu',
    base_description: 'Gece 02:00 ile 05:00 saatleri arasında Havn\'da aktif oldun.',
    type: 'action',
    icon: 'Moon',
    tiers: [
      { level: 1, target: 1, title: 'Gece Kuşu', gradient: 'from-indigo-600 via-purple-700 to-fuchsia-800', bg_color: 'bg-purple-500/10', border_color: 'border-purple-500/30', glow: 'shadow-lg shadow-purple-500/30' }
    ]
  },
  {
    id: 'gorsel_deha',
    base_title: 'Görsel Deha',
    base_description: 'Platformda {target} görsel içerikli gönderi paylaştın.',
    type: 'image_posts',
    icon: 'Image',
    tiers: [
      { level: 1, target: 1, title: 'Fotoğrafçı', gradient: 'from-sky-400 to-blue-500', bg_color: 'bg-sky-500/10', border_color: 'border-sky-500/20', glow: '' },
      { level: 2, target: 25, title: 'Görsel Deha', gradient: 'from-pink-500 to-rose-500', bg_color: 'bg-pink-500/10', border_color: 'border-pink-500/30', glow: 'shadow-md' }
    ]
  },
  {
    id: 'fikir_onderi',
    base_title: 'Fikir Önderi',
    base_description: 'Yardım/Öneri forumunda paylaştığın bir öneri 50\'den fazla destek oyu aldı.',
    type: 'upvotes',
    icon: 'Lightbulb',
    tiers: [
      { level: 1, target: 50, title: 'Fikir Önderi', gradient: 'from-yellow-400 to-orange-500', bg_color: 'bg-yellow-500/10', border_color: 'border-yellow-500/30', glow: 'shadow-md' }
    ]
  },
  {
    id: 'veteran',
    base_title: 'Kıdem',
    base_description: 'Havn platformunda {target} koca yılı başarıyla devirdin!',
    type: 'years',
    icon: 'ShieldAlert',
    tiers: [
      { level: 1, target: 1, title: '1 Yıllık Veteran', gradient: 'from-slate-500 to-slate-800', bg_color: 'bg-slate-500/10', border_color: 'border-slate-500/20', glow: '' },
      { level: 2, target: 2, title: '2 Yıllık Veteran', gradient: 'from-cyan-500 to-blue-800', bg_color: 'bg-cyan-500/10', border_color: 'border-cyan-500/30', glow: '' },
      { level: 3, target: 3, title: '3 Yıllık Kıdemli Kral', gradient: 'from-yellow-500 via-red-500 to-purple-600', bg_color: 'bg-red-500/10', border_color: 'border-red-500/40', glow: 'shadow-xl animate-pulse' }
    ]
  }
]

export interface UserUnlockedBadge {
  id: string
  title: string
  description: string
  icon: string
  gradient: string
  bg_color: string
  border_color: string
  glow: string
  is_visible: boolean
  unlocked_at: string
  current_tier: number
  max_tiers: number
}

// Fetch all badges for a user (combines unlocked db rows with dynamic tiered info based on live stats)
export async function getUserBadges(userId: string): Promise<UserUnlockedBadge[]> {
  try {
    const supabase = await createClient()
    
    // Fetch user's unlocked badges rows
    const { data: unlocked, error } = await supabase
      .from('user_badges')
      .select('badge_id, is_visible, unlocked_at')
      .eq('user_id', userId)

    if (error || !unlocked || unlocked.length === 0) return []

    // Fetch user stats in parallel
    const [
      followersCountRes,
      postsCountRes,
      imagePostsCountRes,
      communitiesCountRes,
      profileRes
    ] = await Promise.all([
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', userId).not('image_url', 'is', null),
      supabase.from('community_members').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'approved'),
      supabase.from('profiles').select('xp, created_at').eq('id', userId).single()
    ])

    const followersCount = followersCountRes.count ?? 0
    const postsCount = postsCountRes.count ?? 0
    const imagePostsCount = imagePostsCountRes.count ?? 0
    const communitiesCount = communitiesCountRes.count ?? 0
    const xp = profileRes.data?.xp ?? 0
    const level = getRankInfo(xp).level
    const joinDate = new Date(profileRes.data?.created_at || Date.now()).getTime()
    const yearsCount = (Date.now() - joinDate) / (1000 * 60 * 60 * 24 * 365.25)

    const unlockedMap = new Map(unlocked.map(b => [b.badge_id, b]))
    const result: UserUnlockedBadge[] = []

    for (const def of BADGE_CONFIG) {
      const match = unlockedMap.get(def.id)
      if (match) {
        // Resolve current stat value
        let statValue = 0
        switch (def.type) {
          case 'followers':
            statValue = followersCount
            break
          case 'posts':
            statValue = postsCount
            break
          case 'communities_joined':
            statValue = communitiesCount
            break
          case 'level':
            statValue = level
            break
          case 'image_posts':
            statValue = imagePostsCount
            break
          case 'years':
            statValue = yearsCount
            break
          case 'action':
          case 'upvotes':
            statValue = 1 // Already unlocked action/upvote, default to showing Tier 1
            break
        }

        // Get qualified tiers
        const qualifiedTiers = def.tiers.filter(t => statValue >= t.target)
        // Use highest qualified tier, or fallback to Tier 1
        const activeTier = [...qualifiedTiers].sort((a, b) => b.level - a.level)[0] || def.tiers[0]
        const description = def.base_description.replace('{target}', activeTier.target.toString())

        result.push({
          id: def.id,
          title: activeTier.title,
          description: description,
          icon: def.icon,
          gradient: activeTier.gradient,
          bg_color: activeTier.bg_color,
          border_color: activeTier.border_color,
          glow: activeTier.glow,
          is_visible: match.is_visible,
          unlocked_at: match.unlocked_at,
          current_tier: activeTier.level,
          max_tiers: def.tiers.length
        })
      }
    }
    return result
  } catch (e) {
    return []
  }
}

// Toggle visibility of a specific badge
export async function toggleBadgeVisibility(badgeId: string, isVisible: boolean) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Giriş yapmalısınız.' }

    const { error } = await supabase
      .from('user_badges')
      .update({ is_visible: isVisible })
      .eq('user_id', user.id)
      .eq('badge_id', badgeId)

    if (error) return { error: error.message }
    
    // Revalidate profile pages
    const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single()
    if (profile?.username) {
      revalidatePath(`/profile/${profile.username}`)
    }
    return { success: true }
  } catch (err: any) {
    return { error: err.message }
  }
}

// Internal function to unlock a badge (inserting it + sending notification)
async function unlockBadge(userId: string, badgeId: string, unlockedAt?: string | Date): Promise<boolean> {
  try {
    const serviceClient = await createServiceClient()
    
    // Check if already unlocked
    const { data: existing } = await serviceClient
      .from('user_badges')
      .select('id')
      .eq('user_id', userId)
      .eq('badge_id', badgeId)
      .maybeSingle()

    if (existing) return false

    // Unlock
    const { error: unlockError } = await serviceClient
      .from('user_badges')
      .insert({
        user_id: userId,
        badge_id: badgeId,
        is_visible: true,
        unlocked_at: unlockedAt ? new Date(unlockedAt).toISOString() : new Date().toISOString()
      })

    if (unlockError) return false

    // Send a system notification to the user about unlocking this badge
    try {
      const def = BADGE_CONFIG.find(b => b.id === badgeId)
      if (def) {
        const { createNotification } = await import('@/lib/actions/notifications')
        
        // System account id or admin id fallback for actor_id
        const systemActorId = '33843a93-27a7-46af-af8a-27cd92404022' // standard system bot / system admin UUID
        
        await createNotification(
          userId,
          systemActorId,
          'approved', // social tick approved notification slot
          null,
          null,
          {
            message: `Tebrikler! "${def.base_title}" başarımı kazandınız!`,
            postPreview: null
          }
        )
      }
    } catch (nErr) {
      // Ignored warning
    }

    return true
  } catch (err) {
    return false
  }
}

// Run checks for all locked badges of a user
export async function checkAllBadgesForUser(userId: string) {
  try {
    const serviceClient = await createServiceClient()

    // 1. Fetch unlocked badges
    const { data: unlocked } = await serviceClient
      .from('user_badges')
      .select('badge_id, unlocked_at')
      .eq('user_id', userId)

    const unlockedMap = new Map((unlocked ?? []).map(b => [b.badge_id, b]))
    let unlockedAny = false

    // Helper to award a badge if not already unlocked
    const awardIfQualified = async (badgeId: string, isQualified: boolean, unlockedAt?: string | Date) => {
      if (isQualified && !unlockedMap.has(badgeId)) {
        const success = await unlockBadge(userId, badgeId, unlockedAt)
        if (success) unlockedAny = true
      }
    }

    // 2. Fetch User Profile
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('created_at, updated_at, xp')
      .eq('id', userId)
      .single()

    // 3. Fetch User counts & milestones in parallel
    const [
      postsRes,
      imagePostsRes,
      followersRes,
      membershipsRes
    ] = await Promise.all([
      serviceClient.from('posts').select('created_at').eq('user_id', userId).order('created_at', { ascending: true }),
      serviceClient.from('posts').select('created_at').eq('user_id', userId).not('image_url', 'is', null).order('created_at', { ascending: true }),
      serviceClient.from('follows').select('created_at').eq('following_id', userId).order('created_at', { ascending: true }),
      serviceClient.from('community_members').select('created_at').eq('user_id', userId).eq('status', 'approved').order('created_at', { ascending: true })
    ])

    const posts = postsRes.data || []
    const imagePosts = imagePostsRes.data || []
    const followers = followersRes.data || []
    const memberships = membershipsRes.data || []

    const postsCount = posts.length
    const imagePostsCount = imagePosts.length
    const followersCount = followers.length
    const communitiesCount = memberships.length
    const xp = profile?.xp ?? 0
    const level = getRankInfo(xp).level
    const joinDate = new Date(profile?.created_at || Date.now()).getTime()
    const yearsCount = (Date.now() - joinDate) / (1000 * 60 * 60 * 24 * 365.25)

    // ─── CHECK 2: Gece Kuşu (Activity between 02:00 and 05:00 TR time) ───
    let hasNightActivity = false
    let nightUnlockedAt: string | null = null

    // Check posts
    if (posts && posts.length > 0) {
      const nightPost = posts.find(p => {
        const d = new Date(p.created_at)
        const trHour = (d.getUTCHours() + 3) % 24
        return trHour >= 2 && trHour < 5
      })
      if (nightPost) {
        hasNightActivity = true
        nightUnlockedAt = nightPost.created_at
      }
    }

    // Check comments if posts did not qualify
    if (!hasNightActivity) {
      const { data: comments } = await serviceClient
        .from('comments')
        .select('created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })

      if (comments && comments.length > 0) {
        const nightComment = comments.find(c => {
          const d = new Date(c.created_at)
          const trHour = (d.getUTCHours() + 3) % 24
          return trHour >= 2 && trHour < 5
        })
        if (nightComment) {
          hasNightActivity = true
          nightUnlockedAt = nightComment.created_at
        }
      }
    }

    // ─── CHECK 3: Fikir Önderi (Suggestions with >= 50 upvotes) ───
    let qualifiesForIdeaLeader = false
    let ideaLeaderDate: string | null = null

    const { data: suggestions } = await serviceClient
      .from('suggestions')
      .select('id, created_at, suggestion_votes(vote_type, created_at)')
      .eq('user_id', userId)

    for (const s of (suggestions ?? [])) {
      const votes = s.suggestion_votes || []
      const upvotes = votes.filter((v: any) => v.vote_type === 1)
      if (upvotes.length >= 50) {
        qualifiesForIdeaLeader = true
        const sortedUpvotes = [...upvotes].sort((a: any, b: any) => 
          new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
        )
        ideaLeaderDate = sortedUpvotes[49]?.created_at || s.created_at
        break
      }
    }

    // ─── RUN ALL EVALUATIONS & UPDATE DATES FOR TIER UPGRADES ───
    for (const def of BADGE_CONFIG) {
      let statValue = 0
      switch (def.type) {
        case 'followers':
          statValue = followersCount
          break
        case 'posts':
          statValue = postsCount
          break
        case 'communities_joined':
          statValue = communitiesCount
          break
        case 'level':
          statValue = level
          break
        case 'image_posts':
          statValue = imagePostsCount
          break
        case 'years':
          statValue = yearsCount
          break
        case 'action':
          statValue = def.id === 'ilk_kan' ? (postsCount >= 1 ? 1 : 0) : (hasNightActivity ? 1 : 0)
          break
        case 'upvotes':
          statValue = qualifiesForIdeaLeader ? 50 : 0
          break
      }

      // Check qualified tiers
      const qualifiedTiers = def.tiers.filter(t => statValue >= t.target)
      const isQualified = qualifiedTiers.length > 0

      if (isQualified) {
        const activeTier = [...qualifiedTiers].sort((a, b) => b.level - a.level)[0]
        
        // Resolve exact milestone date
        let milestoneDate: string | Date = new Date().toISOString()
        if (def.type === 'posts') {
          milestoneDate = posts[activeTier.target - 1]?.created_at || new Date().toISOString()
        } else if (def.type === 'image_posts') {
          milestoneDate = imagePosts[activeTier.target - 1]?.created_at || new Date().toISOString()
        } else if (def.type === 'followers') {
          milestoneDate = followers[activeTier.target - 1]?.created_at || new Date().toISOString()
        } else if (def.type === 'communities_joined') {
          milestoneDate = memberships[activeTier.target - 1]?.created_at || new Date().toISOString()
        } else if (def.type === 'years') {
          const oneYearMs = 1000 * 60 * 60 * 24 * 365.25
          milestoneDate = new Date(joinDate + oneYearMs * activeTier.target).toISOString()
        } else if (def.type === 'level') {
          milestoneDate = profile?.updated_at || new Date().toISOString()
        } else if (def.id === 'ilk_kan') {
          milestoneDate = posts[0]?.created_at || new Date().toISOString()
        } else if (def.id === 'gece_kusu' && nightUnlockedAt) {
          milestoneDate = nightUnlockedAt
        } else if (def.id === 'fikir_onderi' && ideaLeaderDate) {
          milestoneDate = ideaLeaderDate
        }

        const dbRecord = unlockedMap.get(def.id)
        if (!dbRecord) {
          // Unlock new badge
          const success = await unlockBadge(userId, def.id, milestoneDate)
          if (success) unlockedAny = true
        } else {
          // Check if user upgraded to a higher tier and adjust the unlock date accordingly
          const dbTime = new Date(dbRecord.unlocked_at).getTime()
          const msTime = new Date(milestoneDate).getTime()
          if (msTime > dbTime + 1000) {
            await serviceClient
              .from('user_badges')
              .update({ unlocked_at: new Date(milestoneDate).toISOString() })
              .eq('user_id', userId)
              .eq('badge_id', def.id)
            unlockedAny = true
          }
        }
      } else {
        // If not qualified anymore (e.g. follow deleted, post deleted), optionally remove the row
        if (unlockedMap.has(def.id)) {
          await serviceClient
            .from('user_badges')
            .delete()
            .eq('user_id', userId)
            .eq('badge_id', def.id)
          unlockedAny = true
        }
      }
    }

    if (unlockedAny && profile) {
      const { data: usernameProfile } = await serviceClient.from('profiles').select('username').eq('id', userId).single()
      if (usernameProfile?.username) {
        revalidatePath(`/profile/${usernameProfile.username}`)
      }
    }
  } catch (err) {
    // Ignored error
  }
}
