/**
 * Platform-level role helpers.
 * ⚠️  Hiçbir UUID, kullanıcı adı veya kişisel tanımlayıcı bu dosyada bulunmamalıdır.
 *     Founder/admin tespiti tamamen Supabase `profiles.role` kolonu üzerinden yapılır.
 */

export type PlatformRole = 'founder' | 'admin' | 'moderator' | 'member'

/** Profil nesnesinden platform rolünü döndürür. */
export function getPlatformRole(
  profile: { role?: string | null } | null | undefined
): PlatformRole {
  const r = profile?.role
  if (r === 'founder') return 'founder'
  if (r === 'admin') return 'admin'
  if (r === 'moderator') return 'moderator'
  return 'member'
}

/** Kullanıcı founder mı? */
export function isFounder(
  profile: { role?: string | null; id?: string; username?: string } | null | undefined
): boolean {
  return profile?.role === 'founder'
}

/** Kullanıcı admin veya founder mı? */
export function isAdmin(
  profile: { role?: string | null } | null | undefined
): boolean {
  return profile?.role === 'founder' || profile?.role === 'admin'
}

/** Kullanıcı herhangi bir yetkili rol mü? (founder | admin | moderator) */
export function isStaff(
  profile: { role?: string | null } | null | undefined
): boolean {
  return ['founder', 'admin', 'moderator'].includes(profile?.role ?? '')
}
