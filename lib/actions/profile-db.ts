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
  accent_theme?: string
  last_session_id?: string | null
  is_setup_completed?: boolean
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
    // Write directly to columns AND clean the bio field (remove JSON suffix unless there's custom meta)
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

    // Keep accent_theme, last_session_id and is_setup_completed in the bio suffix since there are no native columns for them
    const customMeta: any = {}
    if (newMeta.accent_theme !== undefined) customMeta.accent_theme = newMeta.accent_theme
    if (newMeta.last_session_id !== undefined) customMeta.last_session_id = newMeta.last_session_id
    if (newMeta.is_setup_completed !== undefined) customMeta.is_setup_completed = newMeta.is_setup_completed

    if (Object.keys(customMeta).length > 0 || (existingMeta && (existingMeta.accent_theme !== undefined || existingMeta.last_session_id !== undefined || existingMeta.is_setup_completed !== undefined))) {
      const mergedCustomMeta: any = {
        accent_theme: customMeta.accent_theme !== undefined ? customMeta.accent_theme : existingMeta.accent_theme,
        last_session_id: customMeta.last_session_id !== undefined ? customMeta.last_session_id : existingMeta.last_session_id,
        is_setup_completed: customMeta.is_setup_completed !== undefined ? customMeta.is_setup_completed : existingMeta.is_setup_completed
      }
      
      // If last_session_id is explicitly set to null, delete it
      if (mergedCustomMeta.last_session_id === null) {
        delete mergedCustomMeta.last_session_id
      }

      if (Object.keys(mergedCustomMeta).length > 0) {
        const serializedMeta = JSON.stringify(mergedCustomMeta)
        updates.bio = cleanBioText ? `${cleanBioText}\u200B${serializedMeta}` : `\u200B${serializedMeta}`
      }
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
