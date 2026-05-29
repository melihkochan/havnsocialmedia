import { requireHQAccess } from '@/lib/actions/hq-auth'
import { HQSystemSettings } from '@/components/havn/hq/HQSystemSettings'
import { Settings, ShieldCheck } from 'lucide-react'

export default async function HQSettingsPage() {
  // Ensure access
  await requireHQAccess()

  return (
    <div className="w-full p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-1.5 pb-4 border-b border-border/60">
        <div className="flex items-center gap-2 text-primary">
          <Settings className="w-5 h-5" />
          <span className="text-xs font-black uppercase tracking-wider">Kontrol Merkezi</span>
        </div>
        <h1 className="text-2xl font-black text-foreground tracking-tight">Sistem Ayarları</h1>
        <p className="text-xs text-muted-foreground">
          Platform çapındaki özellikleri yönetin, bakım modunu aktifleştirin veya yeni kayıtları düzenleyin.
        </p>
      </div>

      {/* Security notice */}
      <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-bold text-blue-500 uppercase tracking-wider">Yönetici Yetkilendirmesi</h4>
          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
            Bu ekrandaki değişiklikler platform genelindeki tüm kullanıcıları etkiler. Yapılan tüm ayar
            değişiklikleri sistem günlüklerine kaydedilir ve geriye dönük olarak denetlenebilir.
          </p>
        </div>
      </div>

      {/* System Settings Form */}
      <HQSystemSettings />
    </div>
  )
}
