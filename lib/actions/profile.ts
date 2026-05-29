'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { enrichProfile } from '@/lib/profile-enrich'
import { checkLockdown, checkMediaUploadLock } from '@/lib/actions/hq-auth'
import type { EnrichedProfile } from '@/lib/profile-enrich'
import { saveProfileMetadata, checkDbHasVerificationColumns } from '@/lib/actions/profile-db'
import { isFounder } from '@/lib/founder'
import { createNotification } from '@/lib/actions/notifications'
import { getSessionId } from '@/lib/utils'


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

  if (await checkLockdown()) {
    return { error: 'Platform şu anda acil durum nedeniyle geçici olarak salt okunur (read-only) modundadır.' }
  }

  const username = formData.get('username') as string
  const firstName = (formData.get('first_name') as string | null)?.trim() || null
  const lastName = (formData.get('last_name') as string | null)?.trim() || null
  const bio = formData.get('bio') as string | null
  const country = (formData.get('country') as string | null)?.trim() || null
  const city = (formData.get('city') as string | null)?.trim() || null

  // NSFW check
  const { containsNsfw } = await import('@/lib/nsfw-filter')
  if (
    containsNsfw(username || '') ||
    containsNsfw(firstName || '') ||
    containsNsfw(lastName || '') ||
    containsNsfw(bio || '')
  ) {
    return { error: 'Profil bilgileri uygunsuz içerik tespiti nedeniyle güncellenemedi.' }
  }

  const avatarFile = formData.get('avatar') as File | null
  const bannerFile = formData.get('banner') as File | null

  if (((avatarFile && avatarFile.size > 0) || (bannerFile && bannerFile.size > 0)) && await checkMediaUploadLock()) {
    return { error: 'Platform genelinde medya/görsel yüklemeleri acil durum nedeniyle geçici olarak kapatılmıştır.' }
  }

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
    const { isReservedUsername } = await import('@/lib/reserved-usernames')
    if (isReservedUsername(username)) {
      return { error: 'Bu kullanıcı adı sistem tarafından rezerve edilmiştir.' }
    }

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

  const deleteAvatar = formData.get('delete_avatar') === 'true'
  const deleteBanner = formData.get('delete_banner') === 'true'

  let avatarUrl: string | null | undefined = undefined
  let bannerUrl: string | null | undefined = undefined

  // Upload or delete avatar
  if (deleteAvatar) {
    avatarUrl = null
  } else if (avatarFile && avatarFile.size > 0) {
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

  // Upload or delete banner
  if (deleteBanner) {
    bannerUrl = null
  } else if (bannerFile && bannerFile.size > 0) {
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
  if (avatarUrl !== undefined) updates.avatar_url = avatarUrl
  if (bannerUrl !== undefined) updates.banner_url = bannerUrl
  updates.first_name = firstName
  updates.last_name = lastName
  updates.country = country
  updates.city = city

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
  revalidatePath('/', 'layout')
  return { success: true }
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }

  if (await checkLockdown()) {
    return { error: 'Platform şu anda acil durum nedeniyle geçici olarak salt okunur (read-only) modundadır.' }
  }

  // Verify current password by signing in
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email!,
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

  if (await checkLockdown()) {
    return { error: 'Platform şu anda acil durum nedeniyle geçici olarak salt okunur (read-only) modundadır.' }
  }

  const res = await saveProfileMetadata(user.id, { default_feed_type: feedType })
  if (res.error) return { error: 'Besleme tercihi kaydedilemedi: ' + res.error }

  revalidatePath('/feed')
  return { success: true }
}

export async function updateLastSeen() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session || !session.user) return

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  if (!profile) return

  const enriched = enrichProfile(profile)
  if (!enriched) return

  // Enforce single session check
  const currentSessionId = getSessionId(session.access_token)
  if (currentSessionId && enriched.last_session_id && enriched.last_session_id !== currentSessionId) {
    console.warn(`Heartbeat mismatch: Booting user ${enriched.username}.`)
    await supabase.auth.signOut()
    return { error: 'multi_session' }
  }

  // If status sharing is disabled, we don't update last_seen_at
  if (enriched.show_status === false) {
    if (enriched.last_seen_at) {
      await saveProfileMetadata(session.user.id, { last_seen_at: null })
    }
    return
  }

  await saveProfileMetadata(session.user.id, { last_seen_at: new Date().toISOString() })
}

export async function toggleProfileVerification(targetUserId: string, type: 'verified' | 'gold') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }

  // Check if current user is founder
  const { data: currentUserProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!currentUserProfile || !isFounder(currentUserProfile)) {
    return { error: 'Bu işlem için yetkiniz yok.' }
  }

  // Get current state of target profile
  const { data: targetProfile, error: fetchErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', targetUserId)
    .single()

  if (fetchErr || !targetProfile) {
    return { error: 'Hedef profil bulunamadı.' }
  }

  const enriched = enrichProfile(targetProfile)
  if (!enriched) return { error: 'Hedef profil çözümlenemedi.' }

  const hasVerificationColumns = await checkDbHasVerificationColumns()

  let newVerified = enriched.is_verified ?? false
  let newGold = enriched.is_gold ?? false

  if (type === 'verified') {
    newVerified = !newVerified
  } else if (type === 'gold') {
    newGold = !newGold
  }

  if (hasVerificationColumns) {
    // Write directly to columns using service client to bypass RLS
    const supabaseAdmin = await createServiceClient()
    const { error: updateErr } = await supabaseAdmin
      .from('profiles')
      .update({
        is_verified: newVerified,
        is_gold: newGold,
        updated_at: new Date().toISOString()
      })
      .eq('id', targetUserId)

    if (updateErr) return { error: updateErr.message }
  } else {
    // Save to metadata bio
    const res = await saveProfileMetadata(targetUserId, {
      is_verified: newVerified,
      is_gold: newGold
    })
    if (res.error) return { error: res.error }
  }

  // Trigger notification for the user
  let notifMessage = ''
  if (type === 'verified') {
    notifMessage = newVerified 
      ? 'Tebrikler! Hesabınız yönetici tarafından doğrulandı ve Mavi Tik aldınız.' 
      : 'Hesabınızın doğrulanmış üye statüsü (Mavi Tik) yönetici tarafından kaldırıldı.'
  } else if (type === 'gold') {
    notifMessage = newGold 
      ? 'Tebrikler! Hesabınıza yönetici tarafından Sistem Ortağı statüsü (Sarı Tik) tanımlandı.' 
      : 'Hesabınızın Sistem Ortağı statüsü (Sarı Tik) yönetici tarafından kaldırıldı.'
  }
  
  if (notifMessage) {
    await createNotification(targetUserId, user.id, 'support_reply', null, null, {
      message: notifMessage
    })
  }

  revalidatePath(`/profile/${targetProfile.username}`)
  revalidatePath('/', 'layout')
  return { success: true, is_verified: newVerified, is_gold: newGold }
}

export async function adminUpdateProfile(
  targetUserId: string,
  fields: {
    first_name?: string | null
    last_name?: string | null
    username?: string
    bio?: string | null
    resetAvatar?: boolean
    resetBanner?: boolean
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }

  // Check if current user is founder
  const { data: currentUserProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!currentUserProfile || !isFounder(currentUserProfile)) {
    return { error: 'Bu işlem için yetkiniz yok.' }
  }

  // Get current state of target profile
  const { data: targetProfile, error: fetchErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', targetUserId)
    .single()

  if (fetchErr || !targetProfile) {
    return { error: 'Hedef profil bulunamadı.' }
  }

  const supabaseAdmin = await createServiceClient()
  const updates: Record<string, any> = {
    updated_at: new Date().toISOString()
  }

  if (fields.first_name !== undefined) updates.first_name = fields.first_name
  if (fields.last_name !== undefined) updates.last_name = fields.last_name
  if (fields.username !== undefined && fields.username.trim() !== '') {
    // Check username uniqueness
    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('username', fields.username.trim())
      .neq('id', targetUserId)
      .maybeSingle()

    if (existing) {
      return { error: 'Bu kullanıcı adı zaten kullanılıyor.' }
    }
    updates.username = fields.username.trim()
  }

  // Handle bio and reset media
  if (fields.bio !== undefined) {
    const dbHasColumns = await checkDbHasVerificationColumns()
    if (dbHasColumns) {
      updates.bio = fields.bio
    } else {
      const bioParts = (targetProfile.bio || '').split('\u200B')
      const serializedMeta = bioParts[1] || '{}'
      updates.bio = fields.bio ? `${fields.bio}\u200B${serializedMeta}` : `\u200B${serializedMeta}`
    }
  }

  if (fields.resetAvatar) {
    updates.avatar_url = null
  }
  if (fields.resetBanner) {
    updates.banner_url = null
  }

  const { error: updateErr } = await supabaseAdmin
    .from('profiles')
    .update(updates)
    .eq('id', targetUserId)

  if (updateErr) {
    return { error: updateErr.message }
  }

  // Trigger notification for the user
  if (fields.resetAvatar) {
    await createNotification(targetUserId, user.id, 'support_reply', null, null, {
      message: 'Profil resminiz topluluk kuralları gereği yönetici tarafından varsayılana sıfırlandı.'
    })
  }
  if (fields.resetBanner) {
    await createNotification(targetUserId, user.id, 'support_reply', null, null, {
      message: 'Profil kapak resminiz topluluk kuralları gereği yönetici tarafından varsayılana sıfırlandı.'
    })
  }
  // Check if non-media details changed
  const infoChanged = fields.first_name !== undefined || fields.last_name !== undefined || fields.username !== undefined || fields.bio !== undefined
  if (infoChanged && !fields.resetAvatar && !fields.resetBanner) {
    await createNotification(targetUserId, user.id, 'support_reply', null, null, {
      message: 'Profil bilgileriniz yönetici tarafından güncellendi.'
    })
  }

  revalidatePath(`/profile/${targetProfile.username}`)
  if (fields.username && fields.username.trim() !== targetProfile.username) {
    revalidatePath(`/profile/${fields.username.trim()}`)
  }
  revalidatePath('/', 'layout')
  return { success: true }
}

export async function updateAccentTheme(themeName: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }

  if (await checkLockdown()) {
    return { error: 'Platform şu anda acil durum nedeniyle geçici olarak salt okunur (read-only) modundadır.' }
  }

  const res = await saveProfileMetadata(user.id, { accent_theme: themeName })
  if (res.error) return { error: res.error }
  
  revalidatePath('/profile')
  revalidatePath('/settings')
  revalidatePath('/', 'layout')
  return { success: true }
}

export async function completeProfileSetup(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }

  if (await checkLockdown()) {
    return { error: 'Platform şu anda acil durum nedeniyle geçici olarak salt okunur (read-only) modundadır.' }
  }

  const username = (formData.get('username') as string | null)?.trim()
  const firstName = (formData.get('first_name') as string | null)?.trim() || null
  const lastName = (formData.get('last_name') as string | null)?.trim() || null
  const googleAvatarUrl = formData.get('google_avatar_url') as string | null
  const password = (formData.get('password') as string | null)?.trim() || null
  const country = (formData.get('country') as string | null)?.trim() || null
  const city = (formData.get('city') as string | null)?.trim() || null

  if (!username) {
    return { error: 'Kullanıcı adı zorunludur.' }
  }

  // Regex validation: 3-30 chars, alphanumeric + underscore
  const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/
  if (!usernameRegex.test(username)) {
    return { error: 'Kullanıcı adı 3-30 karakter olmalı, sadece harf, rakam ve alt çizgi (_) içermelidir.' }
  }

  // Optional password validation
  if (password !== null && password.length < 8) {
    return { error: 'Şifre en az 8 karakter olmalıdır.' }
  }

  // NSFW validation
  const { containsNsfw } = await import('@/lib/nsfw-filter')
  if (
    containsNsfw(username) ||
    containsNsfw(firstName || '') ||
    containsNsfw(lastName || '')
  ) {
    return { error: 'Seçtiğiniz bilgiler uygunsuz içerik filtrelerimize takıldı.' }
  }

  // Check username uniqueness
  const { isReservedUsername } = await import('@/lib/reserved-usernames')
  if (isReservedUsername(username)) {
    return { error: 'Bu kullanıcı adı sistem tarafından rezerve edilmiştir.' }
  }

  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .neq('id', user.id)
    .maybeSingle()

  if (existing) {
    return { error: 'Bu kullanıcı adı zaten alınmış.' }
  }

  const avatarFile = formData.get('avatar') as File | null
  let avatarUrl: string | null | undefined = undefined

  if (avatarFile && avatarFile.size > 0) {
    if (await checkMediaUploadLock()) {
      return { error: 'Platform genelinde medya/görsel yüklemeleri acil durum nedeniyle geçici olarak kapatılmıştır.' }
    }
    const ext = avatarFile.name.split('.').pop() || 'webp'
    const path = `${user.id}/avatar.${ext}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type })

    if (uploadError) return { error: 'Profil resmi yüklenemedi: ' + uploadError.message }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(uploadData.path)
    avatarUrl = publicUrl
  } else if (googleAvatarUrl) {
    avatarUrl = googleAvatarUrl
  }

  const updates: Record<string, any> = {
    username,
    first_name: firstName,
    last_name: lastName,
    country: country,
    city: city,
    updated_at: new Date().toISOString()
  }

  if (avatarUrl !== undefined) {
    updates.avatar_url = avatarUrl
  }

  const { error: updateErr } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  if (updateErr) return { error: updateErr.message }

  // If user set a password, update their Supabase Auth password
  // This enables them to login later with email + password instead of only OAuth
  if (password) {
    const { error: pwErr } = await supabase.auth.updateUser({ password })
    if (pwErr) return { error: 'Şifre ayarlanamadı: ' + pwErr.message }
  }

  // Set setup status to completed
  const metaRes = await saveProfileMetadata(user.id, { is_setup_completed: true })
  if (metaRes.error) return { error: metaRes.error }

  revalidatePath('/profile')
  revalidatePath('/settings')
  revalidatePath(`/profile/${username}`)
  revalidatePath('/', 'layout')

  return { success: true }
}

