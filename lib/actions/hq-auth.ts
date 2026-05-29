'use server'

import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { isAdmin, isStaff } from '@/lib/founder'

/** Dashboard layout'ta kullanılacak ortak auth guard.
 *  Founder, admin veya moderator değilse 404 döner. Sudo modunda şifre doğrulaması ister. */
export async function requireHQAccess(bypassSudo = false) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    notFound()
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, first_name, last_name, avatar_url, role')
    .eq('id', user.id)
    .single()

  if (!profile || !isStaff(profile)) {
    // Yetkisiz erişimde sanki sayfa hiç yokmuş gibi 404 döner
    notFound()
  }

  if (!bypassSudo) {
    const cookieStore = await cookies()
    const sudoToken = cookieStore.get('havn_hq_sudo_unlocked')
    if (!sudoToken || sudoToken.value !== 'true') {
      redirect('/havn-hq-gate')
    }
  }

  return profile
}

/** Acil Durum Modu (Lockdown) kontrolü */
export async function checkLockdown() {
  const supabase = await createClient()
  const { data: setting } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'lockdown_mode')
    .maybeSingle()

  return setting && (setting.value === true || setting.value === 'true')
}

/** Medya Yükleme Kilidi kontrolü */
export async function checkMediaUploadLock() {
  const supabase = await createClient()
  const { data: setting } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'media_upload_lock')
    .maybeSingle()

  return setting && (setting.value === true || setting.value === 'true')
}

/** HQ Yönetim Paneline girmeden önce şifre doğrulaması yapar (Sudo Mode) */
export async function verifyHQSudo(password: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) return { error: 'Oturum bulunamadı. Giriş yapmalısınız.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['founder', 'admin', 'moderator'].includes(profile.role ?? '')) {
    return { error: 'Bu işlem için yetkiniz yok.' }
  }

  // Kullanıcının şifresini doğrulamak için yeniden giriş sorgusu yapıyoruz
  const { error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: password,
  })

  if (error) {
    return { error: 'Girdiğiniz şifre yanlış veya geçersiz.' }
  }

  // 15 dakika boyunca sudo izni verir
  const cookieStore = await cookies()
  cookieStore.set('havn_hq_sudo_unlocked', 'true', {
    maxAge: 900, // 15 dakika
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  })

  return { success: true }
}
