'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { FOUNDER_ID, isFounder } from '@/lib/founder'
import { createNotification } from '@/lib/actions/notifications'

function formatServerDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Istanbul'
    })
  } catch {
    return ''
  }
}

export async function sendSupportRequest(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Talep göndermek için giriş yapmalısınız.' }

  const subject = formData.get('subject') as string
  const message = formData.get('message') as string

  if (!subject || !subject.trim() || !message || !message.trim()) {
    return { error: 'Konu ve mesaj alanları doldurulmalıdır.' }
  }

  // Fetch profile for display name
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, first_name, last_name')
    .eq('id', user.id)
    .single()

  const displayName = profile 
    ? `${profile.first_name || ''} ${profile.last_name || ''} (@${profile.username})`
    : user.email

  // Save to database first
  let dbSaved = false
  let insertedId = null
  try {
    const { data: insertedData, error: dbError } = await supabase
      .from('support_tickets')
      .insert({
        user_id: user.id,
        subject: subject.trim(),
        message: message.trim(),
        status: 'open'
      })
      .select('id')
      .single()

    if (dbError) {
      console.warn('Could not save support ticket to DB:', dbError.message)
    } else {
      dbSaved = true
      insertedId = insertedData?.id
      
      // Notify founder of new support ticket
      if (user.id !== FOUNDER_ID) {
        try {
          await createNotification(
            FOUNDER_ID,
            user.id,
            'support_ticket',
            null,
            null,
            {
              message: `Yeni destek talebi gönderildi: ${subject.trim()}`,
              postPreview: insertedId
            }
          )
        } catch (notifErr) {
          console.warn('Could not create notification for support ticket:', notifErr)
        }
      }
    }
  } catch (dbErr) {
    console.warn('Database save failed, continuing to send email:', dbErr)
  }

  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    if (dbSaved) {
      revalidatePath('/support')
      return { success: true, message: 'Talep kaydedildi (E-posta sistemi şu anda devre dışı).' }
    }
    return { error: 'Destek sistemi şu anda yapılandırılmamış (Resend API key eksik).' }
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to: 'melihkochan00@gmail.com', // Resend free-tier default recipient (registered owner)
        subject: `HAVN Destek Talebi: ${subject}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; border: 1px solid #eee; border-radius: 12px;">
            <h2 style="color: #8b5cf6; border-bottom: 2px solid #f3f4f6; padding-bottom: 10px; margin-top: 0;">Yeni Destek Talebi</h2>
            <p><strong>Gönderen:</strong> ${displayName}</p>
            <p><strong>Kullanıcı E-postası:</strong> ${user.email}</p>
            <p><strong>Kullanıcı ID:</strong> ${user.id}</p>
            <p><strong>Konu:</strong> ${subject}</p>
            <hr style="border: 0; border-top: 1px solid #f3f4f6; margin: 20px 0;" />
            <p style="white-space: pre-wrap; line-height: 1.6; background-color: #f9fafb; padding: 15px; border-radius: 8px;">${message}</p>
          </div>
        `,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Resend API error:', data)
      if (dbSaved) {
        revalidatePath('/support')
        return { success: true, message: 'Talep kaydedildi fakat e-posta gönderimi başarısız oldu.' }
      }
      return { error: data.message || 'E-posta gönderimi başarısız oldu.' }
    }

    revalidatePath('/support')
    return { success: true }
  } catch (err: any) {
    console.error('Support action error:', err)
    if (dbSaved) {
      revalidatePath('/support')
      return { success: true, message: 'Talep kaydedildi fakat e-posta gönderilirken hata oluştu.' }
    }
    return { error: 'Beklenmeyen bir hata oluştu: ' + err.message }
  }
}

export async function getSupportTickets() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Fetch profile to check permissions
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const isAgent = isFounder(profile)

  let client = supabase
  if (isAgent) {
    client = await createServiceClient()
  }

  let query = client
    .from('support_tickets')
    .select('*, profiles!support_tickets_user_id_fkey(*)')

  if (!isAgent) {
    query = query.eq('user_id', user.id)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error('getSupportTickets error:', error)
    return []
  }

  if (!data || data.length === 0) return []

  // Fetch profiles of users who replied to tickets to show their names
  const replierIds = Array.from(new Set(data.map((t: any) => t.replied_by).filter(Boolean))) as string[]
  let repliersMap: Record<string, any> = {}

  if (replierIds.length > 0) {
    const { data: repliers, error: repliersError } = await client
      .from('profiles')
      .select('id, username, first_name, last_name, avatar_url')
      .in('id', replierIds)

    if (!repliersError && repliers) {
      repliers.forEach((p: any) => {
        repliersMap[p.id] = p
      })
    }
  }

  return data.map((t: any) => ({
    ...t,
    replier: t.replied_by ? (repliersMap[t.replied_by] || null) : null
  }))
}

export async function replyToSupportTicket(ticketId: string, replyText: string, status: 'replied' | 'closed') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }

  // Fetch profile to check permissions
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!isFounder(profile)) {
    return { error: 'Bu işlem için yetkiniz bulunmamaktadır.' }
  }

  if (!replyText || !replyText.trim()) {
    return { error: 'Yanıt boş olamaz.' }
  }

  // Update ticket status and reply using service client to bypass RLS updates
  const supabaseAdmin = await createServiceClient()
  const { data: ticket, error: updateError } = await supabaseAdmin
    .from('support_tickets')
    .update({
      admin_reply: replyText.trim(),
      replied_by: user.id,
      status,
      updated_at: new Date().toISOString()
    })
    .eq('id', ticketId)
    .select('*, profiles!support_tickets_user_id_fkey(*)')
    .single()

  if (updateError || !ticket) {
    console.error('replyToSupportTicket error:', updateError)
    return { error: updateError?.message || 'Bilet güncellenemedi.' }
  }

  // Create an in-app notification for the ticket owner
  try {
    const { createNotification } = await import('@/lib/actions/notifications')
    const messageSnippet = replyText.length > 55 ? `${replyText.slice(0, 55)}...` : replyText
    const actionTypeLabel = status === 'closed' ? 'kapatıldı' : 'yanıtlandı'
    await createNotification(
      ticket.user_id,
      user.id,
      'support_reply',
      null,
      null,
      {
        message: `Destek talebiniz ${actionTypeLabel}: "${messageSnippet}"`,
        postPreview: ticket.id
      }
    )
  } catch (notifErr) {
    console.warn('Could not create support reply in-app notification:', notifErr)
  }

  // Fetch ticket owner's email using supabase service client
  let recipientEmail: string | null = null
  try {
    const supabaseAdmin = await createServiceClient()
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(ticket.user_id)
    if (!userError && userData?.user) {
      recipientEmail = userData.user.email ?? null
    }
  } catch (err) {
    console.warn('Could not retrieve user email:', err)
  }

  // Send Resend notification if recipient email found and API key configured
  const resendApiKey = process.env.RESEND_API_KEY
  if (resendApiKey && recipientEmail) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: 'onboarding@resend.dev',
          to: recipientEmail,
          subject: `HAVN Destek Talebiniz Yanıtlandı`,
          html: `
            <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; border: 1px solid #eee; border-radius: 12px;">
              <h2 style="color: #8b5cf6; border-bottom: 2px solid #f3f4f6; padding-bottom: 10px; margin-top: 0;">Destek Talebiniz Yanıtlandı</h2>
              <p>Merhaba,</p>
              <p>Destek ekibimiz talebinize bir yanıt yazdı:</p>
              <div style="white-space: pre-wrap; line-height: 1.6; background-color: #f5f3ff; border-left: 4px solid #8b5cf6; padding: 15px; border-radius: 8px; font-style: italic; margin: 15px 0;">
                "${replyText}"
              </div>
              <p>Talebinizin detaylarını ve önceki yazışmaları platforma giriş yaparak "Destek" sekmesinden takip edebilirsiniz.</p>
              <hr style="border: 0; border-top: 1px solid #f3f4f6; margin: 20px 0;" />
              <p style="font-size: 11px; color: #999;">Bu e-posta HAVN Destek portalı tarafından otomatik olarak gönderilmiştir.</p>
            </div>
          `,
        }),
      })
    } catch (emailErr) {
      console.error('Failed to send reply notification email:', emailErr)
    }
  }

  revalidatePath('/support')
  return { success: true }
}

export async function closeSupportTicketByAdmin(ticketId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }

  // Fetch profile to check permissions
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!isFounder(profile)) {
    return { error: 'Bu işlem için yetkiniz bulunmamaktadır.' }
  }

  const supabaseAdmin = await createServiceClient()
  const { data: ticket, error: fetchError } = await supabaseAdmin
    .from('support_tickets')
    .select('user_id, subject')
    .eq('id', ticketId)
    .single()

  if (fetchError || !ticket) {
    return { error: 'Talep bulunamadı.' }
  }

  const { error: updateError } = await supabaseAdmin
    .from('support_tickets')
    .update({
      status: 'closed',
      replied_by: user.id,
      updated_at: new Date().toISOString()
    })
    .eq('id', ticketId)

  if (updateError) {
    console.error('closeSupportTicketByAdmin error:', updateError)
    return { error: 'Talep kapatılamadı.' }
  }

  // Create an in-app notification for the ticket owner
  try {
    await createNotification(
      ticket.user_id,
      user.id,
      'support_reply',
      null,
      null,
      {
        message: `Destek talebiniz kapatıldı: "${ticket.subject}"`,
        postPreview: ticketId
      }
    )
  } catch (notifErr) {
    console.warn('Could not create support reply in-app notification:', notifErr)
  }

  revalidatePath('/support')
  return { success: true }
}

export async function closeSupportTicketByUser(ticketId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }

  // Fetch ticket to check ownership and initiation source
  const { data: ticket, error: fetchError } = await supabase
    .from('support_tickets')
    .select('user_id, message')
    .eq('id', ticketId)
    .single()

  if (fetchError || !ticket) {
    return { error: 'Talep bulunamadı.' }
  }

  if (ticket.user_id !== user.id) {
    return { error: 'Bu işlem için yetkiniz bulunmamaktadır.' }
  }

  const isInitiatedByAdmin = ticket.message?.trim().startsWith('[Kurucu - Yanıt') || ticket.message?.trim().startsWith('[Yönetici - Yanıt')
  if (isInitiatedByAdmin) {
    return { error: 'Yönetici tarafından başlatılan talepler kapatılamaz.' }
  }

  const supabaseAdmin = await createServiceClient()
  const { error: updateError } = await supabaseAdmin
    .from('support_tickets')
    .update({
      status: 'closed',
      updated_at: new Date().toISOString()
    })
    .eq('id', ticketId)

  if (updateError) {
    console.error('closeSupportTicketByUser error:', updateError)
    return { error: 'Talep kapatılamadı.' }
  }

  revalidatePath('/support')
  return { success: true }
}

export async function sendSupportFollowUp(ticketId: string, replyText: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }

  if (!replyText || !replyText.trim()) {
    return { error: 'Mesaj boş olamaz.' }
  }

  // Fetch ticket to check ownership
  const { data: ticket, error: fetchError } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('id', ticketId)
    .single()

  if (fetchError || !ticket) {
    return { error: 'Talep bulunamadı.' }
  }

  if (ticket.user_id !== user.id) {
    return { error: 'Bu işlem için yetkiniz bulunmamaktadır.' }
  }

  // Format historical message
  let updatedMessage = ticket.message
  if (ticket.admin_reply) {
    const replierLabel = ticket.replied_by === FOUNDER_ID ? 'Kurucu' : 'Yönetici'
    const adminReplyTime = formatServerDate(ticket.updated_at || new Date().toISOString())
    updatedMessage += `\n\n[${replierLabel} - Yanıt | ${adminReplyTime}]:\n${ticket.admin_reply}`
  }
  const nowTime = formatServerDate(new Date().toISOString())
  updatedMessage += `\n\n[Kullanıcı - Takip Mesajı | ${nowTime}]:\n${replyText.trim()}`

  const supabaseAdmin = await createServiceClient()
  const { error: updateError } = await supabaseAdmin
    .from('support_tickets')
    .update({
      message: updatedMessage,
      admin_reply: null,
      replied_by: null,
      status: 'open',
      updated_at: new Date().toISOString()
    })
    .eq('id', ticketId)

  if (updateError) {
    console.error('sendSupportFollowUp error:', updateError)
    return { error: 'Mesaj gönderilemedi.' }
  }

  // Notify founder of follow-up message
  try {
    const { createNotification } = await import('@/lib/actions/notifications')
    await createNotification(
      FOUNDER_ID,
      user.id,
      'support_ticket',
      null,
      null,
      {
        message: `Destek talebine yeni mesaj: "${replyText.trim().slice(0, 30)}..."`,
        postPreview: ticket.id
      }
    )
  } catch (notifErr) {
    console.warn('Could not notify founder of support ticket follow-up:', notifErr)
  }

  revalidatePath('/support')
  return { success: true }
}

export async function getUserSupportTickets(targetUserId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Fetch current user's profile to check if they are a founder
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!isFounder(profile)) {
    // Only founders/admins can view other users' tickets
    return []
  }

  const supabaseAdmin = await createServiceClient()
  const { data, error } = await supabaseAdmin
    .from('support_tickets')
    .select('*, profiles!support_tickets_user_id_fkey(*)')
    .eq('user_id', targetUserId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getUserSupportTickets error:', error)
    return []
  }

  if (!data || data.length === 0) return []

  // Fetch profiles of users who replied to tickets to show their names
  const replierIds = Array.from(new Set(data.map((t: any) => t.replied_by).filter(Boolean))) as string[]
  let repliersMap: Record<string, any> = {}

  if (replierIds.length > 0) {
    const { data: repliers, error: repliersError } = await supabaseAdmin
      .from('profiles')
      .select('id, username, first_name, last_name, avatar_url')
      .in('id', replierIds)

    if (!repliersError && repliers) {
      repliers.forEach((p: any) => {
        repliersMap[p.id] = p
      })
    }
  }

  return data.map((t: any) => ({
    ...t,
    replier: t.replied_by ? (repliersMap[t.replied_by] || null) : null
  }))
}

export async function sendAdminSupportRequest(targetUserId: string, subject: string, messageText: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }

  // Check if current user is founder
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!isFounder(profile)) {
    return { error: 'Bu işlem için yetkiniz bulunmamaktadır.' }
  }

  if (!targetUserId || !subject || !subject.trim() || !messageText || !messageText.trim()) {
    return { error: 'Tüm alanlar doldurulmalıdır.' }
  }

  const nowTime = formatServerDate(new Date().toISOString())
  const formattedMessage = `[Kurucu - Yanıt | ${nowTime}]:\n${messageText.trim()}`

  const supabaseAdmin = await createServiceClient()
  const { data: insertedData, error: dbError } = await supabaseAdmin
    .from('support_tickets')
    .insert({
      user_id: targetUserId,
      subject: subject.trim(),
      message: formattedMessage,
      status: 'replied',
      replied_by: user.id
    })
    .select('*, profiles!support_tickets_user_id_fkey(*)')
    .single()

  if (dbError || !insertedData) {
    console.error('sendAdminSupportRequest db error:', dbError)
    return { error: 'Talep oluşturulamadı: ' + dbError?.message }
  }

  // Notify the target user about the new support message from the admin
  try {
    const { createNotification } = await import('@/lib/actions/notifications')
    await createNotification(
      targetUserId,
      user.id,
      'support_reply',
      null,
      null,
      {
        message: `Destek ekibi yeni bir konuşma başlattı: "${subject.trim()}"`,
        postPreview: insertedData.id
      }
    )
  } catch (notifErr) {
    console.warn('Could not create support_reply notification for admin started ticket:', notifErr)
  }

  revalidatePath('/support')
  return { success: true, ticket: insertedData }
}
