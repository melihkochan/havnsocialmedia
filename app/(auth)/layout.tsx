import type { Metadata } from 'next'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: 'Giriş — HAVN',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-[1fr_1fr]">
      {/* ── Left branding panel ── */}
      <div
        className="hidden lg:flex flex-col items-center justify-center relative overflow-hidden"
        style={{
          background: 'radial-gradient(ellipse at 60% 40%, #1a0a2e 0%, #0d0014 40%, #000008 100%)',
        }}
      >
        {/* Ambient glow radials */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 90% 70% at 50% 50%, rgba(110,55,220,0.28) 0%, rgba(70,30,160,0.12) 50%, transparent 75%)',
          }}
        />
        {/* Big bloom behind rings — the "dalga" glow */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full havn-bloom"
          style={{
            background: 'radial-gradient(circle, rgba(130,70,255,0.22) 0%, rgba(100,40,200,0.10) 45%, transparent 70%)',
            filter: 'blur(8px)',
          }}
        />
        <div
          className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(120,60,255,0.16) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-[400px] h-[400px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(80,100,255,0.14) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />

        {/* CSS star field — no JS/hydration issues */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none havn-stars" />

        {/* Center content */}
        <div className="relative z-10 flex flex-col items-center select-none">
          {/* Pulsing rings around the logo — Twitter X style */}
          <div className="relative flex items-center justify-center mb-10">
            {/* Ring 5 — outermost faint */}
            <div
              className="absolute rounded-full border havn-ring"
              style={{
                width: '420px',
                height: '420px',
                borderWidth: '1px',
                borderColor: 'rgba(150,90,255,0.12)',
                animationDelay: '1.2s',
              }}
            />
            {/* Ring 4 */}
            <div
              className="absolute rounded-full border havn-ring"
              style={{
                width: '340px',
                height: '340px',
                borderWidth: '1px',
                borderColor: 'rgba(150,90,255,0.22)',
                animationDelay: '0.9s',
              }}
            />
            {/* Ring 3 */}
            <div
              className="absolute rounded-full border havn-ring"
              style={{
                width: '265px',
                height: '265px',
                borderWidth: '1.5px',
                borderColor: 'rgba(160,100,255,0.38)',
                animationDelay: '0.6s',
              }}
            />
            {/* Ring 2 */}
            <div
              className="absolute rounded-full border havn-ring"
              style={{
                width: '198px',
                height: '198px',
                borderWidth: '1.5px',
                borderColor: 'rgba(170,110,255,0.52)',
                animationDelay: '0.3s',
              }}
            />
            {/* Ring 1 — closest, brightest */}
            <div
              className="absolute rounded-full border havn-ring"
              style={{
                width: '138px',
                height: '138px',
                borderWidth: '2px',
                borderColor: 'rgba(190,130,255,0.70)',
                animationDelay: '0s',
              }}
            />

            {/* The H icon */}
            <div
              className="relative w-24 h-24 rounded-3xl flex items-center justify-center havn-icon-glow"
              style={{
                background:
                  'linear-gradient(145deg, rgba(120,60,255,0.9) 0%, rgba(80,30,200,0.95) 100%)',
              }}
            >
              <svg
                width="52"
                height="52"
                viewBox="0 0 52 52"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect x="5" y="4" width="11" height="44" rx="4" fill="white" fillOpacity="0.97" />
                <rect x="36" y="4" width="11" height="44" rx="4" fill="white" fillOpacity="0.97" />
                <rect x="16" y="21" width="20" height="10" rx="3" fill="white" fillOpacity="0.97" />
              </svg>
              {/* Inner specular highlight */}
              <div
                className="absolute inset-0 rounded-3xl"
                style={{
                  background:
                    'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.18) 0%, transparent 60%)',
                }}
              />
            </div>
          </div>

          {/* HAVN wordmark */}
          <div className="text-center">
            <p
              className="font-black tracking-[0.3em] leading-none"
              style={{
                fontSize: '3rem',
                color: 'white',
                textShadow:
                  '0 0 30px rgba(150,100,255,0.6), 0 0 60px rgba(120,60,255,0.3)',
              }}
            >
              HAVN
            </p>
            {/* Tagline */}
            <p
              className="mt-3 text-[13px] font-medium tracking-[0.18em]"
              style={{ color: 'rgba(190,155,255,0.65)' }}
            >
              your safe harbour
            </p>
          </div>
        </div>

        {/* Bottom copyright */}
        <div
          className="absolute bottom-8 left-0 right-0 text-center"
          style={{
            color: 'rgba(255,255,255,0.18)',
            fontSize: '11px',
            letterSpacing: '0.12em',
          }}
        >
          © 2026 HAVN · Topluluğunun güvenli limanı
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex items-center justify-center p-6 sm:p-12 bg-background relative">
        <div
          className="absolute top-0 inset-x-0 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent, color-mix(in oklch, var(--primary) 30%, transparent), transparent)',
          }}
        />

        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-10">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{
                  background:
                    'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))',
                  boxShadow: '0 0 20px color-mix(in oklch, var(--primary) 40%, transparent)',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 52 52" fill="none">
                  <rect x="5" y="4" width="11" height="44" rx="4" fill="white" fillOpacity="0.97" />
                  <rect x="36" y="4" width="11" height="44" rx="4" fill="white" fillOpacity="0.97" />
                  <rect x="16" y="21" width="20" height="10" rx="3" fill="white" fillOpacity="0.97" />
                </svg>
              </div>
              <span className="text-xl font-black tracking-[0.2em] gradient-text">HAVN</span>
            </div>
          </div>
          <Suspense fallback={null}>
            {children}
          </Suspense>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        /* Pulsing rings */
        @keyframes havnRingPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.38; transform: scale(1.06); }
        }
        .havn-ring {
          animation: havnRingPulse 3.6s ease-in-out infinite;
        }

        /* Background bloom pulse */
        @keyframes havnBloom {
          0%, 100% { opacity: 0.7; transform: translate(-50%, -50%) scale(1); }
          50%       { opacity: 1;   transform: translate(-50%, -50%) scale(1.12); }
        }
        .havn-bloom {
          animation: havnBloom 4s ease-in-out infinite;
        }

        /* Icon glow breathe */
        @keyframes havnIconGlow {
          0%, 100% {
            box-shadow:
              0 0 0 1px rgba(150,100,255,0.28),
              0 0 40px rgba(120,60,255,0.65),
              0 0 80px rgba(100,40,220,0.42),
              0 0 140px rgba(80,20,180,0.22),
              inset 0 1px 0 rgba(255,255,255,0.14);
          }
          50% {
            box-shadow:
              0 0 0 1px rgba(150,100,255,0.45),
              0 0 55px rgba(120,60,255,0.9),
              0 0 110px rgba(100,40,220,0.58),
              0 0 180px rgba(80,20,180,0.33),
              inset 0 1px 0 rgba(255,255,255,0.2);
          }
        }
        .havn-icon-glow {
          animation: havnIconGlow 4s ease-in-out infinite;
        }

        /* CSS-only star field using box-shadow */
        @keyframes havnStarTwinkle {
          0%, 100% { opacity: 0.08; }
          50%       { opacity: 0.55; }
        }

        /* Generate pseudo-random stars via multiple box-shadows on a 1×1 element */
        .havn-stars::before {
          content: '';
          position: absolute;
          width: 2px;
          height: 2px;
          border-radius: 50%;
          background: transparent;
          box-shadow:
            /* Row 1 */
            80px 120px rgba(255,255,255,0.25),
            210px 65px rgba(255,255,255,0.18),
            350px 200px rgba(255,255,255,0.30),
            480px 95px rgba(255,255,255,0.15),
            560px 310px rgba(255,255,255,0.22),
            650px 145px rgba(255,255,255,0.28),
            730px 380px rgba(255,255,255,0.12),
            /* Row 2 */
            40px 290px rgba(255,255,255,0.20),
            130px 440px rgba(255,255,255,0.15),
            260px 375px rgba(255,255,255,0.28),
            390px 480px rgba(255,255,255,0.22),
            520px 540px rgba(255,255,255,0.18),
            680px 490px rgba(255,255,255,0.25),
            /* Row 3 */
            90px 600px rgba(255,255,255,0.12),
            200px 660px rgba(255,255,255,0.20),
            340px 720px rgba(255,255,255,0.15),
            450px 680px rgba(255,255,255,0.28),
            600px 760px rgba(255,255,255,0.18),
            /* Row 4 */
            60px 800px rgba(255,255,255,0.22),
            180px 850px rgba(255,255,255,0.15),
            320px 920px rgba(255,255,255,0.20),
            500px 870px rgba(255,255,255,0.12),
            660px 940px rgba(255,255,255,0.25),
            /* Scattered extras */
            110px 190px rgba(255,255,255,0.18),
            310px 50px rgba(255,255,255,0.12),
            700px 240px rgba(255,255,255,0.20),
            420px 160px rgba(255,255,255,0.15),
            570px 410px rgba(255,255,255,0.22),
            150px 530px rgba(255,255,255,0.18),
            450px 300px rgba(255,255,255,0.12);
          animation: havnStarTwinkle 6s ease-in-out infinite;
        }

        .havn-stars::after {
          content: '';
          position: absolute;
          width: 1px;
          height: 1px;
          border-radius: 50%;
          background: transparent;
          box-shadow:
            170px 80px rgba(255,255,255,0.20),
            290px 140px rgba(255,255,255,0.28),
            440px 260px rgba(255,255,255,0.15),
            595px 60px rgba(255,255,255,0.22),
            720px 310px rgba(255,255,255,0.18),
            30px 370px rgba(255,255,255,0.25),
            240px 500px rgba(255,255,255,0.12),
            480px 620px rgba(255,255,255,0.20),
            630px 580px rgba(255,255,255,0.15),
            100px 700px rgba(255,255,255,0.22),
            370px 790px rgba(255,255,255,0.18),
            550px 700px rgba(255,255,255,0.28),
            700px 820px rgba(255,255,255,0.12),
            220px 880px rgba(255,255,255,0.20),
            415px 950px rgba(255,255,255,0.15),
            680px 170px rgba(255,255,255,0.22),
            340px 340px rgba(255,255,255,0.18),
            75px 470px rgba(255,255,255,0.12),
            510px 440px rgba(255,255,255,0.20);
          animation: havnStarTwinkle 8s ease-in-out infinite;
          animation-delay: 3s;
        }
      ` }} />
    </div>
  )
}
