import { getCountryDistribution } from '@/lib/actions/hq-admin'
import { requireHQAccess } from '@/lib/actions/hq-auth'
import { HQMap } from '@/components/havn/hq/HQMap'
import { MapPin } from 'lucide-react'

export default async function HQMapPage() {
  // Ensure access
  await requireHQAccess()

  // Fetch geographic distribution data
  const stats = await getCountryDistribution()

  return (
    <div className="max-w-7xl mx-auto w-full p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-1.5 pb-4 border-b border-border/60">
        <div className="flex items-center gap-2 text-primary">
          <MapPin className="w-5 h-5" />
          <span className="text-xs font-black uppercase tracking-wider">Kontrol Merkezi</span>
        </div>
        <h1 className="text-2xl font-black text-foreground tracking-tight">Katılım Haritası</h1>
        <p className="text-xs text-muted-foreground">
          Platform üyelerinin coğrafi dağılımını, bölgesel yoğunluğunu ve aktif ülke istatistiklerini takip edin.
        </p>
      </div>

      {/* Map Module Component */}
      <HQMap stats={stats} />
    </div>
  )
}
