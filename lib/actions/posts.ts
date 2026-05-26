'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sortPostsWithPinned } from '@/lib/sort-posts'
import { enrichProfile } from '@/lib/profile-enrich'

const PAGE_SIZE = 20

export type FeedContext =
  | { type: 'feed'; sortBy?: 'new' | 'popular' }
  | { type: 'following'; userId: string; sortBy?: 'new' | 'popular' }
  | { type: 'community'; communityId: string; sortBy?: 'new' | 'popular' }
  | { type: 'profile'; profileUserId: string }

export async function getPosts(communityId: string, sortBy: 'new' | 'popular' = 'new') {
  const supabase = await createClient()

  // For popular sort we need more posts to rank correctly; for new, use DB-level pagination
  const fetchLimit = sortBy === 'popular' ? 100 : PAGE_SIZE

  const { data: posts, error } = await supabase
    .from('posts')
    .select(`
      *,
      profiles(*),
      likes(user_id),
      comments(id),
      bookmarks(user_id),
      parent_post:parent_post_id(*, profiles(*), likes(user_id), comments(id))
    `)
    .eq('community_id', communityId)
    .order('created_at', { ascending: false })
    .limit(fetchLimit)

  if (error) {
    console.error('getPosts error:', error)
    return []
  }

  // Fetch roles for post authors in this community
  const userIds = [...new Set(posts.map(p => p.user_id))]
  const { data: members } = await supabase
    .from('community_members')
    .select('user_id, role')
    .eq('community_id', communityId)
    .in('user_id', userIds)

  const roleMap = new Map((members ?? []).map(m => [m.user_id, m.role]))

  let processed = posts
    // Filter out orphan posts
    .filter(p => p.content !== null || p.parent_post_id !== null)
    // Filter out reposts inside communities to avoid duplicates as requested
    .filter(p => p.parent_post_id === null)
    .map(p => {
      const rawParent = (p as any).parent_post
      const parent_post = Array.isArray(rawParent)
        ? (rawParent.length > 0 ? rawParent[0] : null)
        : rawParent ?? null
      return {
        ...p,
        parent_post,
        community_members: [{ role: roleMap.get(p.user_id) ?? 'member' }],
      }
    })

  return sortPostsWithPinned(processed, sortBy).slice(0, sortBy === 'popular' ? 50 : PAGE_SIZE)
}

// Get only personal posts (no community posts) for the home feed
export async function getFeedPosts(userId?: string, sortBy: 'new' | 'popular' = 'new') {
  const supabase = await createClient()

  // For popular sort fetch more to rank correctly; for new use DB-level pagination
  const fetchLimit = sortBy === 'popular' ? 100 : PAGE_SIZE

  const { data: posts, error } = await supabase
    .from('posts')
    .select('*, profiles(*), likes(user_id), comments(id), bookmarks(user_id), parent_post:parent_post_id(*, profiles(*), likes(user_id), comments(id))')
    .is('community_id', null)
    .order('created_at', { ascending: false })
    .limit(fetchLimit)

  if (error) {
    console.error('getFeedPosts error:', error)
    return []
  }

  let processed = (posts ?? [])
    .filter(p => p.content !== null || p.parent_post_id !== null)
    .filter(p => !enrichProfile(p.profiles)?.is_private)
    .map(p => ({ ...p, communities: null }))

  // Sort by new or popular
  if (sortBy === 'popular') {
    processed = processed.sort((a, b) => (b.likes?.length ?? 0) - (a.likes?.length ?? 0))
  } else {
    processed = processed.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  const sliceEnd = sortBy === 'popular' ? 50 : PAGE_SIZE
  return processed.slice(0, sliceEnd).map(p => {
    const rawParent = (p as any).parent_post
    const parent_post = Array.isArray(rawParent)
      ? (rawParent.length > 0 ? rawParent[0] : null)
      : rawParent ?? null
    return {
      ...p,
      parent_post,
      community_members: [{ role: 'member' }],
    }
  })
}

export async function createPost(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }

  const content = formData.get('content') as string
  const communityId = formData.get('communityId') as string | null
  let imageUrl: string | null = null

  // Handle image upload if present
  const imageFile = formData.get('image') as File | null
  if (imageFile && imageFile.size > 0) {
    const ext = imageFile.name.split('.').pop()
    const path = `${user.id}/${Date.now()}.${ext}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('post-images')
      .upload(path, imageFile, { contentType: imageFile.type, upsert: false })

    if (uploadError) {
      return { error: 'Görsel yüklenemedi: ' + uploadError.message }
    }

    const { data: { publicUrl } } = supabase.storage
      .from('post-images')
      .getPublicUrl(uploadData.path)
    imageUrl = publicUrl
  }

  const { error } = await supabase.from('posts').insert({
    content,
    community_id: communityId || null,
    user_id: user.id,
    image_url: imageUrl,
  })

  if (error) return { error: error.message }

  // Reward user with +10 XP
  const { rewardXP } = await import('@/lib/actions/communities-premium')
  await rewardXP(user.id, 10)

  revalidatePath('/feed')
  revalidatePath('/communities')
  return { success: true }
}

export async function deletePost(postId: string, reason?: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }

  const { data: post, error: fetchError } = await supabase
    .from('posts')
    .select('id, user_id, community_id, content, communities(name, slug)')
    .eq('id', postId)
    .single()

  if (fetchError || !post) return { error: 'Gönderi bulunamadı.' }

  let canDelete = post.user_id === user.id

  if (!canDelete && post.community_id) {
    const { data: membership } = await supabase
      .from('community_members')
      .select('role')
      .eq('community_id', post.community_id)
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .single()

    canDelete = membership?.role === 'owner' || membership?.role === 'moderator'
  }

  if (!canDelete) return { error: 'Bu gönderiyi silme yetkiniz yok.' }

  const isModeratorRemoval = post.user_id !== user.id && !!post.community_id
  const trimmedReason = reason?.trim() || null
  const postPreview = post.content
    ? (post.content.length > 120 ? `${post.content.slice(0, 120)}…` : post.content)
    : null

  if (isModeratorRemoval) {
    const { createNotification } = await import('@/lib/actions/notifications')
    await createNotification(
      post.user_id,
      user.id,
      'post_removed',
      postId,
      null,
      {
        message: trimmedReason,
        communityId: post.community_id,
        postPreview,
      }
    )
  }

  const { error } = await supabase.from('posts').delete().eq('id', postId)

  if (error) return { error: error.message }

  revalidatePath('/feed')
  revalidatePath('/notifications')
  revalidatePath('/communities')
  const communityData = post.communities as { name: string; slug: string } | { name: string; slug: string }[] | null
  const community = Array.isArray(communityData) ? communityData[0] : communityData
  if (community?.slug) revalidatePath(`/communities/${community.slug}`)

  return { success: true }
}

export async function togglePinPost(postId: string, scope: 'community' | 'profile') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }

  const { data: post, error: fetchError } = await supabase
    .from('posts')
    .select('id, user_id, community_id, content, is_pinned, parent_post_id, communities(slug), profiles(username)')
    .eq('id', postId)
    .single()

  if (fetchError || !post) return { error: 'Gönderi bulunamadı.' }
  if (post.parent_post_id) return { error: 'Yeniden paylaşımlar sabitlenemez.' }

  const currentlyPinned = !!post.is_pinned
  const willPin = !currentlyPinned

  if (scope === 'community') {
    if (!post.community_id) return { error: 'Bu gönderi topluluk gönderisi değil.' }

    const { data: membership } = await supabase
      .from('community_members')
      .select('role')
      .eq('community_id', post.community_id)
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .single()

    const canPin = membership?.role === 'owner' || membership?.role === 'moderator'
    if (!canPin) return { error: 'Sabitleme yetkiniz yok.' }

    if (willPin) {
      await supabase
        .from('posts')
        .update({ is_pinned: false })
        .eq('community_id', post.community_id)
        .eq('is_pinned', true)
        .select()
    }
  } else {
    if (post.user_id !== user.id) {
      return { error: 'Yalnızca kendi profilinde gönderi sabitleyebilirsiniz.' }
    }
    if (willPin) {
      await supabase
        .from('posts')
        .update({ is_pinned: false })
        .eq('user_id', user.id)
        .eq('is_pinned', true)
        .select()
    }
  }

  const { data: updateData, error } = await supabase
    .from('posts')
    .update({ is_pinned: willPin })
    .eq('id', postId)
    .select()

  if (error) {
    if (error.message.includes('is_pinned')) {
      return { error: 'Sabitleme için veritabanı güncellemesi gerekli (is_pinned sütunu).' }
    }
    return { error: error.message }
  }

  if (!updateData || updateData.length === 0) {
    return {
      error: 'Sabitleme başarısız oldu. Güncelleme yetkiniz olmayabilir (Supabase RLS Politikası hatası) veya gönderi bulunamadı.'
    }
  }

  // Trigger notification if pinning someone else's post inside a community
  if (scope === 'community' && willPin && post.user_id !== user.id) {
    const { createNotification } = await import('@/lib/actions/notifications')
    const postPreview = post.content
      ? (post.content.length > 120 ? `${post.content.slice(0, 120)}…` : post.content)
      : null

    await createNotification(
      post.user_id,
      user.id,
      'post_pinned',
      postId,
      null,
      {
        communityId: post.community_id,
        postPreview,
      }
    )
  }

  const profileData = (post as any).profiles
  const username = Array.isArray(profileData) ? profileData[0]?.username : profileData?.username

  revalidatePath('/feed')
  if (username) {
    revalidatePath(`/profile/${username}`)
  }
  revalidatePath('/communities')
  const communityData = post.communities as { slug: string } | { slug: string }[] | null
  const slug = Array.isArray(communityData) ? communityData[0]?.slug : communityData?.slug
  if (slug) revalidatePath(`/communities/${slug}`)

  return { success: true, pinned: willPin }
}

export async function toggleLike(postId: string, reaction: string = 'like', forceState?: 'like' | 'unlike') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }

  // Check if already liked
  const { data: existing } = await supabase
    .from('likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .single()

  const shouldUnlike = forceState === 'unlike' || (forceState !== 'like' && existing)

  if (shouldUnlike) {
    if (existing) {
      await supabase.from('likes').delete().eq('id', existing.id)
      
      // Delete the corresponding like notification
      try {
        const { createServiceClient } = await import('@/lib/supabase/server')
        const supabaseAdmin = await createServiceClient()
        await supabaseAdmin
          .from('notifications')
          .delete()
          .eq('actor_id', user.id)
          .eq('type', 'like')
          .eq('post_id', postId)
      } catch (err) {
        console.error('Error deleting like notification:', err)
      }
    }
    return { liked: false }
  } else {
    if (!existing) {
      await supabase.from('likes').insert({ post_id: postId, user_id: user.id })
      // Reward user with +2 XP
      const { rewardXP } = await import('@/lib/actions/communities-premium')
      await rewardXP(user.id, 2)
    }
    
    // Trigger notification
    const { data: post } = await supabase.from('posts').select('user_id').eq('id', postId).single()
    if (post && post.user_id !== user.id) {
      const { createNotification } = await import('@/lib/actions/notifications')
      await createNotification(post.user_id, user.id, 'like', postId, null, {
        message: reaction !== 'like' ? reaction : null
      })
    }

    return { liked: true }
  }
}

export async function getPostById(postId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      profiles(*),
      likes(user_id),
      bookmarks(user_id),
      parent_post:parent_post_id(*, profiles(*)),
      comments(
        *,
        profiles(*),
        comment_likes(user_id)
      )
    `)
    .eq('id', postId)
    .single()

  if (error) return null
  return data
}

export async function repostPost(postId: string, communityId: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }

  // Check if already reposted
  const { data: existing } = await supabase
    .from('posts')
    .select('id')
    .eq('parent_post_id', postId)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    // Delete existing repost (undo repost)
    const { error } = await supabase.from('posts').delete().eq('id', existing.id)
    if (error) return { error: error.message }
    revalidatePath('/feed')
    if (communityId) revalidatePath(`/communities`)
    return { reposted: false }
  } else {
    // Create new repost
    const { error } = await supabase.from('posts').insert({
      parent_post_id: postId,
      user_id: user.id,
      community_id: communityId || null,
      content: null,
      image_url: null
    })
    if (error) return { error: error.message }

    // Trigger notification
    const { data: originalPost } = await supabase.from('posts').select('user_id').eq('id', postId).single()
    if (originalPost && originalPost.user_id !== user.id) {
      const { createNotification } = await import('@/lib/actions/notifications')
      await createNotification(originalPost.user_id, user.id, 'repost', postId)
    }

    revalidatePath('/feed')
    if (communityId) revalidatePath(`/communities`)
    return { reposted: true }
  }
}

// ─── BOOKMARKS & EDIT ACTIONS ────────────────────────────────────────────────

export async function toggleBookmark(postId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }

  // Check if already bookmarked
  const { data: existing } = await supabase
    .from('bookmarks')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    const { error } = await supabase.from('bookmarks').delete().eq('id', existing.id)
    if (error) return { error: error.message }
    return { bookmarked: false }
  } else {
    const { error } = await supabase.from('bookmarks').insert({ post_id: postId, user_id: user.id })
    if (error) return { error: error.message }
    return { bookmarked: true }
  }
}

export async function getBookmarkedPosts() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: bookmarks, error } = await supabase
    .from('bookmarks')
    .select(`
      post_id,
      posts:post_id (
        *,
        profiles(*),
        likes(user_id),
        bookmarks(user_id),
        comments(id),
        communities(name, slug),
        parent_post:parent_post_id(*, profiles(*), likes(user_id), comments(id))
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getBookmarkedPosts error:', error)
    return []
  }

  return (bookmarks ?? [])
    .map(b => (b as any).posts)
    .filter(Boolean)
    .map(p => {
      const rawParent = (p as any).parent_post
      const parent_post = Array.isArray(rawParent)
        ? (rawParent.length > 0 ? rawParent[0] : null)
        : rawParent ?? null
      return {
        ...p,
        parent_post,
        community_members: [{ role: 'member' }],
      }
    })
}

export async function editPost(postId: string, content: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }

  const { error } = await supabase
    .from('posts')
    .update({ content })
    .eq('id', postId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/feed')
  revalidatePath('/profile')
  revalidatePath(`/post/${postId}`)
  return { success: true }
}

export async function getFollowingFeedPosts(userId: string, sortBy: 'new' | 'popular' = 'new') {
  const supabase = await createClient()

  // 1. Get following user IDs
  const { data: followsData } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId)
  const followingIds = (followsData ?? []).map(f => f.following_id)

  // Always include own posts in following feed
  const targetUserIds = [...followingIds, userId]

  // For popular sort fetch more to rank correctly; for new use DB-level pagination
  const fetchLimit = sortBy === 'popular' ? 100 : PAGE_SIZE

  // 2. Fetch posts
  const { data: personalResult, error } = await supabase
    .from('posts')
    .select('*, profiles(*), likes(user_id), comments(id), bookmarks(user_id), parent_post:parent_post_id(*, profiles(*), likes(user_id), comments(id))')
    .in('user_id', targetUserIds)
    .is('community_id', null)
    .order('created_at', { ascending: false })
    .limit(fetchLimit)

  if (error) {
    console.error('getFollowingFeedPosts error:', error)
    return []
  }

  const personalPosts = (personalResult ?? []).map((p: any) => ({ ...p, communities: null }))
  let allPosts = personalPosts
    .filter(p => p.content !== null || p.parent_post_id !== null)

  // Sort by new or popular
  if (sortBy === 'popular') {
    allPosts = allPosts.sort((a, b) => (b.likes?.length ?? 0) - (a.likes?.length ?? 0))
  } else {
    allPosts = allPosts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  const sliceEnd = sortBy === 'popular' ? 50 : PAGE_SIZE
  return allPosts.slice(0, sliceEnd).map(p => {
    const rawParent = (p as any).parent_post
    const parent_post = Array.isArray(rawParent)
      ? (rawParent.length > 0 ? rawParent[0] : null)
      : rawParent ?? null
    return {
      ...p,
      parent_post,
      community_members: [{ role: 'member' }],
    }
  })
}

export async function getSinglePost(postId: string) {
  const supabase = await createClient()

  const { data: post, error } = await supabase
    .from('posts')
    .select(`
      *,
      profiles(*),
      likes(user_id),
      comments(id),
      bookmarks(user_id),
      communities(name, slug),
      parent_post:parent_post_id(*, profiles(*), likes(user_id), comments(id))
    `)
    .eq('id', postId)
    .single()

  if (error || !post) {
    console.error('getSinglePost error:', error)
    return null
  }

  const rawParent = (post as any).parent_post
  const parent_post = Array.isArray(rawParent)
    ? (rawParent.length > 0 ? rawParent[0] : null)
    : rawParent ?? null

  return {
    ...post,
    parent_post,
    community_members: [{ role: 'member' }],
  }
}


// ─── Unified Server Action for Infinite Scroll ─────────────────────────────

const FEED_SELECT = '*, profiles(*), likes(user_id), comments(id), bookmarks(user_id), communities(name, slug), parent_post:parent_post_id(*, profiles(*), likes(user_id), comments(id))'

function normalizePosts(raw: any[]) {
  return raw
    .filter((p: any) => p.content !== null || p.parent_post_id !== null)
    .map((p: any) => {
      const rawParent = p.parent_post
      const parent_post = Array.isArray(rawParent)
        ? (rawParent.length > 0 ? rawParent[0] : null)
        : rawParent ?? null
      return { ...p, parent_post, community_members: [{ role: 'member' }] }
    })
}

export async function loadMorePosts(
  context: FeedContext,
  offset: number
): Promise<{ posts: any[]; hasMore: boolean }> {
  const supabase = await createClient()

  try {
    if (context.type === 'feed') {
      const { data, error } = await supabase
        .from('posts')
        .select(FEED_SELECT)
        .is('community_id', null)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)
      if (error) throw error
      const posts = normalizePosts(data ?? []).filter(
        (p: any) => !enrichProfile(p.profiles)?.is_private
      ).map((p: any) => ({ ...p, communities: null }))
      return { posts, hasMore: (data ?? []).length === PAGE_SIZE }
    }

    if (context.type === 'following') {
      const { data: followsData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', context.userId)
      const targetIds = [
        ...(followsData ?? []).map((f: any) => f.following_id),
        context.userId,
      ]
      const { data, error } = await supabase
        .from('posts')
        .select(FEED_SELECT)
        .in('user_id', targetIds)
        .is('community_id', null)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)
      if (error) throw error
      const posts = normalizePosts(data ?? []).map((p: any) => ({ ...p, communities: null }))
      return { posts, hasMore: (data ?? []).length === PAGE_SIZE }
    }

    if (context.type === 'community') {
      const { data: membersData } = await supabase
        .from('community_members')
        .select('user_id, role')
        .eq('community_id', context.communityId)
      const roleMap = new Map((membersData ?? []).map((m: any) => [m.user_id, m.role]))

      const { data, error } = await supabase
        .from('posts')
        .select(FEED_SELECT)
        .eq('community_id', context.communityId)
        .is('parent_post_id', null)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)
      if (error) throw error
      const posts = normalizePosts(data ?? []).map((p: any) => ({
        ...p,
        community_members: [{ role: roleMap.get(p.user_id) ?? 'member' }],
      }))
      return { posts, hasMore: (data ?? []).length === PAGE_SIZE }
    }

    if (context.type === 'profile') {
      const { data, error } = await supabase
        .from('posts')
        .select(FEED_SELECT)
        .eq('user_id', context.profileUserId)
        .is('community_id', null)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)
      if (error) throw error
      const posts = normalizePosts(data ?? [])
      return { posts, hasMore: (data ?? []).length === PAGE_SIZE }
    }
  } catch (err) {
    console.error('[loadMorePosts] error:', err)
  }

  return { posts: [], hasMore: false }
}
