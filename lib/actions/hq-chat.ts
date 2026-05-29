'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function getHQMessages() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['founder', 'admin', 'moderator'].includes(profile.role)) {
    return []
  }

  const { data: messagesData, error } = await supabase
    .from('hq_messages')
    .select('*')
    .order('created_at', { ascending: true })

  if (error || !messagesData) {
    console.error('getHQMessages error:', error)
    return []
  }

  // Fetch profiles of senders
  const userIds = Array.from(new Set(messagesData.map((m: any) => m.user_id)))
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, first_name, last_name, avatar_url, role')
    .in('id', userIds)

  const profileMap = new Map(profiles?.map((p: any) => [p.id, p]) ?? [])

  return messagesData.map((m: any) => ({
    ...m,
    user: profileMap.get(m.user_id) || null
  }))
}

export async function sendHQMessage(content: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }

  if (!content || !content.trim()) {
    return { error: 'Mesaj boş olamaz.' }
  }

  // Check role and fetch profile info to attach to the returned message
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, first_name, last_name, avatar_url, role')
    .eq('id', user.id)
    .single()

  if (!profile || !['founder', 'admin', 'moderator'].includes(profile.role)) {
    return { error: 'Bu işlem için yetkiniz yok.' }
  }

  const { data: insertedData, error } = await supabase
    .from('hq_messages')
    .insert({
      user_id: user.id,
      content: content.trim()
    })
    .select('*')
    .single()

  if (error) {
    console.error('sendHQMessage error:', error)
    return { error: error.message }
  }

  return { 
    success: true, 
    message: {
      ...insertedData,
      user: profile
    }
  }
}

export async function getTeamMembers() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, first_name, last_name, avatar_url, role, last_seen_at, show_status, is_verified, is_gold, xp, bio, warns, country, city')
    .in('role', ['founder', 'admin', 'moderator'])
    .order('updated_at', { ascending: false })

  if (error || !data) {
    console.error('getTeamMembers error:', error)
    return []
  }
  return data
}

// ── STAFF NOTES / TASKS ACTIONS ──────────────────────────────────────────────

export async function getHQNotes() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['founder', 'admin', 'moderator'].includes(profile.role)) {
    return []
  }

  const { data, error } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'hq_notes')
    .maybeSingle()

  if (error || !data || !data.value) return []
  try {
    return typeof data.value === 'string' ? JSON.parse(data.value) : data.value
  } catch (e) {
    return []
  }
}

export async function saveHQNotes(notes: any[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['founder', 'admin', 'moderator'].includes(profile.role)) {
    return { error: 'Yetki yok.' }
  }

  const admin = await createServiceClient()
  const { error } = await admin
    .from('system_settings')
    .upsert({
      key: 'hq_notes',
      value: JSON.stringify(notes),
      updated_at: new Date().toISOString(),
      updated_by: user.id
    })

  if (error) return { error: error.message }
  return { success: true }
}

export async function addHQNote(title: string, content: string, type: 'note' | 'announcement', assignedTo: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, first_name, last_name, role')
    .eq('id', user.id)
    .single()

  if (!profile || !['founder', 'admin', 'moderator'].includes(profile.role)) {
    return { error: 'Yetki yok.' }
  }

  const notes = await getHQNotes()
  const actorName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || `@${profile.username}`
  const newNote = {
    id: Math.random().toString(36).substring(2, 9),
    title: title.trim(),
    content: content.trim(),
    type,
    status: 'todo',
    created_at: new Date().toISOString(),
    created_by: {
      id: user.id,
      name: actorName,
      username: profile.username
    },
    assigned_to: assignedTo.trim() || ''
  }

  notes.push(newNote)
  const res = await saveHQNotes(notes)
  if (res.success) {
    await logHQModAction('note_add', '', `"${title.trim()}" başlıklı bir not/duyuru ekledi.`)
  }
  return res
}

export async function updateHQNoteStatus(noteId: string, status: 'todo' | 'inprogress' | 'completed') {
  const notes = await getHQNotes()
  const noteIndex = notes.findIndex((n: any) => n.id === noteId)
  if (noteIndex === -1) return { error: 'Not bulunamadı.' }

  const oldStatus = notes[noteIndex].status
  notes[noteIndex].status = status
  const res = await saveHQNotes(notes)
  if (res.success) {
    const statusLabels = { todo: 'Yapılacak', inprogress: 'Yapılıyor', completed: 'Tamamlandı' }
    await logHQModAction('note_status', '', `"${notes[noteIndex].title}" notunun durumunu "${statusLabels[status]}" olarak güncelledi.`)
  }
  return res
}

export async function deleteHQNote(noteId: string) {
  const notes = await getHQNotes()
  const note = notes.find((n: any) => n.id === noteId)
  if (!note) return { error: 'Not bulunamadı.' }

  const updatedNotes = notes.filter((n: any) => n.id !== noteId)
  const res = await saveHQNotes(updatedNotes)
  if (res.success) {
    await logHQModAction('note_delete', '', `"${note.title}" notunu sildi.`)
  }
  return res
}

// ── MODERATOR LOGS ACTIONS ──────────────────────────────────────────────────

export async function getHQModLogs() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['founder', 'admin', 'moderator'].includes(profile.role)) {
    return []
  }

  const { data, error } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'hq_mod_logs')
    .maybeSingle()

  if (error || !data || !data.value) return []
  try {
    return typeof data.value === 'string' ? JSON.parse(data.value) : data.value
  } catch (e) {
    return []
  }
}

export async function logHQModAction(actionType: string, targetName: string, details: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, username, first_name, last_name, role')
      .eq('id', user.id)
      .single()

    if (!profile || !['founder', 'admin', 'moderator'].includes(profile.role)) return

    // Get existing logs
    const { data } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'hq_mod_logs')
      .maybeSingle()

    let logs: any[] = []
    if (data && data.value) {
      try {
        logs = typeof data.value === 'string' ? JSON.parse(data.value) : data.value
      } catch (e) {
        logs = []
      }
    }

    const actorName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || `@${profile.username}`
    const newLog = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      actor: {
        id: profile.id,
        name: actorName,
        username: profile.username,
        role: profile.role
      },
      action: actionType,
      target: targetName,
      details
    }

    // Prepend and limit to 150 entries
    const updatedLogs = [newLog, ...logs].slice(0, 150)

    const admin = await createServiceClient()
    await admin
      .from('system_settings')
      .upsert({
        key: 'hq_mod_logs',
        value: JSON.stringify(updatedLogs),
        updated_at: new Date().toISOString(),
        updated_by: user.id
      })
  } catch (err) {
    console.error('Failed to log mod action:', err)
  }
}
