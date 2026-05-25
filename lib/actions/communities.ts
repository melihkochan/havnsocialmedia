'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getCommunities() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('communities')
    .select(`*, creator:profiles!created_by(id, username, first_name, last_name), community_members(id)`)
    .order('created_at', { ascending: false })

  if (error) return []
  return data
}

export async function getCommunity(slug: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('communities')
    .select(`*, community_members(id, user_id, role, status, profiles(*))`)
    .eq('slug', slug)
    .single()

  if (error) return null
  return data
}

export async function createCommunity(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }

  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const type = formData.get('type') as 'public' | 'request_to_join'
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 50)

  // Check slug or name uniqueness case-insensitively
  const { data: existing } = await supabase
    .from('communities')
    .select('id')
    .or(`slug.eq.${slug},name.ilike.${name}`)
    .limit(1)
    .maybeSingle()

  if (existing) return { error: 'Bu isimde veya benzer bir isimde bir topluluk zaten var.' }

  const { data: community, error } = await supabase
    .from('communities')
    .insert({ name, slug, description, type, created_by: user.id })
    .select()
    .single()

  if (error) return { error: error.message }

  // Auto-add creator as owner
  await supabase.from('community_members').insert({
    community_id: community.id,
    user_id: user.id,
    role: 'owner',
    status: 'approved',
  })

  revalidatePath('/communities')
  return { success: true, slug }
}

export async function joinCommunity(communityId: string, communityType: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }

  const status = communityType === 'request_to_join' ? 'pending' : 'approved'

  const { error } = await supabase.from('community_members').insert({
    community_id: communityId,
    user_id: user.id,
    role: 'member',
    status,
  })

  if (error) return { error: error.message }

  // Send join request notification to community admins
  if (status === 'pending') {
    const { data: admins } = await supabase
      .from('community_members')
      .select('user_id')
      .eq('community_id', communityId)
      .eq('status', 'approved')
      .in('role', ['owner', 'moderator'])

    if (admins && admins.length > 0) {
      const { createNotification } = await import('@/lib/actions/notifications')
      for (const admin of admins) {
        await createNotification(admin.user_id, user.id, 'join_request', null, null, { communityId })
      }
    }
  }

  revalidatePath('/communities')
  return { success: true, status }
}

export async function leaveCommunity(communityId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }

  const { error } = await supabase
    .from('community_members')
    .delete()
    .eq('community_id', communityId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/communities')
  return { success: true }
}

export async function updateCommunitySettings(communityId: string, formData: FormData) {
  const { createServiceClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const serviceClient = await createServiceClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }

  // Verify user is owner/moderator
  const { data: membership } = await supabase
    .from('community_members')
    .select('role, status')
    .eq('community_id', communityId)
    .eq('user_id', user.id)
    .single()

  if (!membership || membership.status !== 'approved' || (membership.role !== 'owner' && membership.role !== 'moderator')) {
    return { error: 'Bu topluluğu düzenleme yetkiniz yok.' }
  }

  const name = formData.get('name') as string
  const description = formData.get('description') as string | null
  const type = formData.get('type') as 'public' | 'request_to_join' | null
  const avatarFile = formData.get('avatar') as File | null
  const bannerFile = formData.get('banner') as File | null

  // Get current community to check slug/name
  const { data: currentComm } = await supabase
    .from('communities')
    .select('*')
    .eq('id', communityId)
    .single()

  if (!currentComm) return { error: 'Topluluk bulunamadı.' }

  const updates: Record<string, any> = {}
  let newSlug = currentComm.slug

  if (name && name !== currentComm.name) {
    updates.name = name
    newSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 50)
    
    // Check if new slug or name conflicts with another community
    const { data: existing } = await supabase
      .from('communities')
      .select('id')
      .neq('id', communityId)
      .or(`slug.eq.${newSlug},name.ilike.${name}`)
      .limit(1)
      .maybeSingle()

    if (existing) {
      return { error: 'Bu isimde veya benzer bir isimde bir topluluk zaten var, lütfen farklı bir isim seçin.' }
    }
    updates.slug = newSlug
  }

  if (description !== null) updates.description = description
  if (type) updates.type = type

  // Perform metadata updates
  if (Object.keys(updates).length > 0) {
    const { error: updateError } = await serviceClient
      .from('communities')
      .update(updates)
      .eq('id', communityId)

    if (updateError) return { error: 'Topluluk güncellenemedi: ' + updateError.message }
  }

  // Handle avatar upload
  if (avatarFile && avatarFile.size > 0) {
    // Determine file type
    const contentType = avatarFile.type || 'image/png'
    const { error: uploadError } = await serviceClient.storage
      .from('avatars')
      .upload(`communities/${communityId}/avatar`, avatarFile, { 
        upsert: true, 
        contentType 
      })

    if (uploadError) return { error: 'Topluluk resmi yüklenemedi: ' + uploadError.message }
  }

  // Handle banner upload
  if (bannerFile && bannerFile.size > 0) {
    const contentType = bannerFile.type || 'image/png'
    const { error: uploadError } = await serviceClient.storage
      .from('avatars')
      .upload(`communities/${communityId}/banner`, bannerFile, { 
        upsert: true, 
        contentType 
      })

    if (uploadError) return { error: 'Kapak resmi yüklenemedi: ' + uploadError.message }
  }

  revalidatePath('/communities')
  revalidatePath(`/communities/${currentComm.slug}`)
  if (newSlug !== currentComm.slug) {
    revalidatePath(`/communities/${newSlug}`)
  }
  revalidatePath('/feed')

  return { success: true, slug: newSlug }
}

export async function approveMembership(communityId: string, userId: string) {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }

  // Verify that the current user is owner or moderator in this community
  const { data: currentMember } = await supabase
    .from('community_members')
    .select('role, status')
    .eq('community_id', communityId)
    .eq('user_id', user.id)
    .single()

  if (!currentMember || currentMember.status !== 'approved' || (currentMember.role !== 'owner' && currentMember.role !== 'moderator')) {
    return { error: 'Bu işlemi yapmak için yetkiniz yok.' }
  }

  const { error } = await serviceClient
    .from('community_members')
    .update({ status: 'approved' })
    .eq('community_id', communityId)
    .eq('user_id', userId)

  if (error) return { error: error.message }

  // Notify the user their join request was approved
  const { createNotification } = await import('@/lib/actions/notifications')
  await createNotification(userId, user.id, 'approved', null, null, { communityId })

  // Revalidate paths
  const { data: community } = await supabase.from('communities').select('slug').eq('id', communityId).single()
  if (community) {
    revalidatePath(`/communities/${community.slug}`)
  }
  revalidatePath('/communities')
  revalidatePath('/feed')

  return { success: true }
}

export async function rejectMembership(communityId: string, userId: string) {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }

  // Verify that the current user is owner or moderator in this community
  const { data: currentMember } = await supabase
    .from('community_members')
    .select('role, status')
    .eq('community_id', communityId)
    .eq('user_id', user.id)
    .single()

  if (!currentMember || currentMember.status !== 'approved' || (currentMember.role !== 'owner' && currentMember.role !== 'moderator')) {
    return { error: 'Bu işlemi yapmak için yetkiniz yok.' }
  }

  // Reject can delete the pending membership row so the user can apply again later if they want
  const { error } = await serviceClient
    .from('community_members')
    .delete()
    .eq('community_id', communityId)
    .eq('user_id', userId)
    .eq('status', 'pending')

  if (error) return { error: error.message }

  // Revalidate paths
  const { data: community } = await supabase.from('communities').select('slug').eq('id', communityId).single()
  if (community) {
    revalidatePath(`/communities/${community.slug}`)
  }
  revalidatePath('/communities')
  revalidatePath('/feed')

  return { success: true }
}

export async function updateMemberRole(communityId: string, targetUserId: string, newRole: 'member' | 'moderator') {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }

  // Verify that the current user is the owner (only owners can promote/demote mods)
  const { data: currentMember } = await supabase
    .from('community_members')
    .select('role, status')
    .eq('community_id', communityId)
    .eq('user_id', user.id)
    .single()

  if (!currentMember || currentMember.status !== 'approved' || currentMember.role !== 'owner') {
    return { error: 'Bu işlemi yapmak için yalnızca Kurucu yetkisine sahip olmalısınız.' }
  }

  const { error } = await serviceClient
    .from('community_members')
    .update({ role: newRole })
    .eq('community_id', communityId)
    .eq('user_id', targetUserId)

  if (error) return { error: error.message }

  const { data: community } = await supabase.from('communities').select('slug').eq('id', communityId).single()
  if (community) {
    revalidatePath(`/communities/${community.slug}`)
  }

  return { success: true }
}

export async function removeMember(communityId: string, targetUserId: string) {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }

  // Verify that the current user is owner or moderator
  const { data: currentMember } = await supabase
    .from('community_members')
    .select('role, status')
    .eq('community_id', communityId)
    .eq('user_id', user.id)
    .single()

  if (!currentMember || currentMember.status !== 'approved' || (currentMember.role !== 'owner' && currentMember.role !== 'moderator')) {
    return { error: 'Bu işlemi yapmak için yetkiniz yok.' }
  }

  // Get target member role to prevent moderators from kicking owners or other moderators
  const { data: targetMember } = await supabase
    .from('community_members')
    .select('role')
    .eq('community_id', communityId)
    .eq('user_id', targetUserId)
    .single()

  if (!targetMember) return { error: 'Üye bulunamadı.' }

  if (targetMember.role === 'owner') {
    return { error: 'Kurucuyu topluluktan çıkaramazsınız.' }
  }

  if (currentMember.role === 'moderator' && targetMember.role === 'moderator') {
    return { error: 'Diğer moderatörleri topluluktan çıkaramazsınız.' }
  }

  const { error } = await serviceClient
    .from('community_members')
    .delete()
    .eq('community_id', communityId)
    .eq('user_id', targetUserId)

  if (error) return { error: error.message }

  const { data: community } = await supabase.from('communities').select('slug').eq('id', communityId).single()
  if (community) {
    revalidatePath(`/communities/${community.slug}`)
  }
  revalidatePath('/communities')

  return { success: true }
}
