import type { Metadata } from 'next'
import { HavnLogo } from '@/components/havn/HavnLogo'
import { Shield, Users, Zap } from 'lucide-react'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: 'Giriş — HAVN',
}

const features = [
  {
    icon: Shield,
    title: 'Güvenli Alan',
    desc: 'Her topluluk kendi kurallarıyla korunur',
    color: '#a5f3fc',
  },
  {
    icon: Users,
    title: 'Topluluk Odaklı',
    desc: 'Seni anlayan insanlarla bağlan',
    color: '#c4b5fd',
  },
  {
    icon: Zap,
    title: 'Anlık Etkileşim',
    desc: 'Gerçek zamanlı bildirimler ve yorumlar',
    color: '#fde68a',
  },
]

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-[1fr_1fr]">
      {/* ── Left branding panel ── */}
      <div
        className="hidden lg:flex flex-col justify-between p-14 relative overflow-hidden"
        style={{
          background:
            'linear-gradient(145deg, var(--havn-gradient-start) 0%, var(--havn-gradient-end) 55%, color-mix(in oklch, var(--havn-gradient-end) 60%, #0d0d1a) 100%)',
        }}
      >
        {/* Layered background blobs */}
        <div
          className="absolute -top-24 -right-24 w-[500px] h-[500px] rounded-full opacity-[0.15]"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        <div
          className="absolute -bottom-32 -left-20 w-[400px] h-[400px] rounded-full opacity-[0.10]"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />

        {/* Subtle dot grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
          }}
        />

        {/* Animated floating circles */}
        <div
          className="absolute top-1/3 right-12 w-24 h-24 rounded-full border border-white/10"
          style={{ animation: 'float 8s ease-in-out infinite' }}
        />
        <div
          className="absolute top-1/2 right-36 w-10 h-10 rounded-full border border-white/8"
          style={{ animation: 'float 12s ease-in-out infinite reverse' }}
        />

        {/* Logo — large */}
        <div className="relative">
          <HavnLogo
            className="[&_.gradient-text]:text-white [&_.gradient-text]:[background:none] [&_.gradient-text]:[-webkit-text-fill-color:white] scale-110 origin-left"
          />
          <p className="text-white/50 text-xs mt-3 ml-0.5 font-medium tracking-wide">
            Topluluğunun güvenli limanı
          </p>
        </div>

        {/* Tagline + feature cards */}
        <div className="relative space-y-8">
          <div>
            <h2 className="text-[2.5rem] font-black text-white leading-[1.1] tracking-tight mb-3">
              Güvenli limanın<br />
              <span className="text-white/70">seni bekliyor.</span>
            </h2>
            <p className="text-white/55 text-base leading-relaxed max-w-xs">
              Topluluklarınla bağlan, fikirlerini paylaş, anlayan insanlarla tanış.
            </p>
          </div>

          <div className="space-y-3">
            {features.map(({ icon: Icon, title, desc, color }, i) => (
              <div
                key={title}
                className="flex items-center gap-4 p-4 rounded-2xl backdrop-blur-sm border border-white/10 transition-all duration-300 hover:border-white/20 hover:bg-white/5 cursor-default"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  animationDelay: `${i * 100}ms`,
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border border-white/20"
                  style={{ background: `${color}18` }}
                >
                  <Icon size={18} style={{ color }} />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">{title}</p>
                  <p className="text-white/50 text-xs mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-white/30 text-xs tracking-wide">
          © 2026 HAVN · Tüm hakları saklıdır.
        </p>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex items-center justify-center p-6 sm:p-12 bg-background relative">
        {/* Subtle top gradient */}
        <div
          className="absolute top-0 inset-x-0 h-px"
          style={{
            background: 'linear-gradient(90deg, transparent, color-mix(in oklch, var(--primary) 30%, transparent), transparent)',
          }}
        />

        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-10">
            <HavnLogo />
          </div>
          <Suspense fallback={null}>
            {children}
          </Suspense>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(8deg); }
        }
      ` }} />
    </div>
  )
}
