'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { enrichProfile } from '@/lib/profile-enrich'
import type { EnrichedProfile } from '@/lib/profile-enrich'
import { saveProfileMetadata } from '@/lib/actions/profile-db'


export async function getProfile(username: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()

  if (error || !data) return null
  return enrichProfile(data)
}

export async function getUserPosts(userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('posts')
    .select(`*, profiles(*), likes(user_id), comments(id), communities(name, slug), parent_post:parent_post_id(*, profiles(*), likes(user_id), comments(id))`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) return []

  return (data ?? [])
    .filter(p => p.content !== null || p.parent_post_id !== null)
    .map(p => {
      const rawParent = (p as any).parent_post
      const parent_post = Array.isArray(rawParent)
        ? (rawParent.length > 0 ? rawParent[0] : null)
        : rawParent ?? null
      return { ...p, parent_post }
    })
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }

  const username = formData.get('username') as string
  const firstName = (formData.get('first_name') as string | null)?.trim() || null
  const lastName = (formData.get('last_name') as string | null)?.trim() || null
  const bio = formData.get('bio') as string | null
  const avatarFile = formData.get('avatar') as File | null
  const bannerFile = formData.get('banner') as File | null

  // New settings fields for metadata
  const isPrivate = formData.get('is_private') === 'true'
  const showStatus = formData.get('show_status') === 'true'
  const twitter = (formData.get('twitter') as string | null)?.trim() || null
  const instagram = (formData.get('instagram') as string | null)?.trim() || null
  const github = (formData.get('github') as string | null)?.trim() || null

  // Let's read the current profile metadata first to preserve existing fields (like follow_requests or default_feed_type)
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!currentProfile) return { error: 'Profil bulunamadı.' }

  const enriched = enrichProfile(currentProfile)
  if (!enriched) return { error: 'Profil çözümlenemedi.' }

  let cleanBioText = bio !== null ? bio.split('\u200B')[0].trim() : (enriched.bio || '')

  // Check username uniqueness (exclude current user)
  if (username) {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .neq('id', user.id)
      .single()

    if (existing) {
      return { error: 'Bu kullanıcı adı zaten kullanılıyor.' }
    }
  }

  let avatarUrl: string | undefined
  let bannerUrl: string | undefined

  // Upload avatar if provided
  if (avatarFile && avatarFile.size > 0) {
    const ext = avatarFile.name.split('.').pop()
    const path = `${user.id}/avatar.${ext}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type })

    if (uploadError) return { error: 'Avatar yüklenemedi: ' + uploadError.message }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(uploadData.path)
    avatarUrl = publicUrl
  }

  // Upload banner if provided
  if (bannerFile && bannerFile.size > 0) {
    const ext = bannerFile.name.split('.').pop() || 'png'
    const path = `${user.id}/banner.${ext}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, bannerFile, { upsert: true, contentType: bannerFile.type })

    if (uploadError) return { error: 'Kapak resmi yüklenemedi: ' + uploadError.message }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(uploadData.path)
    bannerUrl = publicUrl
  }

  // Build updates — only include fields that exist
  const updates: Record<string, string | null> = { updated_at: new Date().toISOString() }
  if (username) updates.username = username
  if (avatarUrl) updates.avatar_url = avatarUrl
  if (bannerUrl) updates.banner_url = bannerUrl
  updates.first_name = firstName
  updates.last_name = lastName

  let { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  const optionalColumns = ['banner_url', 'first_name', 'last_name'] as const
  for (const column of optionalColumns) {
    if (error && error.message.includes(column)) {
      delete updates[column]
      const result = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
      error = result.error
    }
  }

  if (error) return { error: error.message }

  // Save metadata
  const metaUpdates: any = {
    is_private: isPrivate,
    show_status: showStatus,
    social_links: {
      twitter,
      instagram,
      github,
    }
  }
  if (!showStatus) {
    metaUpdates.last_seen_at = null
  }

  const metaRes = await saveProfileMetadata(user.id, metaUpdates, cleanBioText)
  if (metaRes.error) return { error: metaRes.error }

  revalidatePath('/profile')
  revalidatePath('/settings')
  if (username) revalidatePath(`/profile/${username}`)
  return { success: true }
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return { error: 'Kullanıcı bulunamadı.' }

  // Verify current password by signing in
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  })

  if (verifyError) return { error: 'Mevcut şifre yanlış.' }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { error: error.message }

  return { success: true }
}

export async function updateDefaultFeedType(feedType: 'for_you' | 'following') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }

  const res = await saveProfileMetadata(user.id, { default_feed_type: feedType })
  if (res.error) return { error: 'Besleme tercihi kaydedilemedi: ' + res.error }

  revalidatePath('/feed')
  return { success: true }
}

export async function updateLastSeen() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) return

  const enriched = enrichProfile(profile)
  if (!enriched) return

  // If status sharing is disabled, we don't update last_seen_at
  if (enriched.show_status === false) {
    if (enriched.last_seen_at) {
      await saveProfileMetadata(user.id, { last_seen_at: null })
    }
    return
  }

  await saveProfileMetadata(user.id, { last_seen_at: new Date().toISOString() })
}
