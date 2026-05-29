export const RESERVED_USERNAMES = [
  'admin',
  'moderator',
  'kurucu',
  'founder',
  'havn',
  'support',
  'destek',
  'staff',
  'ekip',
  'root',
  'havnhq',
  'overview',
  'analytics',
  'users',
  'team-chat',
  'settings'
]

export function isReservedUsername(username: string): boolean {
  if (!username) return false
  const clean = username.trim().toLowerCase()
  return RESERVED_USERNAMES.includes(clean)
}
