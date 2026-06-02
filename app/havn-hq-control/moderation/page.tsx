import { requireHQAccess } from '@/lib/actions/hq-auth'
import { getSupportTickets } from '@/lib/actions/support'
import { getHQModLogs } from '@/lib/actions/hq-chat'
import HQModerationClient from './HQModerationClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Moderasyon & Raporlar — HAVN HQ' }

export default async function HQModerationPage() {
  const profile = await requireHQAccess()
  const currentUserRole = profile?.role ?? 'member'

  const [tickets, modLogs] = await Promise.all([
    getSupportTickets(),
    getHQModLogs()
  ])

  return (
    <HQModerationClient
      initialTickets={tickets as any}
      initialLogs={modLogs}
      currentUserRole={currentUserRole}
    />
  )
}
