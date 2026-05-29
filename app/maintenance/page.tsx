import Link from 'next/link'
import { Shield, Settings, AlertTriangle } from 'lucide-react'

export const metadata = {
  title: 'Bakım Modu — HAVN',
  description: 'HAVN şu anda bakım modundadır.',
}

export default function MaintenancePage() {
  return (
    <div className="min-h-screen w-full bg-[#0a0516] flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Decorative Glow Elements */}
      <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDelay: '2s' }} />

      {/* Main Card */}
      <div className="w-full max-w-md bg-card/20 border border-white/5 backdrop-blur-xl rounded-3xl p-8 flex flex-col items-center text-center shadow-2xl relative z-10">
        
        {/* Animated Icon Container */}
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-lg animate-ping opacity-75" />
          <div className="relative p-4 bg-primary/10 border border-primary/20 text-primary rounded-2xl">
            <Settings className="w-10 h-10 animate-spin" style={{ animationDuration: '6s' }} />
          </div>
        </div>

        {/* Tag */}
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 border border-rose-500/20 text-rose-400 mb-4">
          <AlertTriangle size={12} className="text-rose-400" />
          Sistem Bakımda
        </span>

        {/* Headings */}
        <h1 className="text-2xl font-black text-white tracking-tight mb-2">
          Geri Döneceğiz!
        </h1>
        <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
          HAVN şu anda yeni özellikler ve sistem güncellemeleri nedeniyle kısa süreliğine bakım modundadır. 
          En kısa sürede daha güçlü ve hızlı bir şekilde geri döneceğiz.
        </p>

        {/* Details Divider */}
        <div className="w-full h-px bg-white/5 my-6" />

        {/* Secondary Info */}
        <div className="text-[10px] text-muted-foreground/60 leading-normal">
          <p>Anlayışınız için teşekkür ederiz.</p>
          <p className="mt-1 font-semibold text-primary/80">HAVN Ekibi</p>
        </div>

      </div>

      {/* Auth Entry for Founders/Admins */}
      <div className="mt-6 text-center relative z-10">
        <Link 
          href="/login" 
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors duration-200"
        >
          <Shield size={12} />
          <span>Yetkili Girişi</span>
        </Link>
      </div>
    </div>
  )
}
