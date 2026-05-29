'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getNotifications() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const supabaseAdmin = await createServiceClient()
  const { data, error } = await supabaseAdmin
    .from('notifications')
    .select(`
      *,
      actor:profiles!actor_id(*),
      posts(*),
      comments(*),
      communities(name, slug)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('getNotifications error:', error)
    return []
  }

  if (!data || data.length === 0) return []

  // Fetch support ticket statuses if there are support notifications
  const supportTicketIds = data
    .filter((n: any) => (n.type === 'support_ticket' || n.type === 'support_reply') && n.post_preview)
    .map((n: any) => n.post_preview)
    .filter((id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) as string[]

  if (supportTicketIds.length > 0) {
    try {
      const { data: tickets, error: ticketsError } = await supabaseAdmin
        .from('support_tickets')
        .select('id, status, subject')
        .in('id', supportTicketIds)

      if (!ticketsError && tickets) {
        const ticketsMap = new Map(tickets.map((t: any) => [t.id, t]))
        return data.map((n: any) => {
          if ((n.type === 'support_ticket' || n.type === 'support_reply') && n.post_preview) {
            const ticket = ticketsMap.get(n.post_preview)
            if (ticket) {
              return {
                ...n,
                support_ticket: ticket
              }
            }
          }
          return n
        })
      }
    } catch (err) {
      console.warn('Could not fetch support ticket statuses for notifications:', err)
    }
  }

  return data
}

export async function getUnreadNotificationCount() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  const supabaseAdmin = await createServiceClient()
  const { count, error } = await supabaseAdmin
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  if (error) {
    console.error('getUnreadNotificationCount error:', error)
    return 0
  }

  return count ?? 0
}

export async function markNotificationsAsRead() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }

  const supabaseAdmin = await createServiceClient()
  const { error } = await supabaseAdmin
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  if (error) {
    console.error('markNotificationsAsRead error:', error)
    return { error: error.message }
  }

  revalidatePath('/notifications')
  return { success: true }
}

export type NotificationExtras = {
  message?: string | null
  communityId?: string | null
  postPreview?: string | null
}

export async function createNotification(
  userId: string,
  actorId: string,
  type: 'like' | 'comment' | 'join_request' | 'approved' | 'repost' | 'comment_like' | 'reply' | 'post_removed' | 'post_pinned' | 'follow' | 'support_reply' | 'support_ticket' | 'warning' | 'xp_reward' | 'system_alert',
  postId: string | null = null,
  commentId: string | null = null,
  extras?: NotificationExtras
) {
  // Don't notify users of their own actions
  if (userId === actorId) return

  const supabaseAdmin = await createServiceClient()

  const row: Record<string, unknown> = {
    user_id: userId,
    actor_id: actorId,
    type,
    post_id: postId,
    comment_id: commentId,
    is_read: false,
  }

  if (extras?.message) row.message = extras.message
  if (extras?.communityId) row.community_id = extras.communityId
  if (extras?.postPreview) row.post_preview = extras.postPreview
  let { error } = await supabaseAdmin.from('notifications').insert(row)

  if (error) {
    console.error('createNotification original insert error:', error)
  }

  // Yeni sütunlar yoksa temel alanlarla tekrar dene
  if (error && (error.message.includes('message') || error.message.includes('community_id') || error.message.includes('post_preview'))) {
    console.log('createNotification retrying with basic fields...')
    const { error: retryError } = await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      actor_id: actorId,
      type,
      post_id: postId,
      comment_id: commentId,
      is_read: false,
    })
    error = retryError
  }

  if (error) {
    console.error('createNotification final error:', error)
  }
}

export async function clearAllNotifications() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }

  const supabaseAdmin = await createServiceClient()
  const { error } = await supabaseAdmin
    .from('notifications')
    .delete()
    .eq('user_id', user.id)

  if (error) {
    console.error('clearAllNotifications error:', error)
    return { error: error.message }
  }

  revalidatePath('/notifications')
  return { success: true }
}

export async function deleteNotification(notificationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }

  const supabaseAdmin = await createServiceClient()
  const { error } = await supabaseAdmin
    .from('notifications')
    .delete()
    .eq('id', notificationId)
    .eq('user_id', user.id)

  if (error) {
    console.error('deleteNotification error:', error)
    return { error: error.message }
  }

  revalidatePath('/notifications')
  return { success: true }
}

export async function getSingleNotification(notificationId: string) {
  const supabaseAdmin = await createServiceClient()
  const { data, error } = await supabaseAdmin
    .from('notifications')
    .select(`
      *,
      actor:profiles!actor_id(*),
      posts(*),
      comments(*),
      communities(name, slug)
    `)
    .eq('id', notificationId)
    .single()

  if (error || !data) {
    console.error('getSingleNotification error:', error)
    return null
  }

  // Fetch support ticket details if needed
  if ((data.type === 'support_ticket' || data.type === 'support_reply') && data.post_preview) {
    try {
      const { data: ticket } = await supabaseAdmin
        .from('support_tickets')
        .select('id, status, subject')
        .eq('id', data.post_preview)
        .single()
      if (ticket) {
        return {
          ...data,
          support_ticket: ticket
        }
      }
    } catch (e) {}
  }

  return data
}
