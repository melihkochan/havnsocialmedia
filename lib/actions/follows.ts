'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { enrichProfile } from '@/lib/profile-enrich'
import { saveProfileMetadata } from '@/lib/actions/profile-db'

export async function followUser(targetUserId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }
  if (user.id === targetUserId) return { error: 'Kendinizi takip edemezsiniz.' }

  // 1. Fetch target profile to check if it's private using normal client
  const { data: targetProfile, error: fetchErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', targetUserId)
    .single()

  if (fetchErr || !targetProfile) return { error: 'Kullanıcı bulunamadı.' }

  const enriched = enrichProfile(targetProfile)
  if (!enriched) return { error: 'Kullanıcı çözümlenemedi.' }

  if (enriched.is_private) {
    // Follow Request Flow
    const followRequests = enriched.follow_requests || []
    if (!followRequests.includes(user.id)) {
      followRequests.push(user.id)
    }

    const { error: updateErr } = await saveProfileMetadata(targetUserId, { follow_requests: followRequests })
    if (updateErr) return { error: 'Takip isteği gönderilemedi: ' + updateErr }

    // Create follow notification
    try {
      const { createNotification } = await import('@/lib/actions/notifications')
      await createNotification(
        targetUserId,
        user.id,
        'follow'
      )
    } catch (e) {
      console.warn('Could not create notification for follow request:', e)
    }

    revalidatePath('/feed')
    revalidatePath('/profile')
    if (targetProfile.username) revalidatePath(`/profile/${targetProfile.username}`)
    return { success: true, status: 'requested' }
  }

  // Normal Follow Flow
  const { error } = await supabase
    .from('follows')
    .insert({
      follower_id: user.id,
      following_id: targetUserId
    })

  if (error) {
    console.error('followUser error:', error)
    return { error: error.message }
  }

  // Create a notification for the followed user
  try {
    const { createNotification } = await import('@/lib/actions/notifications')
    await createNotification(
      targetUserId,
      user.id,
      'follow'
    )
  } catch (e) {
    console.warn('Could not create notification for follow:', e)
  }

  revalidatePath('/feed')
  revalidatePath('/profile')
  if (targetProfile.username) revalidatePath(`/profile/${targetProfile.username}`)
  return { success: true, status: 'following' }
}

export async function unfollowUser(targetUserId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }

  // 1. Remove from follows table (if exists)
  const { error: deleteErr } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_id', targetUserId)

  // 2. Check if a pending follow request exists in target profile's metadata
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', targetUserId)
    .single()

  if (targetProfile) {
    const enriched = enrichProfile(targetProfile)
    if (enriched) {
      let followRequests = enriched.follow_requests || []
      if (followRequests.includes(user.id)) {
        followRequests = followRequests.filter((id: string) => id !== user.id)
        await saveProfileMetadata(targetUserId, { follow_requests: followRequests })
      }
    }

    revalidatePath('/feed')
    revalidatePath('/profile')
    if (targetProfile.username) revalidatePath(`/profile/${targetProfile.username}`)
  }

  return { success: true }
}

export async function checkFollowStatus(followerId: string, followingId: string): Promise<'none' | 'requested' | 'following'> {
  const supabase = await createClient()

  // 1. Check follows table
  const { data, error } = await supabase
    .from('follows')
    .select('created_at')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .single()

  if (data && !error) return 'following'

  // 2. Check if followerId is in followingId's follow_requests metadata list
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', followingId)
    .single()

  if (profile) {
    const enriched = enrichProfile(profile)
    if (enriched && enriched.follow_requests?.includes(followerId)) {
      return 'requested'
    }
  }

  return 'none'
}

export async function approveFollowRequest(followerId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }

  const supabaseAdmin = await createServiceClient()

  // 1. Remove followerId from current user's follow_requests list
  const { data: currentProfile, error: fetchErr } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (fetchErr || !currentProfile) return { error: 'Profil bulunamadı.' }

  const enriched = enrichProfile(currentProfile)
  if (!enriched) return { error: 'Profil çözümlenemedi.' }

  let followRequests = enriched.follow_requests || []
  followRequests = followRequests.filter((id: string) => id !== followerId)

  // Update follow requests
  const { error: updateErr } = await saveProfileMetadata(user.id, { follow_requests: followRequests })
  if (updateErr) return { error: 'Profil güncellenemedi: ' + updateErr }

  // 2. Add follower to follows table
  const { error: followErr } = await supabaseAdmin
    .from('follows')
    .insert({
      follower_id: followerId,
      following_id: user.id
    })

  if (followErr) {
    console.error('approveFollowRequest follow insert error:', followErr)
  }

  // 3. Notify follower that follow request was approved
  try {
    const { createNotification } = await import('@/lib/actions/notifications')
    await createNotification(
      followerId,
      user.id,
      'approved'
    )
  } catch (e) {
    console.warn('Could not create notification for follow approval:', e)
  }

  // Mark all follow notifications from followerId to current user as read
  try {
    await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('actor_id', followerId)
      .eq('type', 'follow')
  } catch (e) {}

  revalidatePath('/notifications')
  revalidatePath('/feed')
  revalidatePath('/profile')
  return { success: true }
}

export async function declineFollowRequest(followerId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }

  const supabaseAdmin = await createServiceClient()

  // 1. Remove followerId from current user's follow_requests list
  const { data: currentProfile, error: fetchErr } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (fetchErr || !currentProfile) return { error: 'Profil bulunamadı.' }

  const enriched = enrichProfile(currentProfile)
  if (!enriched) return { error: 'Profil çözümlenemedi.' }

  let followRequests = enriched.follow_requests || []
  followRequests = followRequests.filter((id: string) => id !== followerId)

  // Update follow requests
  const { error: updateErr } = await saveProfileMetadata(user.id, { follow_requests: followRequests })
  if (updateErr) return { error: 'Profil güncellenemedi: ' + updateErr }

  // 2. Mark follow notifications from followerId as read
  try {
    await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('actor_id', followerId)
      .eq('type', 'follow')
  } catch (e) {}

  revalidatePath('/notifications')
  return { success: true }
}

export async function checkIsFollowing(followerId: string, followingId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('follows')
    .select('created_at')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .single()

  if (error || !data) return false
  return true
}

export async function getFollowStats(userId: string) {
  const supabase = await createClient()
  
  const [followersResult, followingResult] = await Promise.all([
    supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId),
    supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', userId)
  ])

  return {
    followersCount: followersResult.count ?? 0,
    followingCount: followingResult.count ?? 0
  }
}

export async function getFollowingProfiles(userId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('follows')
    .select(`
      following:profiles!following_id(*)
    `)
    .eq('follower_id', userId)

  if (error) {
    console.error('getFollowingProfiles error:', error)
    return []
  }

  return (data ?? []).map(f => f.following).filter(Boolean)
}

export async function getFollowersProfiles(userId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('follows')
    .select(`
      follower:profiles!follower_id(*)
    `)
    .eq('following_id', userId)

  if (error) {
    console.error('getFollowersProfiles error:', error)
    return []
  }

  return (data ?? []).map(f => f.follower).filter(Boolean)
}

export async function getSuggestedUsers() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Get current followings to exclude them
  const { data: followsData } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id)
  const followingIds = (followsData ?? []).map(f => f.following_id)

  let query = supabase
    .from('profiles')
    .select('*')
    .neq('id', user.id)
    .limit(5)

  if (followingIds.length > 0) {
    query = query.not('id', 'in', `(${followingIds.join(',')})`)
  }

  const { data: profiles, error } = await query

  if (error || !profiles) {
    if (error) console.error('getSuggestedUsers error:', error)
    return []
  }

  // Fetch who follows current user from this list
  const suggestedUserIds = profiles.map(p => p.id)
  const { data: followersData } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('following_id', user.id)
    .in('follower_id', suggestedUserIds)
  const followerIds = new Set((followersData ?? []).map(f => f.follower_id))

  const { enrichProfile } = await import('@/lib/profile-enrich')

  return profiles.map(p => {
    const enriched = enrichProfile(p)
    if (!enriched) return p

    let relation: 'none' | 'follows_you' | 'requested' = 'none'
    if (enriched.follow_requests?.includes(user.id)) {
      relation = 'requested'
    } else if (followerIds.has(p.id)) {
      relation = 'follows_you'
    }

    return {
      ...enriched,
      relation
    }
  })
}

export async function getRightBarSuggestions() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, first_name, last_name, avatar_url, bio, is_verified, is_gold, updated_at')
      .order('updated_at', { ascending: false })
      .limit(5)
    return (profiles ?? []).map(p => ({ ...p, relation: 'none' }))
  }

  // Fetch recent profiles excluding current user
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, username, first_name, last_name, avatar_url, bio, is_verified, is_gold, updated_at')
    .neq('id', user.id)
    .order('updated_at', { ascending: false })
    .limit(5)

  if (error || !profiles) return []

  const targetIds = profiles.map(p => p.id)
  const [followingResult, followersResult] = await Promise.all([
    supabase.from('follows').select('following_id').eq('follower_id', user.id).in('following_id', targetIds),
    supabase.from('follows').select('follower_id').eq('following_id', user.id).in('follower_id', targetIds),
  ])

  const followingSet = new Set((followingResult.data ?? []).map(f => f.following_id))
  const followersSet = new Set((followersResult.data ?? []).map(f => f.follower_id))

  const { enrichProfile } = await import('@/lib/profile-enrich')

  return profiles.map(p => {
    const enriched = enrichProfile(p)
    const pId = p.id
    const weFollow = followingSet.has(pId)
    const theyFollow = followersSet.has(pId)

    let relation: 'none' | 'following' | 'follows_you' | 'mutual' | 'requested' = 'none'

    if (weFollow && theyFollow) {
      relation = 'mutual'
    } else if (weFollow) {
      relation = 'following'
    } else if (theyFollow) {
      relation = 'follows_you'
    } else if (enriched?.follow_requests?.includes(user.id)) {
      relation = 'requested'
    }

    return {
      ...p,
      is_verified: enriched?.is_verified ?? p.is_verified,
      is_gold: enriched?.is_gold ?? p.is_gold,
      bio: enriched?.bio ?? p.bio,
      relation
    }
  })
}

