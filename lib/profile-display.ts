export type ProfileNameFields = {
  id?: string
  first_name?: string | null
  last_name?: string | null
  username: string
}

export function getFullName(profile: ProfileNameFields): string | null {
  const parts = [profile.first_name?.trim(), profile.last_name?.trim()].filter(Boolean) as string[]
  return parts.length > 0 ? parts.join(' ') : null
}

export function getDisplayName(profile: ProfileNameFields): string {
  return getFullName(profile) ?? profile.username
}

export function getInitials(profile: ProfileNameFields): string {
  const first = profile.first_name?.trim()
  const last = profile.last_name?.trim()
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase()
  if (first) return first.slice(0, 2).toUpperCase()
  return profile.username.slice(0, 2).toUpperCase()
}

export function getOnlineStatus(profile: any): { status: 'online' | 'offline' | 'last_seen'; text: string } {
  if (!profile) return { status: 'offline', text: 'Çevrimdışı' }
  
  if (profile.show_status === false) {
    return { status: 'offline', text: 'Çevrimdışı' }
  }

  if (!profile.last_seen_at) {
    return { status: 'offline', text: 'Çevrimdışı' }
  }

  const lastSeen = new Date(profile.last_seen_at)
  const now = new Date()
  const diffMs = now.getTime() - lastSeen.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  // Under 3 minutes counts as online
  if (diffMins < 3) {
    return { status: 'online', text: 'Çevrimiçi' }
  }

  if (diffMins < 60) {
    return { status: 'last_seen', text: `Son görülme: ${diffMins} dk. önce` }
  }

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) {
    return { status: 'last_seen', text: `Son görülme: ${diffHours} sa. önce` }
  }

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) {
    return { status: 'last_seen', text: 'Son görülme: Dün' }
  }

  return { status: 'last_seen', text: `Son görülme: ${lastSeen.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}` }
}
