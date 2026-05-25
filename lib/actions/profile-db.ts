'use server'

import { createServiceClient } from '@/lib/supabase/server'

// Check if profiles table has metadata columns in database
export async function checkDbHasMetadataColumns() {
  try {
    const supabaseAdmin = await createServiceClient()
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('id, is_private')
      .limit(1)
      .maybeSingle()
    return !!(data && 'is_private' in data)
  } catch {
    return false
  }
}

// Check if profiles table has verification columns in database
export async function checkDbHasVerificationColumns() {
  try {
    const supabaseAdmin = await createServiceClient()
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('id, is_verified')
      .limit(1)
      .maybeSingle()
    return !!(data && 'is_verified' in data)
  } catch {
    return false
  }
}

interface ProfileUpdateMeta {
  is_private?: boolean
  social_links?: any
  follow_requests?: string[]
  last_seen_at?: string | null
  hidden_conversations?: Record<string, string>
  show_status?: boolean
  default_feed_type?: 'for_you' | 'following'
  is_verified?: boolean
  is_gold?: boolean
}

// Update profile metadata columns in database if they exist, or fallback to bio
export async function saveProfileMetadata(userId: string, newMeta: ProfileUpdateMeta, newBioText?: string | null) {
  const supabaseAdmin = await createServiceClient()
  const dbHasColumns = await checkDbHasMetadataColumns()
  const dbHasVerification = await checkDbHasVerificationColumns()

  // 1. Fetch current profile bio
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('bio')
    .eq('id', userId)
    .single()

  if (!profile) return { error: 'Profil bulunamadı' }

  const bio = profile.bio || ''
  const parts = bio.split('\u200B')
  let cleanBioText = newBioText !== undefined ? (newBioText || '') : parts[0].trim()
  let existingMeta: any = {}

  if (parts.length > 1) {
    try {
      existingMeta = JSON.parse(parts[1])
    } catch (e) {}
  }

  const mergedMeta = {
    ...existingMeta,
    ...newMeta
  }

  // If last_seen_at is explicitly set to null, delete it from meta
  if (newMeta.last_seen_at === null) {
    delete mergedMeta.last_seen_at
  }

  const updates: Record<string, any> = { updated_at: new Date().toISOString() }

  if (dbHasColumns || dbHasVerification) {
    // Write directly to columns AND clean the bio field (remove JSON suffix)
    updates.bio = cleanBioText || null
    
    if (dbHasColumns) {
      if (newMeta.is_private !== undefined) updates.is_private = newMeta.is_private
      if (newMeta.social_links !== undefined) updates.social_links = newMeta.social_links
      if (newMeta.follow_requests !== undefined) updates.follow_requests = newMeta.follow_requests
      if (newMeta.last_seen_at !== undefined) updates.last_seen_at = newMeta.last_seen_at
      if (newMeta.hidden_conversations !== undefined) updates.hidden_conversations = newMeta.hidden_conversations
      if (newMeta.show_status !== undefined) updates.show_status = newMeta.show_status
      if (newMeta.default_feed_type !== undefined) updates.default_feed_type = newMeta.default_feed_type
    }

    if (dbHasVerification) {
      if (newMeta.is_verified !== undefined) updates.is_verified = newMeta.is_verified
      if (newMeta.is_gold !== undefined) updates.is_gold = newMeta.is_gold
    }
  } else {
    // Fallback to storing in bio column
    const serializedMeta = JSON.stringify(mergedMeta)
    updates.bio = cleanBioText ? `${cleanBioText}\u200B${serializedMeta}` : `\u200B${serializedMeta}`
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update(updates)
    .eq('id', userId)

  if (error) {
    console.error('saveProfileMetadata error:', error)
    return { error: error.message }
  }

  return { success: true }
}
