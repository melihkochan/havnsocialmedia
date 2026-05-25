'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

// Get viewer's IP address from request headers
async function getViewerIP(): Promise<string | null> {
  const headersList = await headers()
  return (
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headersList.get('x-real-ip') ||
    'unknown'
  )
}

// Track a profile view — deduplicated by user or IP
export async function trackProfileView(profileId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Don't track if viewing own profile
  if (user?.id === profileId) return

  const viewerIp = await getViewerIP()
  const supabaseAdmin = await createServiceClient()

  try {
    if (user) {
      // Logged-in user — check if already viewed
      const { data: existing, error: selectError } = await supabaseAdmin
        .from('profile_views')
        .select('id')
        .eq('profile_id', profileId)
        .eq('viewer_id', user.id)
        .limit(1)
        .maybeSingle()

      if (selectError) {
        console.error('trackProfileView select error (user):', selectError)
      }

      if (!existing) {
        const { error: insertError } = await supabaseAdmin.from('profile_views').insert({
          profile_id: profileId,
          viewer_id: user.id,
          viewer_ip: viewerIp,
        })
        if (insertError) {
          console.error('trackProfileView insert error (user):', insertError)
        }
      }
    } else {
      // Anonymous — check if already viewed by IP
      if (viewerIp && viewerIp !== 'unknown') {
        const { data: existing, error: selectError } = await supabaseAdmin
          .from('profile_views')
          .select('id')
          .eq('profile_id', profileId)
          .eq('viewer_ip', viewerIp)
          .is('viewer_id', null)
          .limit(1)
          .maybeSingle()

        if (selectError) {
          console.error('trackProfileView select error (anon):', selectError)
        }

        if (!existing) {
          const { error: insertError } = await supabaseAdmin.from('profile_views').insert({
            profile_id: profileId,
            viewer_ip: viewerIp,
          })
          if (insertError) {
            console.error('trackProfileView insert error (anon):', insertError)
          }
        }
      }
    }
  } catch (err) {
    console.error('trackProfileView exception:', err)
  }
}

// Track a post view — deduplicated by user or IP
export async function trackPostView(postId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const viewerIp = await getViewerIP()
  const supabaseAdmin = await createServiceClient()

  try {
    if (user) {
      const { data: existing, error: selectError } = await supabaseAdmin
        .from('post_views')
        .select('id')
        .eq('post_id', postId)
        .eq('viewer_id', user.id)
        .limit(1)
        .maybeSingle()

      if (selectError) {
        console.error('trackPostView select error (user):', selectError)
      }

      if (!existing) {
        const { error: insertError } = await supabaseAdmin.from('post_views').insert({
          post_id: postId,
          viewer_id: user.id,
          viewer_ip: viewerIp,
        })
        if (insertError) {
          console.error('trackPostView insert error (user):', insertError)
        }
      }
    } else {
      if (viewerIp && viewerIp !== 'unknown') {
        const { data: existing, error: selectError } = await supabaseAdmin
          .from('post_views')
          .select('id')
          .eq('post_id', postId)
          .eq('viewer_ip', viewerIp)
          .is('viewer_id', null)
          .limit(1)
          .maybeSingle()

        if (selectError) {
          console.error('trackPostView select error (anon):', selectError)
        }

        if (!existing) {
          const { error: insertError } = await supabaseAdmin.from('post_views').insert({
            post_id: postId,
            viewer_ip: viewerIp,
          })
          if (insertError) {
            console.error('trackPostView insert error (anon):', insertError)
          }
        }
      }
    }
  } catch (err) {
    console.error('trackPostView exception:', err)
  }
}

// Get profile view count
export async function getProfileViewCount(profileId: string): Promise<number> {
  try {
    const supabaseAdmin = await createServiceClient()
    const { count } = await supabaseAdmin
      .from('profile_views')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profileId)
    return count ?? 0
  } catch {
    return 0
  }
}

// Get post view count
export async function getPostViewCount(postId: string): Promise<number> {
  try {
    const supabaseAdmin = await createServiceClient()
    const { count } = await supabaseAdmin
      .from('post_views')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId)
    return count ?? 0
  } catch {
    return 0
  }
}

// Get community stats — only for owners/moderators
export async function getCommunityStats(communityId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Check if user is owner/moderator
    const { data: membership } = await supabase
      .from('community_members')
      .select('role')
      .eq('community_id', communityId)
      .eq('user_id', user.id)
      .single()

    if (!membership || !['owner', 'moderator'].includes(membership.role)) {
      return null
    }

    // Parallel: member count, post count
    const [
      { count: memberCount },
      { count: postCount },
      { data: posts },
    ] = await Promise.all([
      supabase.from('community_members')
        .select('*', { count: 'exact', head: true })
        .eq('community_id', communityId)
        .eq('status', 'approved'),
      supabase.from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('community_id', communityId),
      supabase.from('posts')
        .select('id')
        .eq('community_id', communityId),
    ])

    // Get total views (may fail if table doesn't exist)
    let totalPostViews = 0
    try {
      if (posts && posts.length > 0) {
        const postIds = posts.map(p => p.id)
        const { count } = await supabase
          .from('post_views')
          .select('*', { count: 'exact', head: true })
          .in('post_id', postIds)
        totalPostViews = count ?? 0
      }
    } catch { /* table may not exist yet */ }

    // Recent members (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { count: newMembersThisWeek } = await supabase
      .from('community_members')
      .select('*', { count: 'exact', head: true })
      .eq('community_id', communityId)
      .eq('status', 'approved')
      .gte('created_at', weekAgo)

    return {
      memberCount: memberCount ?? 0,
      postCount: postCount ?? 0,
      totalPostViews,
      newMembersThisWeek: newMembersThisWeek ?? 0,
    }
  } catch {
    return null
  }
}
