export interface EnrichedProfile {
  id: string
  username: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  banner_url: string | null
  bio: string | null
  updated_at: string
  is_private: boolean
  social_links: {
    twitter?: string | null
    instagram?: string | null
    github?: string | null
  }
  follow_requests?: string[]
  default_feed_type?: 'for_you' | 'following'
  show_status?: boolean
  last_seen_at?: string
  hidden_conversations?: Record<string, string>
  xp?: number
  is_verified?: boolean
  is_gold?: boolean
  accent_theme?: string
  last_session_id?: string
  is_setup_completed?: boolean
}

export function cleanBio(bio: string | null): string {
  if (!bio) return ''
  return bio.split('\u200B')[0].trim()
}

export function enrichProfile(profile: any): EnrichedProfile | null {
  if (!profile) return null
  const bio = profile.bio || ''
  const parts = bio.split('\u200B')
  
  let is_private = profile.is_private !== undefined ? !!profile.is_private : false
  let social_links = profile.social_links !== undefined ? profile.social_links || {} : {}
  let follow_requests = profile.follow_requests !== undefined ? profile.follow_requests || [] : []
  let default_feed_type: 'for_you' | 'following' = profile.default_feed_type !== undefined ? profile.default_feed_type : 'for_you'
  let show_status = profile.show_status !== undefined ? profile.show_status !== false : true
  let last_seen_at = profile.last_seen_at !== undefined ? profile.last_seen_at : undefined
  let hidden_conversations = profile.hidden_conversations !== undefined ? profile.hidden_conversations || {} : {}
  let is_verified = profile.is_verified !== undefined ? !!profile.is_verified : false
  let is_gold = profile.is_gold !== undefined ? !!profile.is_gold : false
  let accent_theme = 'purple'
  let last_session_id = undefined
  let is_setup_completed = true
  
  let cleanBioText = cleanBio(bio)

  // Fallback to bio metadata if the columns are not present in the DB payload (or if columns are undefined)
  if (parts.length > 1) {
    try {
      const meta = JSON.parse(parts[1])
      if (profile.is_private === undefined) is_private = !!meta.is_private
      if (profile.social_links === undefined) social_links = meta.social_links || {}
      if (profile.follow_requests === undefined) follow_requests = meta.follow_requests || []
      if (profile.default_feed_type === undefined && (meta.default_feed_type === 'following' || meta.default_feed_type === 'for_you')) {
        default_feed_type = meta.default_feed_type
      }
      if (profile.show_status === undefined) show_status = meta.show_status !== false
      if (profile.last_seen_at === undefined) last_seen_at = meta.last_seen_at
      if (profile.hidden_conversations === undefined) hidden_conversations = meta.hidden_conversations || {}
      if (profile.is_verified === undefined) is_verified = !!meta.is_verified
      if (profile.is_gold === undefined) is_gold = !!meta.is_gold
      if (meta.accent_theme !== undefined) accent_theme = meta.accent_theme
      if (meta.last_session_id !== undefined) last_session_id = meta.last_session_id
      if (meta.is_setup_completed !== undefined) is_setup_completed = !!meta.is_setup_completed
    } catch (e) {
      // ignore
    }
  }

  return {
    ...profile,
    bio: cleanBioText || null,
    is_private,
    social_links,
    follow_requests,
    default_feed_type,
    show_status,
    last_seen_at,
    hidden_conversations,
    is_verified,
    is_gold,
    accent_theme,
    last_session_id,
    is_setup_completed,
  }
}
