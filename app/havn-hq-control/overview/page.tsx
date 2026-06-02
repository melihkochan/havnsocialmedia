import { getHQOverviewStats, getHourlyActivity, getHQUsers } from '@/lib/actions/hq-admin'
import { requireHQAccess } from '@/lib/actions/hq-auth'
import { getHQModLogs } from '@/lib/actions/hq-chat'
import { getSupportTickets } from '@/lib/actions/support'
import HQOverviewClient from './HQOverviewClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Genel Durum — HAVN HQ' }

export default async function HQOverviewPage() {
  const profile = await requireHQAccess()
  const currentUserRole = profile?.role ?? 'member'

  const [stats, hourlyData, logs, tickets, usersResult] = await Promise.all([
    getHQOverviewStats(),
    getHourlyActivity(),
    getHQModLogs(),
    getSupportTickets(),
    getHQUsers({ search: '', role: '', page: 0, pageSize: 5 }),
  ])

  return (
    <HQOverviewClient
      initialStats={stats as any}
      initialHourlyData={hourlyData}
      initialLogs={logs}
      initialTickets={tickets as any}
      initialUsersResult={usersResult as any}
      currentUserRole={currentUserRole}
    />
  )
}
