'use server'

import { createClient } from '@/lib/supabase/server'

export async function getHQMessages() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['founder', 'admin', 'moderator'].includes(profile.role)) {
    return []
  }

  const { data: messagesData, error } = await supabase
    .from('hq_messages')
    .select('*')
    .order('created_at', { ascending: true })

  if (error || !messagesData) {
    console.error('getHQMessages error:', error)
    return []
  }

  // Fetch profiles of senders
  const userIds = Array.from(new Set(messagesData.map((m: any) => m.user_id)))
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, first_name, last_name, avatar_url, role')
    .in('id', userIds)

  const profileMap = new Map(profiles?.map((p: any) => [p.id, p]) ?? [])

  return messagesData.map((m: any) => ({
    ...m,
    user: profileMap.get(m.user_id) || null
  }))
}

export async function sendHQMessage(content: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }

  if (!content || !content.trim()) {
    return { error: 'Mesaj boş olamaz.' }
  }

  // Check role and fetch profile info to attach to the returned message
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, first_name, last_name, avatar_url, role')
    .eq('id', user.id)
    .single()

  if (!profile || !['founder', 'admin', 'moderator'].includes(profile.role)) {
    return { error: 'Bu işlem için yetkiniz yok.' }
  }

  const { data: insertedData, error } = await supabase
    .from('hq_messages')
    .insert({
      user_id: user.id,
      content: content.trim()
    })
    .select('*')
    .single()

  if (error) {
    console.error('sendHQMessage error:', error)
    return { error: error.message }
  }

  return { 
    success: true, 
    message: {
      ...insertedData,
      user: profile
    }
  }
}

export async function getTeamMembers() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, first_name, last_name, avatar_url, role, last_seen_at, show_status, is_verified, is_gold, xp, bio, warns, country, city')
    .in('role', ['founder', 'admin', 'moderator'])
    .order('updated_at', { ascending: false })

  if (error || !data) {
    console.error('getTeamMembers error:', error)
    return []
  }
  return data
}
