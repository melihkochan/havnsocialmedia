'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getCommunityMessages(communityId: string, type: 'general' | 'announcement') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Check membership
  const { data: membership, error: memError } = await supabase
    .from('community_members')
    .select('status')
    .eq('community_id', communityId)
    .eq('user_id', user.id)
    .single()

  if (memError || membership?.status !== 'approved') {
    return []
  }

  // Fetch messages
  const { data, error } = await supabase
    .from('community_messages')
    .select(`
      *,
      user:profiles!user_id(*)
    `)
    .eq('community_id', communityId)
    .eq('type', type)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('getCommunityMessages error:', error)
    return []
  }

  return data ?? []
}

export async function sendCommunityMessage(communityId: string, content: string, type: 'general' | 'announcement') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }

  if (!content || !content.trim()) {
    return { error: 'Mesaj boş olamaz.' }
  }

  // Check membership and role
  const { data: membership, error: memError } = await supabase
    .from('community_members')
    .select('status, role')
    .eq('community_id', communityId)
    .eq('user_id', user.id)
    .single()

  if (memError || membership?.status !== 'approved') {
    return { error: 'Bu topluluğa üye değilsiniz.' }
  }

  if (type === 'announcement' && membership.role !== 'owner' && membership.role !== 'moderator') {
    return { error: 'Duyuru paylaşma yetkiniz bulunmamaktadır.' }
  }

  const { data, error } = await supabase
    .from('community_messages')
    .insert({
      community_id: communityId,
      user_id: user.id,
      content: content.trim(),
      type
    })
    .select(`
      *,
      user:profiles!user_id(*)
    `)
    .single()

  if (error) {
    console.error('sendCommunityMessage error:', error)
    return { error: error.message }
  }

  return { success: true, message: data }
}

export async function editCommunityMessage(messageId: string, content: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }

  if (!content || !content.trim()) return { error: 'Mesaj boş olamaz.' }

  const { data: message, error: getError } = await supabase
    .from('community_messages')
    .select('user_id')
    .eq('id', messageId)
    .single()

  if (getError || !message) return { error: 'Mesaj bulunamadı.' }

  if (message.user_id !== user.id) {
    return { error: 'Bu mesajı düzenleme yetkiniz yok.' }
  }

  const { error } = await supabase
    .from('community_messages')
    .update({ content: content.trim() })
    .eq('id', messageId)

  if (error) return { error: error.message }
  return { success: true }
}

export async function deleteCommunityMessage(messageId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }

  const { data: message, error: getError } = await supabase
    .from('community_messages')
    .select('user_id, community_id')
    .eq('id', messageId)
    .single()

  if (getError || !message) return { error: 'Mesaj bulunamadı.' }

  const isOwn = message.user_id === user.id

  let isAdmin = false
  if (!isOwn) {
    const { data: membership } = await supabase
      .from('community_members')
      .select('role, status')
      .eq('community_id', message.community_id)
      .eq('user_id', user.id)
      .single()
    
    isAdmin = membership?.status === 'approved' && (membership.role === 'owner' || membership.role === 'moderator')
  }

  if (!isOwn && !isAdmin) {
    return { error: 'Bu mesajı silme yetkiniz yok.' }
  }

  const { error } = await supabase
    .from('community_messages')
    .delete()
    .eq('id', messageId)

  if (error) return { error: error.message }
  return { success: true }
}
