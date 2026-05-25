export const FOUNDER_ID = 'ea58c495-0c6c-49a7-bfc6-30ae3ed253a9'

export function isFounder(profile: { id?: string; username?: string } | null | undefined): boolean {
  if (!profile) return false
  return profile.id === FOUNDER_ID || profile.username === 'melih'
}
