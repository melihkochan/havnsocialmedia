'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { logHQModAction } from '@/lib/actions/hq-chat'

const HAVN_SYSTEM_USER_ID = '33843a93-27a7-46af-af8a-27cd92404022'

export async function getAnnouncements() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      profiles(*)
    `)
    .or(`user_id.eq.${HAVN_SYSTEM_USER_ID},content.ilike.%#duyuru%`)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getAnnouncements error:', error)
    return []
  }
  return data ?? []
}

export async function createAnnouncement(content: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz.' }

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role, username, first_name, last_name')
    .eq('id', user.id)
    .single()

  if (!callerProfile || !['founder', 'admin'].includes(callerProfile.role)) {
    return { error: 'Bu işlem için yetkiniz yok.' }
  }

  // Use service client to post as system user
  const serviceClient = await createServiceClient()
  
  const { data, error } = await serviceClient
    .from('posts')
    .insert({
      user_id: HAVN_SYSTEM_USER_ID,
      content: content,
    })
    .select()
    .single()

  if (error) {
    console.error('createAnnouncement error:', error)
    return { error: error.message }
  }

  const contentSnippet = content.length > 50 ? `${content.slice(0, 50)}...` : content
  await logHQModAction('announcement_create', 'Havn Sistem', `Yeni resmi duyuru oluşturuldu: "${contentSnippet}"`)

  return { success: true, post: data }
}

export async function deleteAnnouncement(postId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz.' }

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!callerProfile || !['founder', 'admin'].includes(callerProfile.role)) {
    return { error: 'Bu işlem için yetkiniz yok.' }
  }

  const serviceClient = await createServiceClient()

  // Fetch target content first for audit logging
  const { data: post } = await serviceClient
    .from('posts')
    .select('content')
    .eq('id', postId)
    .single()

  const { error } = await serviceClient
    .from('posts')
    .delete()
    .eq('id', postId)

  if (error) {
    console.error('deleteAnnouncement error:', error)
    return { error: error.message }
  }

  const contentSnippet = post?.content 
    ? (post.content.length > 50 ? `"${post.content.slice(0, 50)}..."` : `"${post.content}"`)
    : 'Bilinmeyen Gönderi'
  await logHQModAction('announcement_delete', 'Havn Sistem', `Resmi duyuru silindi: ${contentSnippet}`)

  return { success: true }
}
