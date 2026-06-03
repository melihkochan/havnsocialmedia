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
    return []
  }

  const now = new Date()
  return (data ?? []).map((post: any) => {
    if (!post.content) return post
    const parts = post.content.split('\u200B')
    const cleanText = parts[0]
    let meta: any = { expires_at: null }
    if (parts.length > 1) {
      try {
        meta = JSON.parse(parts[1])
      } catch (e) {}
    }
    const isExpired = meta.expires_at ? new Date(meta.expires_at) < now : false
    return {
      ...post,
      content: cleanText,
      expires_at: meta.expires_at,
      is_expired: isExpired
    }
  })
}

export async function createAnnouncement(content: string, duration: string = 'forever') {
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
  const now = new Date()

  let expiresAt: string | null = null
  if (duration === '1h') {
    expiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString()
  } else if (duration === '12h') {
    expiresAt = new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString()
  } else if (duration === '1d') {
    expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
  } else if (duration === '1w') {
    expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
  } else if (duration === '1m') {
    expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
  }

  // Deactivate all previous announcements by setting their expires_at to now
  const { data: existingActive } = await serviceClient
    .from('posts')
    .select('id, content')
    .eq('user_id', HAVN_SYSTEM_USER_ID)

  if (existingActive) {
    for (const post of existingActive) {
      if (!post.content) continue
      const parts = post.content.split('\u200B')
      const cleanText = parts[0]
      let meta: any = {}
      if (parts.length > 1) {
        try {
          meta = JSON.parse(parts[1])
        } catch (e) {}
      }
      
      if (!meta.expires_at || new Date(meta.expires_at) > now) {
        meta.expires_at = now.toISOString()
        const serialized = JSON.stringify(meta)
        await serviceClient
          .from('posts')
          .update({ content: `${cleanText}\u200B${serialized}` })
          .eq('id', post.id)
      }
    }
  }

  const metaObj = { expires_at: expiresAt }
  const serializedMeta = JSON.stringify(metaObj)
  const finalContent = `${content}\u200B${serializedMeta}`
  
  const { data, error } = await serviceClient
    .from('posts')
    .insert({
      user_id: HAVN_SYSTEM_USER_ID,
      content: finalContent,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  const contentSnippet = content.length > 50 ? `${content.slice(0, 50)}...` : content
  await logHQModAction('announcement_create', 'Havn Sistem', `Yeni resmi duyuru oluşturuldu: "${contentSnippet}"`)

  // Return the parsed announcement post
  const parsedPost = {
    ...data,
    content: content,
    expires_at: expiresAt,
    is_expired: false
  }

  return { success: true, post: parsedPost }
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
    return { error: error.message }
  }

  const contentSnippet = post?.content 
    ? (post.content.length > 50 ? `"${post.content.slice(0, 50)}..."` : `"${post.content}"`)
    : 'Bilinmeyen Gönderi'
  await logHQModAction('announcement_delete', 'Havn Sistem', `Resmi duyuru silindi: ${contentSnippet}`)

  return { success: true }
}
