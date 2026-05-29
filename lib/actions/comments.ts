'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getComments(postId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('comments')
    .select(`*, profiles(*), comment_likes(user_id)`)
    .eq('post_id', postId)
    .order('created_at', { ascending: true })

  if (error) return []
  return data
}

export async function createComment(postId: string, content: string, parentCommentId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }

  // Slow Mode Check
  const { data: slowModeSetting } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'slow_mode_active')
    .maybeSingle()

  if (slowModeSetting && (slowModeSetting.value === true || slowModeSetting.value === 'true')) {
    const fifteenSecondsAgo = new Date(Date.now() - 15000).toISOString()
    const { data: recentComments } = await supabase
      .from('comments')
      .select('created_at')
      .eq('user_id', user.id)
      .gte('created_at', fifteenSecondsAgo)
      .limit(1)

    if (recentComments && recentComments.length > 0) {
      return { error: 'Yavaş mod aktiftir. Lütfen sonraki yorumunuz için 15 saniye bekleyin.' }
    }
  }

  // NSFW check
  const { containsNsfw } = await import('@/lib/nsfw-filter')
  if (containsNsfw(content)) {
    return { error: 'Yorumunuz NSFW/uygunsuz içerik tespiti nedeniyle engellenmiştir.' }
  }

  const { data: comment, error } = await supabase
    .from('comments')
    .insert({
      post_id: postId,
      user_id: user.id,
      content,
      parent_comment_id: parentCommentId || null
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // Reward user with +5 XP
  const { rewardXP } = await import('@/lib/xp')
  await rewardXP(user.id, 5)

  // Trigger notification
  const { createNotification } = await import('@/lib/actions/notifications')
  if (parentCommentId) {
    // If reply, get parent comment user_id
    const { data: parentComm } = await supabase
      .from('comments')
      .select('user_id')
      .eq('id', parentCommentId)
      .single()
    if (parentComm && parentComm.user_id !== user.id) {
      await createNotification(parentComm.user_id, user.id, 'reply', postId, comment.id)
    }
  } else {
    // Normal post comment
    const { data: post } = await supabase.from('posts').select('user_id').eq('id', postId).single()
    if (post && post.user_id !== user.id) {
      await createNotification(post.user_id, user.id, 'comment', postId, comment.id)
    }
  }

  revalidatePath(`/post/${postId}`)
  return { success: true }
}

export async function deleteComment(commentId: string, postId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }

  // Check global admin/founder status
  const { data: currentUserProfile } = await supabase
    .from('profiles')
    .select('id, username, is_gold')
    .eq('id', user.id)
    .single()

  const { isFounder: checkIsFounder } = await import('@/lib/founder')
  const isGlobalAdmin = currentUserProfile && (currentUserProfile.is_gold || checkIsFounder(currentUserProfile))

  if (isGlobalAdmin) {
    const { createServiceClient } = await import('@/lib/supabase/server')
    const supabaseAdmin = await createServiceClient()
    const { error } = await supabaseAdmin
      .from('comments')
      .delete()
      .eq('id', commentId)

    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', user.id)

    if (error) return { error: error.message }
  }

  revalidatePath(`/post/${postId}`)
  return { success: true }
}

export async function toggleCommentLike(commentId: string, postId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }

  // Check if already liked
  const { data: existing } = await supabase
    .from('comment_likes')
    .select('id')
    .eq('comment_id', commentId)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    await supabase.from('comment_likes').delete().eq('id', existing.id)
    
    // Delete comment like notification
    try {
      const { createServiceClient } = await import('@/lib/supabase/server')
      const supabaseAdmin = await createServiceClient()
      await supabaseAdmin
        .from('notifications')
        .delete()
        .eq('actor_id', user.id)
        .eq('type', 'comment_like')
        .eq('comment_id', commentId)
    } catch (err) {
      console.error('Error deleting comment like notification:', err)
    }

    revalidatePath(`/post/${postId}`)
    return { liked: false }
  } else {
    await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: user.id })

    // Trigger notification
    const { data: comment } = await supabase.from('comments').select('user_id').eq('id', commentId).single()
    if (comment && comment.user_id !== user.id) {
      const { createNotification } = await import('@/lib/actions/notifications')
      await createNotification(comment.user_id, user.id, 'comment_like', postId, commentId)
    }

    revalidatePath(`/post/${postId}`)
    return { liked: true }
  }
}
