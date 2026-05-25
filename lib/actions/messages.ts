'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getUnreadMessagesCount() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  const { count, error } = await supabase
    .from('direct_messages')
    .select('*', { count: 'exact', head: true })
    .eq('receiver_id', user.id)
    .eq('is_read', false)

  if (error) {
    console.error('getUnreadMessagesCount error:', error)
    return 0
  }

  return count ?? 0
}

function getIstanbulDateString(dateObj: Date): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(dateObj); // "YYYY-MM-DD"
}

function calculateStreak(messages: any[]): number {
  if (!messages || messages.length === 0) return 0;
  
  // Group messages by their Istanbul date and collect unique senders
  const sendersByDate = new Map<string, Set<string>>();
  for (const msg of messages) {
    const d = new Date(msg.created_at);
    const dateStr = getIstanbulDateString(d);
    if (!sendersByDate.has(dateStr)) {
      sendersByDate.set(dateStr, new Set<string>());
    }
    sendersByDate.get(dateStr)!.add(msg.sender_id);
  }
  
  // Find dates where at least 2 distinct users sent messages
  const mutualDates = new Set<string>();
  for (const [dateStr, senders] of sendersByDate.entries()) {
    if (senders.size >= 2) {
      mutualDates.add(dateStr);
    }
  }
  
  if (mutualDates.size === 0) return 0;
  
  // Sort mutual dates descending
  const sortedMutualDates = Array.from(mutualDates).sort((a, b) => b.localeCompare(a));
  
  const todayStr = getIstanbulDateString(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getIstanbulDateString(yesterday);
  
  // If the latest mutual date is neither today nor yesterday, streak is broken
  const latestMutualDate = sortedMutualDates[0];
  if (latestMutualDate !== todayStr && latestMutualDate !== yesterdayStr) {
    return 0;
  }
  
  // Count consecutive days going backwards starting from the latest mutual day
  let streak = 0;
  let currentDate = latestMutualDate === todayStr ? new Date() : yesterday;
  
  while (true) {
    const currentStr = getIstanbulDateString(currentDate);
    if (mutualDates.has(currentStr)) {
      streak++;
      // Go to the previous day
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }
  
  return streak;
}

export async function getConversations() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Fetch all direct messages involving the user
  const { data, error } = await supabase
    .from('direct_messages')
    .select(`
      *,
      sender:profiles!sender_id(*),
      receiver:profiles!receiver_id(*)
    `)
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getConversations error:', error)
    return []
  }

  // Group by the other user
  const conversationsMap = new Map<string, any>()
  const { enrichProfile } = await import('@/lib/profile-enrich')

  for (const msg of data ?? []) {
    const otherUserRaw = msg.sender_id === user.id ? msg.receiver : msg.sender
    if (!otherUserRaw) continue
    const otherUser = enrichProfile(otherUserRaw)
    if (!otherUser) continue

    if (!conversationsMap.has(otherUser.id)) {
      conversationsMap.set(otherUser.id, {
        otherUser,
        lastMessage: msg,
        unreadCount: (msg.receiver_id === user.id && !msg.is_read) ? 1 : 0,
        messages: [msg]
      })
    } else {
      const conv = conversationsMap.get(otherUser.id)
      conv.messages.push(msg)
      if (msg.receiver_id === user.id && !msg.is_read) {
        conv.unreadCount += 1
      }
    }
  }

  // Fetch current user's profile to read hidden_conversations metadata
  const { data: currentUserRow } = await supabase
    .from('profiles')
    .select('bio')
    .eq('id', user.id)
    .single()

  const currentUser = enrichProfile(currentUserRow)
  const hiddenConvs = currentUser?.hidden_conversations || {}

  const conversationsList = Array.from(conversationsMap.values())
    .map(conv => {
      const streak = calculateStreak(conv.messages)
      return {
        otherUser: conv.otherUser,
        lastMessage: conv.lastMessage,
        unreadCount: conv.unreadCount,
        streak
      }
    })
    .filter(c => {
      const hideTimeStr = hiddenConvs[c.otherUser.id]
      if (hideTimeStr) {
        const hideTime = new Date(hideTimeStr).getTime()
        const lastMsgTime = new Date(c.lastMessage.created_at).getTime()
        if (lastMsgTime <= hideTime) {
          return false // hide this conversation!
        }
      }
      return true
    })

  return conversationsList
}

export async function getMessagesWithUser(otherUserId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('direct_messages')
    .select(`
      *,
      sender:profiles!sender_id(*),
      receiver:profiles!receiver_id(*)
    `)
    .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('getMessagesWithUser error:', error)
    return []
  }

  return data ?? []
}

export async function sendDirectMessage(receiverId: string, content: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }

  if (!content || !content.trim()) {
    return { error: 'Mesaj boş olamaz.' }
  }

  const { data, error } = await supabase
    .from('direct_messages')
    .insert({
      sender_id: user.id,
      receiver_id: receiverId,
      content: content.trim(),
      is_read: false
    })
    .select(`
      *,
      sender:profiles!sender_id(*),
      receiver:profiles!receiver_id(*)
    `)
    .single()

  if (error) {
    console.error('sendDirectMessage error:', error)
    return { error: error.message }
  }

  return { success: true, message: data }
}

export async function markMessagesAsRead(senderId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }

  const supabaseAdmin = await createServiceClient()
  const { error } = await supabaseAdmin
    .from('direct_messages')
    .update({ is_read: true })
    .eq('receiver_id', user.id)
    .eq('sender_id', senderId)
    .eq('is_read', false)

  if (error) {
    console.error('markMessagesAsRead error:', error)
    return { error: error.message }
  }

  return { success: true }
}

export async function deleteDirectMessage(messageId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }

  const supabaseAdmin = await createServiceClient()
  const { data: msg } = await supabaseAdmin
    .from('direct_messages')
    .select('sender_id')
    .eq('id', messageId)
    .single()

  if (!msg) return { error: 'Mesaj bulunamadı.' }
  if (msg.sender_id !== user.id) {
    return { error: 'Bu mesajı silme yetkiniz yok.' }
  }

  const { error } = await supabaseAdmin
    .from('direct_messages')
    .update({ content: '\u200B[silindi]' })
    .eq('id', messageId)

  if (error) {
    console.error('deleteDirectMessage error:', error)
    return { error: error.message }
  }

  return { success: true }
}

export async function editDirectMessage(messageId: string, newContent: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }

  if (!newContent || !newContent.trim()) {
    return { error: 'Mesaj boş olamaz.' }
  }

  const supabaseAdmin = await createServiceClient()
  const { data: msg } = await supabaseAdmin
    .from('direct_messages')
    .select('sender_id')
    .eq('id', messageId)
    .single()

  if (!msg) return { error: 'Mesaj bulunamadı.' }
  if (msg.sender_id !== user.id) {
    return { error: 'Bu mesajı düzenleme yetkiniz yok.' }
  }

  const updatedContent = `${newContent.trim()}\u200B[guncellendi]`

  const { error } = await supabaseAdmin
    .from('direct_messages')
    .update({ content: updatedContent })
    .eq('id', messageId)

  if (error) {
    console.error('editDirectMessage error:', error)
    return { error: error.message }
  }

  return { success: true }
}

export async function reopenConversation(otherUserId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }

  const supabaseAdmin = await createServiceClient()

  // Fetch current user's profile to read hidden_conversations metadata
  const { data: profileRow, error: fetchErr } = await supabaseAdmin
    .from('profiles')
    .select('bio, hidden_conversations')
    .eq('id', user.id)
    .single()

  if (fetchErr || !profileRow) return { error: 'Profil bulunamadı.' }

  let hidden_conversations: Record<string, string> = {}
  if (profileRow.hidden_conversations) {
    hidden_conversations = { ...profileRow.hidden_conversations }
  } else if (profileRow.bio) {
    const parts = profileRow.bio.split('\u200B')
    if (parts.length > 1) {
      try {
        hidden_conversations = JSON.parse(parts[1]).hidden_conversations || {}
      } catch (e) {}
    }
  }

  if (hidden_conversations[otherUserId]) {
    delete hidden_conversations[otherUserId]
    
    const { saveProfileMetadata } = await import('@/lib/actions/profile-db')
    const res = await saveProfileMetadata(user.id, { hidden_conversations })
    if (res.error) return { error: res.error }
  }

  revalidatePath('/messages')
  return { success: true }
}

export async function clearConversation(otherUserId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }

  const supabaseAdmin = await createServiceClient()
  const { error } = await supabaseAdmin
    .from('direct_messages')
    .delete()
    .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)

  if (error) {
    console.error('clearConversation error:', error)
    return { error: error.message }
  }

  return { success: true }
}

export async function closeConversation(otherUserId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }

  const supabaseAdmin = await createServiceClient()

  // Fetch current user's profile to read hidden_conversations metadata
  const { data: profileRow, error: fetchErr } = await supabaseAdmin
    .from('profiles')
    .select('bio, hidden_conversations')
    .eq('id', user.id)
    .single()

  if (fetchErr || !profileRow) return { error: 'Profil bulunamadı.' }

  let hidden_conversations: Record<string, string> = {}
  if (profileRow.hidden_conversations) {
    hidden_conversations = { ...profileRow.hidden_conversations }
  } else if (profileRow.bio) {
    const parts = profileRow.bio.split('\u200B')
    if (parts.length > 1) {
      try {
        hidden_conversations = JSON.parse(parts[1]).hidden_conversations || {}
      } catch (e) {}
    }
  }

  hidden_conversations[otherUserId] = new Date().toISOString()

  const { saveProfileMetadata } = await import('@/lib/actions/profile-db')
  const res = await saveProfileMetadata(user.id, { hidden_conversations })
  if (res.error) return { error: res.error }

  revalidatePath('/messages')
  return { success: true }
}
