'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { isAdmin, isStaff } from '@/lib/founder'

/** Dashboard layout'ta kullanılacak ortak auth guard.
 *  Founder, admin veya moderator değilse 404 döner. Sudo modunda şifre doğrulaması ister. */
export async function requireHQAccess(bypassSudo = false) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/404-not-found-__havn__')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, first_name, last_name, avatar_url, role')
    .eq('id', user.id)
    .single()

  if (!profile || !isStaff(profile)) {
    // Yetkisiz erişimde sanki sayfa hiç yokmuş gibi 404 döner
    redirect('/404-not-found-__havn__')
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
