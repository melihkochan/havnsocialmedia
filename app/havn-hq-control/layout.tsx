import { requireHQAccess } from '@/lib/actions/hq-auth'
import { HQSidebar } from '@/components/havn/hq/HQSidebar'

export default async function HQLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireHQAccess()

  return (
    <div
      className="dark flex h-screen overflow-hidden bg-[#080810] text-slate-100"
      style={{ fontFamily: 'var(--font-inter, system-ui, sans-serif)' }}
    >
      {/* Sidebar */}
      <HQSidebar currentUser={profile} />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-[#080810]/50">
        {children}
      </main>
    </div>
  )
}
