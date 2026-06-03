import { requireHQAccess } from '@/lib/actions/hq-auth'
import { getBannedWords } from '@/lib/actions/hq-nsfw'
import { HQContentFilterClient } from '@/components/havn/hq/HQContentFilterClient'
import { ShieldAlert, AlertTriangle } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'İçerik Filtresi — HAVN HQ' }

export default async function HQContentFilterPage() {
  // Ensure administrator/founder access
  await requireHQAccess()

  // Retrieve banned words from service client
  const { data: words } = await getBannedWords()

  return (
    <div className="w-full p-8 space-y-8 select-none">
      {/* Header */}
      <div className="flex flex-col gap-1.5 pb-4 border-b border-border/60">
        <div className="flex items-center gap-2 text-primary">
          <ShieldAlert className="w-5 h-5" />
          <span className="text-xs font-black uppercase tracking-wider">Kontrol Merkezi</span>
        </div>
        <h1 className="text-2xl font-black text-foreground tracking-tight">İçerik Filtresi</h1>
        <p className="text-xs text-muted-foreground">
          Platform genelinde paylaşılan içeriklerin denetlenmesi için yasaklı kelime listelerini yönetin.
        </p>
      </div>

      {/* Warning Notice */}
      <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider">Hassas İşlem Bölgesi</h4>
          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
            Buraya eklenen kelimeler anında platformdaki tüm post, yorum ve profil güncellemelerinde
            engellenir. Kelimeleri seçerken normal kullanımda yanlışlıkla tetiklenmeyecek (over-blocking)
            şekilde seçmeye özen gösteriniz.
          </p>
        </div>
      </div>

      {/* Main filter dashboard */}
      <HQContentFilterClient initialWords={words} />
    </div>
  )
}
