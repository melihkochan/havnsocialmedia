import type { Metadata } from 'next'
import { HavnLogo } from '@/components/havn/HavnLogo'
import { Shield, Users, Zap } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Giriş — HAVN',
}

const features = [
  { icon: Shield, title: 'Güvenli Alan', desc: 'Her topluluk kendi kurallarıyla korunur' },
  { icon: Users, title: 'Topluluk Odaklı', desc: 'Seni anlayan insanlarla bağlan' },
  { icon: Zap, title: 'Anlık Etkileşim', desc: 'Gerçek zamanlı bildirimler ve yorumlar' },
]

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* ── Left branding panel ── */}
      <div
        className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden"
        style={{
          background:
            'linear-gradient(145deg, var(--havn-gradient-start) 0%, var(--havn-gradient-end) 60%, color-mix(in oklch, var(--havn-gradient-end) 50%, var(--background)) 100%)',
        }}
      >
        {/* Decorative orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-20 bg-white" />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full blur-3xl opacity-10 bg-white" />
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, white 1px, transparent 1px),
              radial-gradient(circle at 75% 75%, white 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />

        {/* Logo */}
        <div className="relative">
          <HavnLogo className="[&_.gradient-text]:text-white [&_.gradient-text]:[background:none] [&_.gradient-text]:[-webkit-text-fill-color:white]" />
        </div>

        {/* Tagline + features */}
        <div className="relative space-y-8">
          <div>
            <h2 className="text-4xl font-black text-white leading-tight mb-3">
              Güvenli limanın<br />seni bekliyor.
            </h2>
            <p className="text-white/70 text-lg leading-relaxed">
              Topluluklarınla bağlan, fikirlerini paylaş, anlayan insanlarla tanış.
            </p>
          </div>

          <div className="space-y-4">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center flex-shrink-0">
                  <Icon size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{title}</p>
                  <p className="text-white/60 text-xs mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-white/40 text-xs">
          © 2026 HAVN · Tüm hakları saklıdır.
        </p>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <HavnLogo />
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
