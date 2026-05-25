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
